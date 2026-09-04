-- ==========================================================
-- MULTIPLAYER GAME PLATFORM SCHEMA & REALTIME SETUP
-- Supports Word Chain & Vote & Reveal (Would You Rather)
-- ==========================================================

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE NOT NULL,
  game_type text NOT NULL DEFAULT 'word_chain',
  category text NOT NULL DEFAULT 'cities',
  status text NOT NULL DEFAULT 'lobby',
  turn_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_turn_index int NOT NULL DEFAULT 0,
  used_words jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_letter text,
  turn_deadline timestamptz,
  game_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- If game_config column doesn't exist yet on existing table, add it
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_config jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  is_eliminated boolean DEFAULT false,
  score int NOT NULL DEFAULT 0,
  joined_at timestamptz DEFAULT now()
);

-- If score column doesn't exist yet on existing table, add it (used by the
-- 'trivia' engine / "20-Second Challenge" game type)
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS score int NOT NULL DEFAULT 0;

-- Persistent "Game Night" leaderboard total, separate from trivia's per-round
-- `score` column above. Carries across "Play Again" and game-type switches
-- within the same room/session - only reset_game's trivia roll-up (into this
-- column) and word_chain's win-scoring (see submit_word/handle_timeout) ever
-- write to it; nothing zeroes it on replay.
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS total_score int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS game_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine text NOT NULL,          -- 'vote_reveal' | 'most_likely' | 'trivia' | 'higher_lower' | 'deduction' (future)
  category text NOT NULL,        -- 'general' | 'boys' | 'church' | 'couples' | 'football' | 'bible' etc.
  prompt_text text NOT NULL,
  options jsonb,                 -- e.g. ["Option A", "Option B"] for fixed-choice prompts; null if options = player names
  correct_answer text,           -- 'trivia' engine only: which options[] entry is correct; null for vote_reveal/most_likely
  created_at timestamptz DEFAULT now()
);

-- If correct_answer column doesn't exist yet on existing table, add it
-- (used by the trivia engine seeded via scripts/seed-trivia.ts)
ALTER TABLE game_prompts ADD COLUMN IF NOT EXISTS correct_answer text;

-- 'higher_lower' engine only: the actual number to compare (e.g. a
-- population figure or a player's international cap count). options stays
-- null for this engine - the comparison is against numeric_value, not a
-- fixed-choice list.
ALTER TABLE game_prompts ADD COLUMN IF NOT EXISTS numeric_value int;

-- Dedupe target for scripts/seed-trivia.ts, which upserts with
-- ON CONFLICT (prompt_text) DO NOTHING so repeat runs never insert the same
-- question twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_prompts_prompt_text_unique ON game_prompts (prompt_text);

CREATE TABLE IF NOT EXISTS game_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES game_players(id) ON DELETE CASCADE,
  round_number int NOT NULL DEFAULT 1,
  choice text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, player_id, round_number)
);

-- Per-round answers for the 'trivia' engine / "20-Second Challenge" game type
CREATE TABLE IF NOT EXISTS game_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES game_players(id) ON DELETE CASCADE,
  round_number int NOT NULL DEFAULT 1,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(session_id, player_id, round_number)
);

