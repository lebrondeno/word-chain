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
