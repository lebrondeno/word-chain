export type SessionStatus = 'lobby' | 'playing' | 'finished';

export type GameType = 'word_chain' | 'vote_reveal' | 'most_likely' | 'trivia';

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

export interface GameConfig {
  round_number?: number;
  current_prompt?: VoteRevealPrompt | null;
  used_prompt_ids?: string[];
  voting_phase?: 'voting' | 'revealed'; // vote_reveal & most_likely
  phase?: 'answering' | 'revealed'; // trivia
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
  created_at: string;
}

export interface GamePlayer {
  id: string;
  session_id: string;
  display_name: string;
  is_eliminated: boolean;
  score: number;
  joined_at: string;
}

export interface GamePrompt {
  id: string;
  engine: string;
  category: string;
  prompt_text: string;
  options: [string, string] | string[] | null;
  correct_answer?: string | null;
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