-- 2. Indexes for high performance lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_code ON game_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_game_players_session_id ON game_players(session_id);
CREATE INDEX IF NOT EXISTS idx_game_prompts_engine_cat ON game_prompts(engine, category);
CREATE INDEX IF NOT EXISTS idx_game_votes_session_round ON game_votes(session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_game_answers_session_round ON game_answers(session_id, round_number);

-- 3. Enable Realtime Replication
-- ALTER PUBLICATION ... ADD TABLE errors if the table is already a member, so
-- this schema (which is re-run on every deploy) guards each one with a check
-- against pg_publication_tables instead of adding it unconditionally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_votes;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_answers;
  END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous access (No Auth requirement: players join via room code)
DROP POLICY IF EXISTS "Public sessions access" ON game_sessions;
CREATE POLICY "Public sessions access" ON game_sessions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public players access" ON game_players;
CREATE POLICY "Public players access" ON game_players
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public prompts access" ON game_prompts;
CREATE POLICY "Public prompts access" ON game_prompts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public votes access" ON game_votes;
CREATE POLICY "Public votes access" ON game_votes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public answers access" ON game_answers;
CREATE POLICY "Public answers access" ON game_answers
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- ==========================================================
-- SEED DATA: GAME PROMPTS (Vote & Reveal / Would You Rather)
-- ==========================================================

INSERT INTO game_prompts (id, engine, category, prompt_text, options) VALUES
  ('11111111-0001-4000-8000-000000000001', 'vote_reveal', 'general', 'Would you rather always be 10 minutes late or always be 20 minutes early?', '["Always 10 minutes late", "Always 20 minutes early"]'::jsonb),
  ('11111111-0001-4000-8000-000000000002', 'vote_reveal', 'general', 'Would you rather be able to fly at 10 mph or teleport to a random location once a week?', '["Fly at 10 mph", "Teleport randomly once a week"]'::jsonb),
  ('11111111-0001-4000-8000-000000000003', 'vote_reveal', 'general', 'Would you rather have unlimited free food anywhere or unlimited free first-class flights?', '["Unlimited free food", "Unlimited free first-class flights"]'::jsonb),
  ('11111111-0001-4000-8000-000000000004', 'vote_reveal', 'general', 'Would you rather explore the deepest depths of the ocean or travel to outer space?', '["Explore deep ocean", "Travel to outer space"]'::jsonb),
  ('11111111-0001-4000-8000-000000000005', 'vote_reveal', 'general', 'Would you rather have all your thoughts broadcast out loud or never speak again?', '["Thoughts broadcast out loud", "Never speak again"]'::jsonb),
  ('11111111-0001-4000-8000-000000000006', 'vote_reveal', 'general', 'Would you rather live in a world without music or a world without movies and TV?', '["World without music", "World without movies/TV"]'::jsonb),
  ('11111111-0001-4000-8000-000000000007', 'vote_reveal', 'general', 'Would you rather always have cold coffee or always have lukewarm soda?', '["Always cold coffee", "Always lukewarm soda"]'::jsonb),
  ('11111111-0001-4000-8000-000000000008', 'vote_reveal', 'general', 'Would you rather possess superhuman strength or superhuman speed?', '["Super strength", "Super speed"]'::jsonb),
  ('11111111-0001-4000-8000-000000000009', 'vote_reveal', 'general', 'Would you rather know the exact date of your death or the exact cause?', '["Exact date", "Exact cause"]'::jsonb),

  ('11111111-0002-4000-8000-000000000001', 'vote_reveal', 'couples', 'Would you rather share all passwords and browser histories or never check each other''s phones?', '["Share all passwords", "Never check phones"]'::jsonb),
  ('11111111-0002-4000-8000-000000000002', 'vote_reveal', 'couples', 'Would you rather go on an ultra-luxury resort vacation or an exciting adventure road trip?', '["Luxury resort vacation", "Adventure road trip"]'::jsonb),
  ('11111111-0002-4000-8000-000000000003', 'vote_reveal', 'couples', 'Would you rather cook an elaborate dinner together every night or get free gourmet takeout every night?', '["Cook dinner together", "Free gourmet takeout"]'::jsonb),
  ('11111111-0002-4000-8000-000000000004', 'vote_reveal', 'couples', 'Would you rather always share the exact same sleep schedule or always crave the exact same foods?', '["Same sleep schedule", "Same food cravings"]'::jsonb),
  ('11111111-0002-4000-8000-000000000005', 'vote_reveal', 'couples', 'Would you rather move into a stylish penthouse in a bustling city or a peaceful countryside farmhouse?', '["Bustling city penthouse", "Countryside farmhouse"]'::jsonb),
  ('11111111-0002-4000-8000-000000000006', 'vote_reveal', 'couples', 'Would you rather have your partner pick all your outfits for a month or pick all your meals for a month?', '["Partner picks outfits", "Partner picks meals"]'::jsonb),
  ('11111111-0002-4000-8000-000000000007', 'vote_reveal', 'couples', 'Would you rather binge a 10-season TV show together in one weekend or watch a new movie every night for a month?', '["Binge 10-season show", "Movie every night"]'::jsonb),

  ('11111111-0003-4000-8000-000000000001', 'vote_reveal', 'majority_rules', 'Which is worse: being left on read or being replied to with just "😂"?', '["Left on read", "Replied with 😂"]'::jsonb),
  ('11111111-0003-4000-8000-000000000002', 'vote_reveal', 'majority_rules', 'Which is worse: forgetting someone''s name right after they told you, or forgetting your own PIN at checkout?', '["Forgetting a name", "Forgetting your PIN"]'::jsonb),
  ('11111111-0003-4000-8000-000000000003', 'vote_reveal', 'majority_rules', 'Which is more annoying: slow wifi or a phone stuck on 1% battery for 10 minutes?', '["Slow wifi", "Stuck at 1% battery"]'::jsonb),
  ('11111111-0003-4000-8000-000000000004', 'vote_reveal', 'majority_rules', 'Which is worse: loud chewing or someone tapping their pen the whole meeting?', '["Loud chewing", "Pen tapping"]'::jsonb),
  ('11111111-0003-4000-8000-000000000005', 'vote_reveal', 'majority_rules', 'Which is a bigger red flag: replying "k" to everything or double-texting constantly?', '["Replying just \"k\"", "Double-texting"]'::jsonb),

  ('11111111-0004-4000-8000-000000000001', 'vote_reveal', 'boys_debate', 'Is a PS5 worth buying if you already have a working PS4?', '["Yes", "No"]'::jsonb),
  ('11111111-0004-4000-8000-000000000002', 'vote_reveal', 'boys_debate', 'Is watching football with your boys better than going on a date that same night?', '["Yes", "No"]'::jsonb),
  ('11111111-0004-4000-8000-000000000003', 'vote_reveal', 'boys_debate', 'Is it acceptable to leave a friend''s house without saying goodbye to everyone?', '["Yes", "No"]'::jsonb),
  ('11111111-0004-4000-8000-000000000004', 'vote_reveal', 'boys_debate', 'Messi or Ronaldo — is this debate actually over by now?', '["Messi", "Ronaldo"]'::jsonb),
  ('11111111-0004-4000-8000-000000000005', 'vote_reveal', 'boys_debate', 'Is it okay to check your phone while someone is telling you a story in person?', '["Yes", "No"]'::jsonb),

  ('11111111-0005-4000-8000-000000000001', 'most_likely', 'general', 'Who''s most likely to become famous one day?', null),
  ('11111111-0005-4000-8000-000000000002', 'most_likely', 'general', 'Who''s most likely to sleep through an important meeting or event?', null),
  ('11111111-0005-4000-8000-000000000003', 'most_likely', 'general', 'Who''s most likely to disappear from the group chat for months and reappear like nothing happened?', null),
  ('11111111-0005-4000-8000-000000000004', 'most_likely', 'general', 'Who''s most likely to win an argument just by being stubborn, not by being right?', null),
  ('11111111-0005-4000-8000-000000000005', 'most_likely', 'general', 'Who''s most likely to still be awake at 3am for no real reason?', null)
ON CONFLICT (id) DO NOTHING;


-- ==========================================================
-- SEED DATA: GAME PROMPTS (Higher or Lower)
-- ==========================================================
-- Round, easily-verifiable numbers rather than obscure trivia - the fun is
-- the guess itself, not stumping people. options stays null throughout;
-- numeric_value is the only thing compared.

INSERT INTO game_prompts (id, engine, category, prompt_text, options, numeric_value) VALUES
  ('11111111-0006-4000-8000-000000000001', 'higher_lower', 'population', 'Tokyo, Japan''s population', null, 14000000),
  ('11111111-0006-4000-8000-000000000002', 'higher_lower', 'population', 'Lagos, Nigeria''s population', null, 15000000),
  ('11111111-0006-4000-8000-000000000003', 'higher_lower', 'population', 'Cairo, Egypt''s population', null, 10000000),
  ('11111111-0006-4000-8000-000000000004', 'higher_lower', 'population', 'Mumbai, India''s population', null, 12500000),
  ('11111111-0006-4000-8000-000000000005', 'higher_lower', 'population', 'London, United Kingdom''s population', null, 9000000),
  ('11111111-0006-4000-8000-000000000006', 'higher_lower', 'population', 'New York City, USA''s population', null, 8300000),
  ('11111111-0006-4000-8000-000000000007', 'higher_lower', 'population', 'Nairobi, Kenya''s population', null, 4400000),
  ('11111111-0006-4000-8000-000000000008', 'higher_lower', 'population', 'Paris, France''s population', null, 2100000),

  ('11111111-0007-4000-8000-000000000001', 'higher_lower', 'football_stats', 'Cristiano Ronaldo''s international caps', null, 215),
  ('11111111-0007-4000-8000-000000000002', 'higher_lower', 'football_stats', 'Lionel Messi''s international caps', null, 190),
  ('11111111-0007-4000-8000-000000000003', 'higher_lower', 'football_stats', 'Iker Casillas'' international caps', null, 167),
  ('11111111-0007-4000-8000-000000000004', 'higher_lower', 'football_stats', 'Xavi Hernandez''s international caps', null, 133),
  ('11111111-0007-4000-8000-000000000005', 'higher_lower', 'football_stats', 'Paolo Maldini''s international caps', null, 126),
  ('11111111-0007-4000-8000-000000000006', 'higher_lower', 'football_stats', 'Zinedine Zidane''s international caps', null, 108),
  ('11111111-0007-4000-8000-000000000007', 'higher_lower', 'football_stats', 'Ryan Giggs'' international caps', null, 64)
ON CONFLICT (id) DO NOTHING;


-- ==========================================================
-- POSTGRES RPC FUNCTIONS (Atomic Concurrency & Game Logic)
-- ==========================================================

-- Function: Start Game (Supports Word Chain & Vote Reveal)
CREATE OR REPLACE FUNCTION start_game(
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_player_ids jsonb;
  v_player_count int;
  v_deadline timestamptz;
  v_prompt game_prompts%ROWTYPE;
  v_options jsonb;
  v_new_config jsonb;
BEGIN
  -- Lock the session row for update
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Get active joined players shuffled
  SELECT jsonb_agg(id ORDER BY random()), count(*)
  INTO v_player_ids, v_player_count
  FROM game_players
  WHERE session_id = p_session_id AND is_eliminated = false;

  IF v_player_count < 1 THEN
    RAISE EXCEPTION 'Need at least 1 player to start';
  END IF;

  -- Ensure all players are marked not eliminated
  UPDATE game_players
  SET is_eliminated = false
  WHERE session_id = p_session_id;

  -- Handle game type specific start logic (vote_reveal & most_likely share the
  -- same vote/reveal round mechanics; the engine column keys the prompt pool)
  IF v_session.game_type IN ('vote_reveal', 'most_likely') THEN
    -- Pick a random prompt matching this session's engine and category
    SELECT * INTO v_prompt
    FROM game_prompts
    WHERE engine = v_session.game_type AND category = v_session.category
    ORDER BY random()
    LIMIT 1;

    -- Fallback to any prompt of this engine if category is empty
    IF v_prompt.id IS NULL THEN
      SELECT * INTO v_prompt
      FROM game_prompts
      WHERE engine = v_session.game_type
      ORDER BY random()
      LIMIT 1;
    END IF;

    -- A null options column means "vote for a player" (most_likely): build the
    -- option list from the session's active players instead of fixed text
    v_options := v_prompt.options;
    IF v_options IS NULL THEN
      SELECT jsonb_agg(jsonb_build_object('id', gp.id, 'display_name', gp.display_name))
      INTO v_options
      FROM game_players gp
      WHERE gp.session_id = p_session_id AND gp.is_eliminated = false;
    END IF;

    v_deadline := now() + interval '20 seconds';

    v_new_config := jsonb_build_object(
      'round_number', 1,
      'voting_phase', 'voting',
      'current_prompt', jsonb_build_object(
        'id', v_prompt.id,
        'prompt_text', v_prompt.prompt_text,
        'options', v_options,
        'category', v_prompt.category
      ),
      'used_prompt_ids', jsonb_build_array(v_prompt.id)
    );

    UPDATE game_sessions
    SET status = 'playing',
        turn_order = v_player_ids,
        current_turn_index = 0,
        turn_deadline = v_deadline,
        game_config = v_new_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'playing',
      'turn_deadline', v_deadline,
      'game_config', v_new_config
    );
  ELSIF v_session.game_type = 'trivia' THEN
    -- "20-Second Challenge": pick a random trivia prompt matching category
    SELECT * INTO v_prompt
    FROM game_prompts
    WHERE engine = 'trivia' AND category = v_session.category
    ORDER BY random()
    LIMIT 1;

    -- Fallback to any trivia prompt if category is empty
    IF v_prompt.id IS NULL THEN
      SELECT * INTO v_prompt
      FROM game_prompts
      WHERE engine = 'trivia'
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_prompt.id IS NULL THEN
      RAISE EXCEPTION 'No trivia prompts available - run scripts/seed-trivia.ts first';
    END IF;

    v_deadline := now() + interval '20 seconds';

    v_new_config := jsonb_build_object(
      'round_number', 1,
      'phase', 'answering',
      'current_prompt', jsonb_build_object(
        'id', v_prompt.id,
        'prompt_text', v_prompt.prompt_text,
        'options', v_prompt.options,
        'correct_answer', v_prompt.correct_answer,
        'category', v_prompt.category
      ),
      'used_prompt_ids', jsonb_build_array(v_prompt.id)
    );

    UPDATE game_sessions
    SET status = 'playing',
        turn_order = v_player_ids,
        current_turn_index = 0,
        turn_deadline = v_deadline,
        game_config = v_new_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'playing',
      'turn_deadline', v_deadline,
      'game_config', v_new_config
    );
  ELSIF v_session.game_type = 'higher_lower' THEN
    -- Higher or Lower: pick a random starting prompt matching category as the
    -- initial reference number, same turn-order/elimination shape as word
    -- chain but with a 20s timer (like trivia/vote_reveal) instead of 30s
    SELECT * INTO v_prompt
    FROM game_prompts
    WHERE engine = 'higher_lower' AND category = v_session.category
    ORDER BY random()
    LIMIT 1;

    -- Fallback to any higher_lower prompt if category is empty
    IF v_prompt.id IS NULL THEN
      SELECT * INTO v_prompt
      FROM game_prompts
      WHERE engine = 'higher_lower'
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_prompt.id IS NULL THEN
      RAISE EXCEPTION 'No higher_lower prompts available';
    END IF;

    v_deadline := now() + interval '20 seconds';

    v_new_config := jsonb_build_object(
      'current_prompt', jsonb_build_object(
        'id', v_prompt.id,
        'prompt_text', v_prompt.prompt_text,
        'numeric_value', v_prompt.numeric_value,
        'category', v_prompt.category
      ),
      'used_prompt_ids', jsonb_build_array(v_prompt.id)
    );

    UPDATE game_sessions
    SET status = 'playing',
        turn_order = v_player_ids,
        current_turn_index = 0,
        turn_deadline = v_deadline,
        game_config = v_new_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'playing',
      'turn_deadline', v_deadline,
      'game_config', v_new_config
    );
  ELSE
    -- Word chain game logic (30 seconds turn timer)
    v_deadline := now() + interval '30 seconds';

    UPDATE game_sessions
    SET status = 'playing',
        turn_order = v_player_ids,
        current_turn_index = 0,
        used_words = '[]'::jsonb,
        last_letter = NULL,
        turn_deadline = v_deadline,
        game_config = '{}'::jsonb
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'playing',
      'turn_order', v_player_ids,
      'turn_deadline', v_deadline
    );
  END IF;
