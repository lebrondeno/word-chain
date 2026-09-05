export type SessionStatus = 'lobby' | 'playing' | 'finished';

export type GameType = 'word_chain' | 'vote_reveal' | 'most_likely' | 'trivia' | 'higher_lower';

export interface UsedWordItem {
  word: string;
  display_word?: string;
  player_id?: string;
  player_name?: string;
  submitted_at?: string;
}

// A "most_likely" prompt's option is a player to vote for, rather than fixed text
export interface PlayerOption {
  id: string;
  display_name: string;
}

export interface VoteRevealPrompt {
  id: string;
  prompt_text: string;
  options: [string, string] | string[] | PlayerOption[] | null;
  category?: string;
  // 'trivia' engine only: which options[] entry is correct. Present in
  // game_config for all clients (not just the host) since this app has no
  // per-player server-authoritative view - see TriviaGameView for the
  // fairness trade-off this implies.
  correct_answer?: string;
}

// 'higher_lower' engine only: the reference value being compared against,
// shaped after the HigherLowerProvider interface's { id, label, value } -
// see src/lib/higherLowerProviders. id is null for the generated provider
// ('random_numbers'), which draws from no finite pool and so has nothing to
// dedupe against; every cached-table category (population, football_stats,
// or any future seed-script-populated category) carries its game_prompts row id.
export interface HigherLowerCurrentValue {
  id: string | null;
  label: string;
  value: number;
  category?: string;
}

// 'higher_lower' engine only: what tie_behavior does when the freshly-drawn
// value exactly equals the current value. Read from game_config.tie_behavior
// (defaults to 'push' if absent) so a future difficulty mode can change the
// rule without an RPC change - see submit_guess in supabase/schema.sql.
export type HigherLowerTieBehavior = 'push' | 'elimination' | 'auto_correct';

// 'higher_lower' engine only: one player's guess and its outcome, appended
// to game_config.guess_history each turn (and mirrored into last_guess for
// convenience) so every client can render the same reveal off realtime state.
// 'push' means a tie under tie_behavior: 'push' - not counted as right or
// wrong, the turn still passes and the tied value becomes the new current.
export interface HigherLowerGuess {
  player_id: string;
  player_name: string;
  guess: 'higher' | 'lower';
  outcome: 'correct' | 'incorrect' | 'push';
  previous_value: number;
  previous_label: string;
  new_value: number;
  new_label: string;
  guessed_at?: string;
}

export interface GameConfig {
  round_number?: number;
  current_prompt?: VoteRevealPrompt | null;
  used_prompt_ids?: string[];
  voting_phase?: 'voting' | 'revealed'; // vote_reveal & most_likely
  phase?: 'answering' | 'revealed'; // trivia
  current_value?: HigherLowerCurrentValue | null; // higher_lower
  last_guess?: HigherLowerGuess | null; // higher_lower
  guess_history?: HigherLowerGuess[]; // higher_lower
  tie_behavior?: HigherLowerTieBehavior; // higher_lower
  [key: string]: unknown;
}

export interface GameSession {
  id: string;
  room_code: string;
  game_type: string;
  category: string;
  status: SessionStatus;
  turn_order: string[]; // JSON array of player UUIDs
  current_turn_index: number;
  used_words: (string | UsedWordItem)[];
  last_letter: string | null;
  turn_deadline: string | null; // ISO timestamp
  game_config?: GameConfig;
  // 'higher_lower' engine only: host-selected difficulty for the
  // 'random_numbers' category ('easy' | 'medium' | 'hard' | 'expert').
  // Meaningless for every other game type/category; defaults to 'medium'.
  difficulty: string;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  session_id: string;
  display_name: string;
  is_eliminated: boolean;
  score: number;
  // Persistent "Game Night" leaderboard total - separate from the per-game
  // `score` column above. Carries across "Play Again" and game-type switches
  // within the same room; see supabase/schema.sql's reset_game/submit_word/
  // handle_timeout for where it's written.
  total_score: number;
  joined_at: string;
}

export interface GamePrompt {
  id: string;
  engine: string;
  category: string;
  prompt_text: string;
  options: [string, string] | string[] | null;
  correct_answer?: string | null;
  numeric_value?: number | null;
  // 'higher_lower' engine only: where numeric_value came from (e.g.
  // 'restcountries_api', 'manual') and when it was last refreshed. Not read
  // by any RPC yet - reserved for a future "refresh this dataset" action,
  // per HigherLowerProvider.refreshDataset.
  source?: string | null;
  last_updated?: string | null;
  created_at?: string;
}

export interface GameVote {
  id: string;
  session_id: string;
  player_id: string;
  round_number: number;
  choice: string;
  created_at: string;
}

export interface GameAnswer {
  id: string;
  session_id: string;
  player_id: string;
  round_number: number;
  selected_answer: string;
  is_correct: boolean;
  answered_at: string;
}

export interface LocalPlayerSession {
  playerId: string;
  sessionId: string;
  roomCode: string;
  displayName: string;
  isHost: boolean;
}

export type WordValidationStatus = 'idle' | 'valid' | 'invalid' | 'submitting';
