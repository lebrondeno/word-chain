export type TicTacToeMark = 'X' | 'O';

export type WinningLine = [number, number, number];

export const WIN_LINES: WinningLine[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6],             // Diagonals
];

export interface TicTacToeResult {
  winner: TicTacToeMark | null;
  winningLine: WinningLine | null;
  isDraw: boolean;
}

export const checkTicTacToeWin = (
  board: (string | null)[]
): TicTacToeResult => {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as TicTacToeMark, winningLine: [a, b, c], isDraw: false };
    }
  }
  const isDraw = board.every((cell) => cell !== null);
  return { winner: null, winningLine: null, isDraw };
};

// Smart Minimax AI for Bot move calculation
export const getBestBotMove = (board: (string | null)[]): number => {
  // 1. Can bot win on this move?
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const copy = [...board];
      copy[i] = 'O';
      if (checkTicTacToeWin(copy).winner === 'O') return i;
    }
  }

  // 2. Can player win on next move? Block them!
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const copy = [...board];
      copy[i] = 'X';
      if (checkTicTacToeWin(copy).winner === 'X') return i;
    }
  }

  // 3. Take center if available
  if (!board[4]) return 4;

  // 4. Take corners
  const corners = [0, 2, 6, 8].filter((idx) => !board[idx]);
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 5. Take any remaining empty cell
  const empty = board.map((c, i) => (c === null ? i : null)).filter((i): i is number => i !== null);
  if (empty.length === 0) return -1;
  return empty[Math.floor(Math.random() * empty.length)];
};

// ---------------------------------------------------------------------------
// Tactical 3-Piece Shift Mode
//
// The board starts with all six pieces already placed:
//   top row    (0,1,2) -> X X X
//   middle row (3,4,5) -> empty
//   bottom row (6,7,8) -> O O O
// On a turn a player moves ONE of their own pieces onto an open square.
// First to align their 3 pieces on any line other than their own starting
// home row wins.
// ---------------------------------------------------------------------------

export type TicTacToeVariant = 'tactical' | 'classic';

/** 'adjacent' = to any touching empty square (incl. diagonals); 'anywhere' = any empty square. */
export type TicTacToeMoveRule = 'adjacent' | 'anywhere';

export type TicTacToeBoard = (TicTacToeMark | null)[];

export interface TicTacToePieceMove {
  from: number;
  to: number;
}

export const DEFAULT_TIC_TAC_TOE_VARIANT: TicTacToeVariant = 'tactical';
export const DEFAULT_MOVE_RULE: TicTacToeMoveRule = 'adjacent';

/** Draw if nobody has won after this many piece moves (prevents endless shuffling). */
export const TACTICAL_MOVE_CAP = 60;

export const HOME_LINES: Record<TicTacToeMark, WinningLine> = {
  X: [0, 1, 2],
  O: [6, 7, 8],
};

export const getInitialBoard = (variant: TicTacToeVariant = DEFAULT_TIC_TAC_TOE_VARIANT): TicTacToeBoard =>
  variant === 'tactical'
    ? ['X', 'X', 'X', null, null, null, 'O', 'O', 'O']
    : Array(9).fill(null);

export const getOpponent = (mark: TicTacToeMark): TicTacToeMark => (mark === 'X' ? 'O' : 'X');

const sameLine = (a: WinningLine, b: WinningLine) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** Cells touching `index` (horizontal, vertical and diagonal). */
export const getAdjacentCells = (index: number): number[] => {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 3 && c >= 0 && c < 3) result.push(r * 3 + c);
    }
  }
  return result;
};

/** Open squares the piece at `from` may move to. */
export const getLegalDestinations = (
  board: TicTacToeBoard,
  from: number,
  rule: TicTacToeMoveRule = DEFAULT_MOVE_RULE
): number[] => {
  if (!board[from]) return [];
  const candidates = rule === 'anywhere' ? board.map((_, i) => i) : getAdjacentCells(from);
  return candidates.filter((i) => i !== from && board[i] === null);
};

export const getLegalPieceMoves = (
  board: TicTacToeBoard,
  mark: TicTacToeMark,
  rule: TicTacToeMoveRule = DEFAULT_MOVE_RULE
): TicTacToePieceMove[] => {
  const moves: TicTacToePieceMove[] = [];
  board.forEach((cell, from) => {
    if (cell !== mark) return;
    for (const to of getLegalDestinations(board, from, rule)) moves.push({ from, to });
  });
  return moves;
};