END;
$$;


-- Function: Submit Word (Word Chain: Atomic validation, appending word, advancing turn)
CREATE OR REPLACE FUNCTION submit_word(
  p_session_id uuid,
  p_player_id uuid,
  p_word text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_player game_players%ROWTYPE;
  v_clean_word text;
  v_first_char text;
  v_last_char text;
  v_expected_player_id uuid;
  v_turn_order_len int;
  v_next_index int;
  v_next_player_id uuid;
  v_active_players_count int;
  v_new_used_words jsonb;
  v_word_entry jsonb;
  v_i int;
  v_candidate_id uuid;
  v_is_elim boolean;
  v_winner_rounds int;
BEGIN
  -- 1. Lock session row
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.status <> 'playing' THEN
    RAISE EXCEPTION 'Game is not currently active';
  END IF;

  -- 2. Verify submitting player exists and is part of session
  SELECT * INTO v_player
  FROM game_players
  WHERE id = p_player_id AND session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found in this session';
  END IF;

  IF v_player.is_eliminated THEN
    RAISE EXCEPTION 'Player is already eliminated';
  END IF;

  -- 3. Verify it is this player's turn
  v_turn_order_len := jsonb_array_length(v_session.turn_order);
  IF v_turn_order_len = 0 THEN
    RAISE EXCEPTION 'No turn order set';
  END IF;

  v_expected_player_id := (v_session.turn_order ->> v_session.current_turn_index)::uuid;
  IF v_expected_player_id <> p_player_id THEN
    RAISE EXCEPTION 'It is not your turn';
  END IF;

  -- 4. Clean and validate word formatting
  v_clean_word := lower(trim(p_word));
  IF length(v_clean_word) < 2 THEN
    RAISE EXCEPTION 'Word is too short';
  END IF;

  v_first_char := substring(v_clean_word from 1 for 1);
  -- Extract last alphabetic character
  v_last_char := substring(regexp_replace(v_clean_word, '[^a-z]', '', 'g') from '.$');
  IF v_last_char IS NULL OR length(v_last_char) = 0 THEN
    v_last_char := substring(v_clean_word from length(v_clean_word) for 1);
  END IF;

  -- 5. Validate starting letter if last_letter is set
  IF v_session.last_letter IS NOT NULL AND length(v_session.last_letter) > 0 THEN
    IF lower(v_session.last_letter) <> v_first_char THEN
      RAISE EXCEPTION 'Word must start with letter "%"', upper(v_session.last_letter);
    END IF;
  END IF;

  -- 6. Check if word has already been used
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_session.used_words) elem
    WHERE lower(elem #>> '{}') = v_clean_word
       OR lower(elem ->> 'word') = v_clean_word
  ) THEN
    RAISE EXCEPTION 'Word "%" has already been used in this game', v_clean_word;
  END IF;

  -- Build word entry
  v_word_entry := jsonb_build_object(
    'word', v_clean_word,
    'display_word', trim(p_word),
    'player_id', p_player_id,
    'player_name', v_player.display_name,
    'submitted_at', now()
  );

  v_new_used_words := v_session.used_words || jsonb_build_array(v_word_entry);

  -- 7. Count non-eliminated players
  SELECT count(*) INTO v_active_players_count
  FROM game_players
  WHERE session_id = p_session_id AND is_eliminated = false;

  -- If 1 or fewer players, check if finished
  IF v_active_players_count <= 1 AND v_turn_order_len > 1 THEN
    -- p_player_id is the sole remaining active player (v_active_players_count
    -- counts them), so they're the winner - award Game Night points: +3 for
    -- winning, +1 per round survived (words they personally landed this game,
    -- including this final one)
    SELECT count(*) INTO v_winner_rounds
    FROM jsonb_array_elements(v_new_used_words) elem
    WHERE (elem ->> 'player_id') = p_player_id::text;

    UPDATE game_players
    SET total_score = total_score + 3 + v_winner_rounds
    WHERE id = p_player_id;

    UPDATE game_sessions
    SET used_words = v_new_used_words,
        last_letter = v_last_char,
        status = 'finished'
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'finished',
      'last_letter', v_last_char
    );
  END IF;

  -- 8. Find next non-eliminated player index in turn_order
  v_next_index := v_session.current_turn_index;
  FOR v_i IN 1..v_turn_order_len LOOP
    v_next_index := (v_next_index + 1) % v_turn_order_len;
    v_candidate_id := (v_session.turn_order ->> v_next_index)::uuid;

    SELECT is_eliminated INTO v_is_elim
    FROM game_players
    WHERE id = v_candidate_id AND session_id = p_session_id;

    IF v_is_elim IS FALSE THEN
      EXIT;
    END IF;
  END LOOP;

  -- 9. Update game session with new word, new last_letter, next turn, new 30s deadline
  UPDATE game_sessions
  SET used_words = v_new_used_words,
      last_letter = v_last_char,
      current_turn_index = v_next_index,
      turn_deadline = now() + interval '30 seconds'
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'word', v_clean_word,
    'last_letter', v_last_char,
    'current_turn_index', v_next_index,
    'turn_deadline', now() + interval '30 seconds'
  );
