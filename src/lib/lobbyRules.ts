/** Games the host may start alone (solo / AI) - everything else needs 2+ players. */
export const SOLO_STARTABLE_GAMES = ['trivia', 'higher_lower', 'tic_tac_toe'] as const;

/** Minimum players required to start `gameType` from the lobby. */
export const getMinPlayersToStart = (gameType: string): number =>
  (SOLO_STARTABLE_GAMES as readonly string[]).includes(gameType) ? 1 : 2;

/** Whether a lobby with `playerCount` players can start `gameType` (Tic Tac Toe solo launches the AI bot). */
export const canStartLobby = (
  gameType: string,
  playerCount: number,
  options: { selectedSeatCount?: number } = {}
): boolean => {
  if (gameType === 'tic_tac_toe') {
    if (playerCount === 1) return true; // solo -> AI bot
    if (playerCount === 2) return true;
    return playerCount > 2 && options.selectedSeatCount === 2;
  }
  return playerCount >= getMinPlayersToStart(gameType);
};