export const isLegalPieceMove = (
  board: TicTacToeBoard,
  mark: TicTacToeMark,
  move: TicTacToePieceMove,
  rule: TicTacToeMoveRule = DEFAULT_MOVE_RULE
): boolean => board[move.from] === mark && getLegalDestinations(board, move.from, rule).includes(move.to);

export const applyPieceMove = (board: TicTacToeBoard, move: TicTacToePieceMove): TicTacToeBoard => {
  const next = [...board];
  next[move.to] = next[move.from];
  next[move.from] = null;
  return next;
};

/**
 * Tactical win check: a player wins by aligning their pieces on any line
 * except their own starting home row.
 */
export const checkTacticalWin = (board: TicTacToeBoard): TicTacToeResult => {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (!mark || board[b] !== mark || board[c] !== mark) continue;
    if (sameLine(line, HOME_LINES[mark])) continue;
    return { winner: mark, winningLine: line, isDraw: false };
  }
  return { winner: null, winningLine: null, isDraw: false };
};

/** Unified result for either variant. `moveCount` is the number of piece moves played so far. */
export const evaluateBoard = (
  board: TicTacToeBoard,
  variant: TicTacToeVariant,
  options: { moveCount?: number; toMove?: TicTacToeMark; rule?: TicTacToeMoveRule } = {}
): TicTacToeResult => {
  if (variant === 'classic') return checkTicTacToeWin(board);
  const result = checkTacticalWin(board);
  if (result.winner) return result;
  const capped = (options.moveCount ?? 0) >= TACTICAL_MOVE_CAP;
  const blocked = options.toMove
    ? getLegalPieceMoves(board, options.toMove, options.rule ?? DEFAULT_MOVE_RULE).length === 0
    : false;
  return { winner: null, winningLine: null, isDraw: capped || blocked };
};

const lineScore = (board: TicTacToeBoard, mark: TicTacToeMark): number => {
  const opp = getOpponent(mark);
  let score = 0;
  for (const line of WIN_LINES) {
    const cells = line.map((i) => board[i]);
    const own = cells.filter((c) => c === mark).length;
    const theirs = cells.filter((c) => c === opp).length;
    if (own > 0 && theirs === 0 && !sameLine(line, HOME_LINES[mark])) score += own * own;
    if (theirs > 0 && own === 0 && !sameLine(line, HOME_LINES[opp])) score -= theirs * theirs;
  }
  return score;
};

const WIN_SCORE = 10000;

// Negamax with alpha-beta: value of `board` for the player about to move (`mark`).
const negamax = (
  board: TicTacToeBoard,
  mark: TicTacToeMark,
  depth: number,
  alpha: number,
  beta: number,
  rule: TicTacToeMoveRule
): number => {
  const moves = getLegalPieceMoves(board, mark, rule);
  if (moves.length === 0) return 0;
  if (depth === 0) return lineScore(board, mark);
  let best = -Infinity;
  for (const move of moves) {
    const next = applyPieceMove(board, move);
    const won = checkTacticalWin(next).winner === mark;
    const value = won
      ? WIN_SCORE + depth
      : -negamax(next, getOpponent(mark), depth - 1, -beta, -alpha, rule);
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
};

/**
 * Picks a strong piece move for `mark` in Tactical mode: takes immediate wins,
 * otherwise searches `depth` plies ahead (blocking the opponent's threats) and
 * breaks ties randomly. Returns null if the bot has no legal move.
 */
export const getBestTacticalMove = (
  board: TicTacToeBoard,
  mark: TicTacToeMark = 'O',
  rule: TicTacToeMoveRule = DEFAULT_MOVE_RULE,
  depth = 5,
  random: () => number = Math.random
): TicTacToePieceMove | null => {
  const moves = getLegalPieceMoves(board, mark, rule);
  if (moves.length === 0) return null;

  let bestValue = -Infinity;
  let bestMoves: TicTacToePieceMove[] = [];
  for (const move of moves) {
    const next = applyPieceMove(board, move);
    const value =
      checkTacticalWin(next).winner === mark
        ? WIN_SCORE + depth + 1
        : -negamax(next, getOpponent(mark), depth - 1, -Infinity, Infinity, rule);
    if (value > bestValue) {
      bestValue = value;
      bestMoves = [move];
    } else if (value === bestValue) {
      bestMoves.push(move);
    }
  }
  return bestMoves[Math.floor(random() * bestMoves.length)];
};