END;
$$;


-- Function: Submit Guess (Higher or Lower Engine: atomic comparison,
-- elimination-on-wrong-guess, advancing turn - mirrors submit_word's turn
-- verification and elimination/finish handling, minus word validation)
CREATE OR REPLACE FUNCTION submit_guess(
  p_session_id uuid,
  p_player_id uuid,
  p_guess text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_player game_players%ROWTYPE;
  v_expected_player_id uuid;
  v_turn_order_len int;
  v_config jsonb;
  v_current_prompt jsonb;
  v_current_value int;
  v_used_ids jsonb;
  v_new_prompt game_prompts%ROWTYPE;
  v_is_correct boolean;
  v_guess_entry jsonb;
  v_new_history jsonb;
  v_active_players_count int;
  v_winner_id uuid;
  v_winner_rounds int;
  v_next_index int;
  v_i int;
  v_candidate_id uuid;
  v_is_elim boolean;
  v_deadline timestamptz;
BEGIN
  IF p_guess NOT IN ('higher', 'lower') THEN
    RAISE EXCEPTION 'Guess must be "higher" or "lower"';
  END IF;

  -- 1. Lock session row
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.status <> 'playing' THEN
    RAISE EXCEPTION 'Game is not currently active';
  END IF;

  -- 2. Verify submitting player exists and is part of session
  SELECT * INTO v_player
  FROM game_players
  WHERE id = p_player_id AND session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found in this session';
  END IF;

  IF v_player.is_eliminated THEN
    RAISE EXCEPTION 'Player is already eliminated';
  END IF;

  -- 3. Verify it is this player's turn
  v_turn_order_len := jsonb_array_length(v_session.turn_order);
  IF v_turn_order_len = 0 THEN
    RAISE EXCEPTION 'No turn order set';
  END IF;

  v_expected_player_id := (v_session.turn_order ->> v_session.current_turn_index)::uuid;
  IF v_expected_player_id <> p_player_id THEN
    RAISE EXCEPTION 'It is not your turn';
  END IF;

  -- 4. Read the current reference number being compared against
  v_config := v_session.game_config;
  v_current_prompt := v_config -> 'current_prompt';
  IF v_current_prompt IS NULL THEN
    RAISE EXCEPTION 'No active number for this round';
  END IF;
  v_current_value := (v_current_prompt ->> 'numeric_value')::int;

  -- 5. Pick a new random prompt from the same category, excluding every
  -- prompt already shown this game (current_prompt's own id is already in
  -- used_prompt_ids from when it became current, so this also guarantees
  -- "different from current")
  v_used_ids := COALESCE(v_config -> 'used_prompt_ids', '[]'::jsonb);

  SELECT * INTO v_new_prompt
  FROM game_prompts
  WHERE engine = 'higher_lower'
    AND category = v_session.category
    AND NOT (v_used_ids @> to_jsonb(id::text))
  ORDER BY random()
  LIMIT 1;

  -- If every prompt in category has been shown, cycle and allow any from category
  IF v_new_prompt.id IS NULL THEN
    SELECT * INTO v_new_prompt
    FROM game_prompts
    WHERE engine = 'higher_lower' AND category = v_session.category
    ORDER BY random()
    LIMIT 1;
  END IF;

  -- Fallback to any higher_lower prompt at all
  IF v_new_prompt.id IS NULL THEN
    SELECT * INTO v_new_prompt
    FROM game_prompts
    WHERE engine = 'higher_lower'
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF v_new_prompt.id IS NULL THEN
    RAISE EXCEPTION 'No higher_lower prompts available';
  END IF;

  -- 6. Determine correctness. An exact tie counts as neither "higher" nor
  -- "lower" (resolves as incorrect either way) rather than re-drawing, which
  -- would risk looping against a small/duplicate-valued prompt pool -
  -- vanishingly unlikely with the seeded data anyway.
  IF v_new_prompt.numeric_value > v_current_value THEN
    v_is_correct := (p_guess = 'higher');
  ELSIF v_new_prompt.numeric_value < v_current_value THEN
    v_is_correct := (p_guess = 'lower');
  ELSE
    v_is_correct := false;
  END IF;

  v_guess_entry := jsonb_build_object(
    'player_id', p_player_id,
    'player_name', v_player.display_name,
    'guess', p_guess,
    'correct', v_is_correct,
    'previous_prompt_text', v_current_prompt ->> 'prompt_text',
    'previous_value', v_current_value,
    'new_prompt_text', v_new_prompt.prompt_text,
    'new_value', v_new_prompt.numeric_value,
    'guessed_at', now()
  );

  v_new_history := COALESCE(v_config -> 'guess_history', '[]'::jsonb) || jsonb_build_array(v_guess_entry);
  v_used_ids := v_used_ids || to_jsonb(v_new_prompt.id::text);

  -- The new prompt becomes the reference for the next guess regardless of
  -- whether this one was right - the eliminated-and-game-continues case still
  -- needs the next player to see the freshly revealed number, not the stale one
  v_config := jsonb_build_object(
    'current_prompt', jsonb_build_object(
      'id', v_new_prompt.id,
      'prompt_text', v_new_prompt.prompt_text,
      'numeric_value', v_new_prompt.numeric_value,
      'category', v_new_prompt.category
    ),
    'last_guess', v_guess_entry,
    'guess_history', v_new_history,
    'used_prompt_ids', v_used_ids
  );

  IF NOT v_is_correct THEN
    -- Wrong guess: eliminate the player (same pattern as handle_timeout)
    UPDATE game_players SET is_eliminated = true WHERE id = p_player_id;

    SELECT count(*) INTO v_active_players_count
    FROM game_players
    WHERE session_id = p_session_id AND is_eliminated = false;

    IF v_active_players_count <= 1 AND v_turn_order_len > 1 THEN
      -- Award the sole remaining active player (if any) Game Night points:
      -- +3 for winning, +1 per round survived (correct guesses they
      -- personally landed this game)
      SELECT id INTO v_winner_id
      FROM game_players
      WHERE session_id = p_session_id AND is_eliminated = false
      LIMIT 1;

      IF v_winner_id IS NOT NULL THEN
        SELECT count(*) INTO v_winner_rounds
        FROM jsonb_array_elements(v_new_history) elem
        WHERE (elem ->> 'player_id') = v_winner_id::text AND (elem ->> 'correct')::boolean = true;

        UPDATE game_players
        SET total_score = total_score + 3 + v_winner_rounds
        WHERE id = v_winner_id;
      END IF;

      UPDATE game_sessions
      SET status = 'finished',
          turn_deadline = NULL,
          game_config = v_config
      WHERE id = p_session_id;

      RETURN jsonb_build_object(
        'success', true,
        'status', 'finished',
        'correct', false,
        'game_config', v_config
      );
    END IF;

    -- Game continues: advance turn to next active player
    v_next_index := v_session.current_turn_index;
    FOR v_i IN 1..v_turn_order_len LOOP
      v_next_index := (v_next_index + 1) % v_turn_order_len;
      v_candidate_id := (v_session.turn_order ->> v_next_index)::uuid;

      SELECT is_eliminated INTO v_is_elim
      FROM game_players
      WHERE id = v_candidate_id AND session_id = p_session_id;

      IF v_is_elim IS FALSE THEN
        EXIT;
      END IF;
    END LOOP;

    v_deadline := now() + interval '20 seconds';

    UPDATE game_sessions
    SET current_turn_index = v_next_index,
        turn_deadline = v_deadline,
        game_config = v_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'correct', false,
      'current_turn_index', v_next_index,
      'turn_deadline', v_deadline,
      'game_config', v_config
    );
  END IF;

  -- 7. Correct guess: nobody eliminated, advance turn to next active player
  v_next_index := v_session.current_turn_index;
  FOR v_i IN 1..v_turn_order_len LOOP
    v_next_index := (v_next_index + 1) % v_turn_order_len;
    v_candidate_id := (v_session.turn_order ->> v_next_index)::uuid;

    SELECT is_eliminated INTO v_is_elim
    FROM game_players
    WHERE id = v_candidate_id AND session_id = p_session_id;

    IF v_is_elim IS FALSE THEN
      EXIT;
    END IF;
  END LOOP;

  v_deadline := now() + interval '20 seconds';

  UPDATE game_sessions
  SET current_turn_index = v_next_index,
      turn_deadline = v_deadline,
      game_config = v_config
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'correct', true,
    'current_turn_index', v_next_index,
    'turn_deadline', v_deadline,
    'game_config', v_config
  );
