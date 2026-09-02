export type SessionStatus = 'lobby' | 'playing' | 'finished';

export interface UsedWordItem {
  word: string;
  display_word?: string;
  player_id?: string;
  player_name?: string;
  submitted_at?: string;
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
  created_at: string;
}

export interface GamePlayer {
  id: string;
  session_id: string;
  display_name: string;
  is_eliminated: boolean;
  joined_at: string;
}

export interface LocalPlayerSession {
  playerId: string;
  sessionId: string;
  roomCode: string;
  displayName: string;
  isHost: boolean;
}

export type WordValidationStatus = 'idle' | 'valid' | 'invalid' | 'submitting';
