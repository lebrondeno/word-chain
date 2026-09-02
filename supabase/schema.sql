-- ==========================================================
-- MULTIPLAYER WORD-CHAIN GAME SCHEMA & REALTIME SETUP
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
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  is_eliminated boolean DEFAULT false,
  joined_at timestamptz DEFAULT now()
);

-- 2. Indexes for high performance lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_code ON game_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_game_players_session_id ON game_players(session_id);

-- 3. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

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


-- ==========================================================
-- POSTGRES RPC FUNCTIONS (Atomic Concurrency & Game Logic)
-- ==========================================================

-- Function: Start Game
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

  v_deadline := now() + interval '15 seconds';

  -- Update session to playing
  UPDATE game_sessions
  SET status = 'playing',
      turn_order = v_player_ids,
      current_turn_index = 0,
      used_words = '[]'::jsonb,
      last_letter = NULL,
      turn_deadline = v_deadline
  WHERE id = p_session_id;

  -- Ensure all players are marked not eliminated
  UPDATE game_players
  SET is_eliminated = false
  WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'playing',
    'turn_order', v_player_ids,
    'turn_deadline', v_deadline
  );
END;
$$;


-- Function: Submit Word (Atomic validation, appending word, advancing turn)
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
  -- Check in used_words array (both string items and object items {word: '...'})
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

  -- 9. Update game session with new word, new last_letter, next turn, new 15s deadline
  UPDATE game_sessions
  SET used_words = v_new_used_words,
      last_letter = v_last_char,
      current_turn_index = v_next_index,
      turn_deadline = now() + interval '15 seconds'
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'word', v_clean_word,
    'last_letter', v_last_char,
    'current_turn_index', v_next_index,
    'turn_deadline', now() + interval '15 seconds'
  );
END;
$$;


-- Function: Handle Turn Timeout (Eliminate timed out player, pass turn)
CREATE OR REPLACE FUNCTION handle_timeout(
  p_session_id uuid,
  p_timed_out_player_id uuid
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

  v_turn_order_len := jsonb_array_length(v_session.turn_order);
  IF v_turn_order_len = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No players in turn order');
  END IF;

  v_expected_player_id := (v_session.turn_order ->> v_session.current_turn_index)::uuid;
  
  -- If expected player matches timed out player
  IF v_expected_player_id = p_timed_out_player_id THEN
    -- Mark player eliminated
    UPDATE game_players
    SET is_eliminated = true
    WHERE id = p_timed_out_player_id AND session_id = p_session_id;

    -- Check how many active players remain
    SELECT count(*) INTO v_active_count
    FROM game_players
    WHERE session_id = p_session_id AND is_eliminated = false;

    -- If 1 or 0 remaining active players (and more than 1 started), game is finished!
    IF v_active_count <= 1 AND v_turn_order_len > 1 THEN
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

    -- Advance turn and reset 15-second deadline
    UPDATE game_sessions
    SET current_turn_index = v_next_index,
        turn_deadline = now() + interval '15 seconds'
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true,
      'eliminated_player_id', p_timed_out_player_id,
      'current_turn_index', v_next_index,
      'turn_deadline', now() + interval '15 seconds'
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'Player is not current turn');
END;
$$;


-- Function: Reset Game Session (For "Play Again")
CREATE OR REPLACE FUNCTION reset_game(
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset session
  UPDATE game_sessions
  SET status = 'lobby',
      turn_order = '[]'::jsonb,
      current_turn_index = 0,
      used_words = '[]'::jsonb,
      last_letter = NULL,
      turn_deadline = NULL
  WHERE id = p_session_id;

  -- Reset players
  UPDATE game_players
  SET is_eliminated = false
  WHERE session_id = p_session_id;

  RETURN jsonb_build_object('success', true, 'status', 'lobby');
END;
$$;