END;
$$;


-- Function: Submit Vote (Vote & Reveal Engine)
CREATE OR REPLACE FUNCTION submit_vote(
  p_session_id uuid,
  p_player_id uuid,
  p_round_number int,
  p_choice text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_total_active int;
  v_total_votes int;
  v_config jsonb;
BEGIN
  -- Lock session
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.status <> 'playing' THEN
    RAISE EXCEPTION 'Game is not currently active';
  END IF;

  -- Upsert vote
  INSERT INTO game_votes (session_id, player_id, round_number, choice, created_at)
  VALUES (p_session_id, p_player_id, p_round_number, p_choice, now())
  ON CONFLICT (session_id, player_id, round_number)
  DO UPDATE SET choice = EXCLUDED.choice, created_at = now();

  -- Check if all active non-eliminated players have voted
  SELECT count(*) INTO v_total_active
  FROM game_players
  WHERE session_id = p_session_id AND is_eliminated = false;

  SELECT count(*) INTO v_total_votes
  FROM game_votes
  WHERE session_id = p_session_id AND round_number = p_round_number;

  v_config := v_session.game_config;

  -- If all players have voted, trigger reveal
  IF v_total_votes >= v_total_active AND v_total_active > 0 THEN
    v_config := jsonb_set(v_config, '{voting_phase}', '"revealed"'::jsonb);
    
    UPDATE game_sessions
    SET game_config = v_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'revealed', true,
      'total_votes', v_total_votes,
      'total_players', v_total_active
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'revealed', false,
    'total_votes', v_total_votes,
    'total_players', v_total_active
  );
