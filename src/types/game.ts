export type SessionStatus = 'lobby' | 'playing' | 'finished';

export type GameType =
  | 'word_chain'
  | 'vote_reveal'
  | 'friendship_test'
  | 'tic_tac_toe'
  | 'trivia'
  | 'higher_lower'
  | 'most_likely';

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
  correct_answer?: string;
}

export interface HigherLowerCurrentValue {
  id: string | null;
  label: string;
  value: number;
  category?: string;
}

export type HigherLowerTieBehavior = 'push' | 'elimination' | 'auto_correct';

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

export type TicTacToeMark = 'X' | 'O';

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
  board?: (TicTacToeMark | null)[]; // tic_tac_toe: 9 cells, row-major
  player_x_id?: string; // tic_tac_toe
  player_o_id?: string; // tic_tac_toe
  winner?: TicTacToeMark | 'draw' | null; // tic_tac_toe
  winning_line?: [number, number, number] | null; // tic_tac_toe
  ttt_mode?: 'tactical' | 'classic'; // tic_tac_toe variant
  move_rule?: 'adjacent' | 'anywhere'; // tic_tac_toe tactical
  move_count?: number; // tic_tac_toe tactical
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
  difficulty?: string;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  session_id: string;
  display_name: string;
  is_eliminated: boolean;
  score?: number;
  total_score?: number;
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