END;
$$;


-- Function: Submit Answer (Trivia / "20-Second Challenge" Engine)
CREATE OR REPLACE FUNCTION submit_answer(
  p_session_id uuid,
  p_player_id uuid,
  p_round_number int,
  p_answer text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_correct_answer text;
  v_is_correct boolean;
  v_prev_is_correct boolean;
  v_total_active int;
  v_total_answers int;
  v_config jsonb;
BEGIN
  -- Lock session
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.status <> 'playing' THEN
    RAISE EXCEPTION 'Game is not currently active';
  END IF;

  v_correct_answer := v_session.game_config #>> '{current_prompt,correct_answer}';
  v_is_correct := (v_correct_answer IS NOT NULL AND p_answer = v_correct_answer);

  -- Look up any previous answer for this round so a changed answer (upsert)
  -- adjusts score by the delta instead of double-counting. FOUND is set by
  -- this SELECT INTO (true/false, never null) - a plain "SELECT ... INTO x"
  -- would leave x as NULL (not false) when no row matches, which would make
  -- every later "NOT v_prev_is_correct" check below silently short-circuit
  -- to NULL instead of true.
  SELECT is_correct INTO v_prev_is_correct
  FROM game_answers
  WHERE session_id = p_session_id AND player_id = p_player_id AND round_number = p_round_number;

  IF NOT FOUND THEN
    v_prev_is_correct := false;
  END IF;

  -- Upsert answer
  INSERT INTO game_answers (session_id, player_id, round_number, selected_answer, is_correct, answered_at)
  VALUES (p_session_id, p_player_id, p_round_number, p_answer, v_is_correct, now())
  ON CONFLICT (session_id, player_id, round_number)
  DO UPDATE SET selected_answer = EXCLUDED.selected_answer, is_correct = EXCLUDED.is_correct, answered_at = now();

  -- Adjust score by the correctness delta (handles a changed answer cleanly;
  -- under normal play the frontend locks the choice after the first submit)
  IF v_is_correct AND NOT v_prev_is_correct THEN
    UPDATE game_players SET score = score + 1 WHERE id = p_player_id;
  ELSIF v_prev_is_correct AND NOT v_is_correct THEN
    UPDATE game_players SET score = GREATEST(score - 1, 0) WHERE id = p_player_id;
  END IF;

  -- Check if all active non-eliminated players have answered
  SELECT count(*) INTO v_total_active
  FROM game_players
  WHERE session_id = p_session_id AND is_eliminated = false;

  SELECT count(*) INTO v_total_answers
  FROM game_answers
  WHERE session_id = p_session_id AND round_number = p_round_number;

  v_config := v_session.game_config;

  -- If all players have answered, trigger reveal
  IF v_total_answers >= v_total_active AND v_total_active > 0 THEN
    v_config := jsonb_set(v_config, '{phase}', '"revealed"'::jsonb);

    UPDATE game_sessions
    SET game_config = v_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'is_correct', v_is_correct,
      'revealed', true,
      'total_answers', v_total_answers,
      'total_players', v_total_active
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'revealed', false,
    'total_answers', v_total_answers,
    'total_players', v_total_active
  );
END;
$$;


-- Function: Next Vote Round (Vote & Reveal: Fetch next unused prompt and reset timer)
CREATE OR REPLACE FUNCTION next_vote_round(
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_prompt game_prompts%ROWTYPE;
  v_options jsonb;
  v_used_ids jsonb;
  v_round int;
  v_new_config jsonb;
  v_deadline timestamptz;
BEGIN
  -- Lock session
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_round := COALESCE((v_session.game_config ->> 'round_number')::int, 1) + 1;
  v_used_ids := COALESCE(v_session.game_config -> 'used_prompt_ids', '[]'::jsonb);

  -- Pick unused prompt from category (engine keyed off this session's game type,
  -- so vote_reveal and most_likely each draw from their own prompt pool)
  SELECT * INTO v_prompt
  FROM game_prompts
  WHERE engine = v_session.game_type
    AND category = v_session.category
    AND NOT (v_used_ids @> to_jsonb(id::text))
  ORDER BY random()
  LIMIT 1;

  -- If all prompts in category were used, cycle and allow any from category
  IF v_prompt.id IS NULL THEN
    SELECT * INTO v_prompt
    FROM game_prompts
    WHERE engine = v_session.game_type AND category = v_session.category
    ORDER BY random()
    LIMIT 1;
  END IF;

  -- Fallback to any prompt of this engine
  IF v_prompt.id IS NULL THEN
    SELECT * INTO v_prompt
    FROM game_prompts
    WHERE engine = v_session.game_type
    ORDER BY random()
    LIMIT 1;
  END IF;

  -- A null options column means "vote for a player" (most_likely): build the
  -- option list from the session's active players instead of fixed text
  v_options := v_prompt.options;
  IF v_options IS NULL THEN
    SELECT jsonb_agg(jsonb_build_object('id', gp.id, 'display_name', gp.display_name))
    INTO v_options
    FROM game_players gp
    WHERE gp.session_id = p_session_id AND gp.is_eliminated = false;
  END IF;

  v_deadline := now() + interval '20 seconds';
  v_used_ids := v_used_ids || to_jsonb(v_prompt.id::text);

  v_new_config := jsonb_build_object(
    'round_number', v_round,
    'voting_phase', 'voting',
    'current_prompt', jsonb_build_object(
      'id', v_prompt.id,
      'prompt_text', v_prompt.prompt_text,
      'options', v_options,
      'category', v_prompt.category
    ),
    'used_prompt_ids', v_used_ids
  );

  UPDATE game_sessions
  SET status = 'playing',
      turn_deadline = v_deadline,
      game_config = v_new_config
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'round_number', v_round,
    'turn_deadline', v_deadline,
    'game_config', v_new_config
  );
END;
$$;


-- Function: Next Trivia Round (Trivia / "20-Second Challenge": fetch next unused prompt and reset timer)
CREATE OR REPLACE FUNCTION next_trivia_round(
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_prompt game_prompts%ROWTYPE;
  v_used_ids jsonb;
  v_round int;
  v_new_config jsonb;
  v_deadline timestamptz;
BEGIN
  -- Lock session
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_round := COALESCE((v_session.game_config ->> 'round_number')::int, 1) + 1;
  v_used_ids := COALESCE(v_session.game_config -> 'used_prompt_ids', '[]'::jsonb);

  -- Pick unused trivia prompt from category
  SELECT * INTO v_prompt
  FROM game_prompts
  WHERE engine = 'trivia'
    AND category = v_session.category
    AND NOT (v_used_ids @> to_jsonb(id::text))
  ORDER BY random()
  LIMIT 1;

  -- If all prompts in category were used, cycle and allow any from category
  IF v_prompt.id IS NULL THEN
    SELECT * INTO v_prompt
    FROM game_prompts
    WHERE engine = 'trivia' AND category = v_session.category
    ORDER BY random()
    LIMIT 1;
  END IF;

  -- Fallback to any trivia prompt
  IF v_prompt.id IS NULL THEN
    SELECT * INTO v_prompt
    FROM game_prompts
    WHERE engine = 'trivia'
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF v_prompt.id IS NULL THEN
    RAISE EXCEPTION 'No trivia prompts available - run scripts/seed-trivia.ts first';
  END IF;

  v_deadline := now() + interval '20 seconds';
  v_used_ids := v_used_ids || to_jsonb(v_prompt.id::text);

  v_new_config := jsonb_build_object(
    'round_number', v_round,
    'phase', 'answering',
    'current_prompt', jsonb_build_object(
      'id', v_prompt.id,
      'prompt_text', v_prompt.prompt_text,
      'options', v_prompt.options,
      'correct_answer', v_prompt.correct_answer,
      'category', v_prompt.category
    ),
    'used_prompt_ids', v_used_ids
  );

  UPDATE game_sessions
  SET status = 'playing',
      turn_deadline = v_deadline,
      game_config = v_new_config
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'round_number', v_round,
    'turn_deadline', v_deadline,
    'game_config', v_new_config
  );
END;
$$;


-- Function: Handle Turn Timeout
CREATE OR REPLACE FUNCTION handle_timeout(
  p_session_id uuid,
  p_timed_out_player_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_active_count int;
  v_turn_order_len int;
  v_expected_player_id uuid;
  v_next_index int;
  v_candidate_id uuid;
  v_is_elim boolean;
  v_i int;
  v_config jsonb;
  v_winner_id uuid;
  v_winner_rounds int;
  v_deadline_interval interval;
BEGIN
  -- Lock session
  SELECT * INTO v_session
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session.status <> 'playing' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Game not playing');
  END IF;

  -- For vote_reveal & most_likely, timeout marks voting_phase as 'revealed'
  IF v_session.game_type IN ('vote_reveal', 'most_likely') THEN
    v_config := jsonb_set(v_session.game_config, '{voting_phase}', '"revealed"'::jsonb);
    UPDATE game_sessions
    SET game_config = v_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'voting_phase', 'revealed');
  END IF;

  -- For trivia, timeout marks phase as 'revealed' too - no answer just means
  -- 0 points for that round, nobody is eliminated
  IF v_session.game_type = 'trivia' THEN
    v_config := jsonb_set(v_session.game_config, '{phase}', '"revealed"'::jsonb);
    UPDATE game_sessions
    SET game_config = v_config
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'phase', 'revealed');
  END IF;

  -- Word Chain / Higher-or-Lower timeout handling: both are elimination-based,
  -- turn-order games where a timeout eliminates whoever's turn it was, just
  -- like a wrong submission would. word_chain runs a 30s timer and scores
  -- survived rounds off used_words; higher_lower runs a 20s timer (like
  -- trivia/vote_reveal) and scores survived rounds off its own guess_history.
  v_turn_order_len := jsonb_array_length(v_session.turn_order);
  IF v_turn_order_len = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No players in turn order');
  END IF;

  v_expected_player_id := (v_session.turn_order ->> v_session.current_turn_index)::uuid;
  v_deadline_interval := CASE WHEN v_session.game_type = 'higher_lower' THEN interval '20 seconds' ELSE interval '30 seconds' END;

  -- If expected player matches timed out player
  IF p_timed_out_player_id IS NULL OR v_expected_player_id = p_timed_out_player_id THEN
    -- Mark player eliminated
    UPDATE game_players
    SET is_eliminated = true
    WHERE id = v_expected_player_id AND session_id = p_session_id;

    -- Check how many active players remain
    SELECT count(*) INTO v_active_count
    FROM game_players
    WHERE session_id = p_session_id AND is_eliminated = false;

    -- If 1 or 0 remaining active players (and more than 1 started), game is finished!
    IF v_active_count <= 1 AND v_turn_order_len > 1 THEN
      -- Award the sole remaining active player (if any - a double-elimination
      -- edge case can leave zero) Game Night points: +3 for winning, +1 per
      -- round survived
      SELECT id INTO v_winner_id
      FROM game_players
      WHERE session_id = p_session_id AND is_eliminated = false
      LIMIT 1;

      IF v_winner_id IS NOT NULL THEN
        IF v_session.game_type = 'higher_lower' THEN
          SELECT count(*) INTO v_winner_rounds
          FROM jsonb_array_elements(COALESCE(v_session.game_config -> 'guess_history', '[]'::jsonb)) elem
          WHERE (elem ->> 'player_id') = v_winner_id::text AND (elem ->> 'correct')::boolean = true;
        ELSE
          SELECT count(*) INTO v_winner_rounds
          FROM jsonb_array_elements(v_session.used_words) elem
          WHERE (elem ->> 'player_id') = v_winner_id::text;
        END IF;

        UPDATE game_players
        SET total_score = total_score + 3 + v_winner_rounds
        WHERE id = v_winner_id;
      END IF;

      UPDATE game_sessions
      SET status = 'finished',
          turn_deadline = NULL
      WHERE id = p_session_id;

      RETURN jsonb_build_object(
        'success', true,
        'status', 'finished',
        'active_players_left', v_active_count
      );
    END IF;

    -- Find next active player
    v_next_index := v_session.current_turn_index;
    FOR v_i IN 1..v_turn_order_len LOOP
      v_next_index := (v_next_index + 1) % v_turn_order_len;
      v_candidate_id := (v_session.turn_order ->> v_next_index)::uuid;

      SELECT is_eliminated INTO v_is_elim
      FROM game_players
      WHERE id = v_candidate_id AND session_id = p_session_id;

      IF v_is_elim IS FALSE THEN
        EXIT;
      END IF;
    END LOOP;

    -- Advance turn and reset the deadline
    UPDATE game_sessions
    SET current_turn_index = v_next_index,
        turn_deadline = now() + v_deadline_interval
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'eliminated_player_id', v_expected_player_id,
      'current_turn_index', v_next_index,
      'turn_deadline', now() + v_deadline_interval
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'Player is not current turn');
END;
$$;


-- Function: Reset Game Session (For "Play Again" / "End Game" return to lobby)
CREATE OR REPLACE FUNCTION reset_game(
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_type text;
BEGIN
  SELECT game_type INTO v_game_type FROM game_sessions WHERE id = p_session_id;

  -- Trivia's round-set is ending here (host returns to lobby / plays again) -
  -- roll each player's per-game `score` into the persistent Game Night
  -- `total_score` before it gets zeroed below. word_chain already awarded its
  -- winner at the moment the game finished (see submit_word/handle_timeout);
  -- vote_reveal/most_likely are non-competitive and never touch total_score.
  -- total_score itself is never reset here - it only resets by leaving the
  -- room and starting a fresh session.
  IF v_game_type = 'trivia' THEN
    UPDATE game_players
    SET total_score = total_score + score
    WHERE session_id = p_session_id;
  END IF;

  -- Reset session
  UPDATE game_sessions
  SET status = 'lobby',
      turn_order = '[]'::jsonb,
      current_turn_index = 0,
      used_words = '[]'::jsonb,
      last_letter = NULL,
      turn_deadline = NULL,
      game_config = '{}'::jsonb
  WHERE id = p_session_id;

  -- Reset players (score is only ever incremented by submit_answer, so
  -- zeroing it here is a no-op for word_chain/vote_reveal/most_likely
  -- sessions - it's always already 0 for them). total_score is deliberately
  -- left untouched.
  UPDATE game_players
  SET is_eliminated = false,
      score = 0
  WHERE session_id = p_session_id;

  -- Clear prior-round trivia answers so a replayed game (same session_id,
  -- round numbers starting back at 1) doesn't inherit stale "already
  -- answered" rows from the previous playthrough
  DELETE FROM game_answers WHERE session_id = p_session_id;

  RETURN jsonb_build_object('success', true, 'status', 'lobby');
END;
$$;
