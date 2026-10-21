import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Clock, Eye, Bot, User, RotateCcw, ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../lib/audio';
import { checkTicTacToeWin, getBestBotMove } from '../lib/ticTacToe';

export type TicTacToePlayMode = 'bot' | 'pass_and_play';

interface TicTacToeGameViewProps {
  // If provided, forces local mode (pass & play or bot) even if no Supabase session
  forceLocal?: boolean;
  onExitLocal?: () => void;
}

export const TicTacToeGameView: React.FC<TicTacToeGameViewProps> = ({
  forceLocal = false,
  onExitLocal,
}) => {
  const { session, players, localPlayer, isMyTurn, currentTurnPlayer, timeRemaining, submitMove, error } =
    useGame();

  // Local / Bot state
  const isLocalMode = forceLocal || !session;
  const [localModeType, setLocalModeType] = useState<TicTacToePlayMode>('bot');
  const [localBoard, setLocalBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [localTurn, setLocalTurn] = useState<'X' | 'O'>('X');
  const [localScores, setLocalScores] = useState<{ x: number; o: number; draws: number }>({
    x: 0,
    o: 0,
    draws: 0,
  });
  const [botThinking, setBotThinking] = useState(false);
  const [submittingCell, setSubmittingCell] = useState<number | null>(null);

  // Local game outcome
  const localResult = checkTicTacToeWin(localBoard);

  // Trigger celebration on local win
  useEffect(() => {
    if (localResult.winner) {
      soundManager.playWinner();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      setLocalScores((prev) => ({
        ...prev,
        [localResult.winner === 'X' ? 'x' : 'o']: prev[localResult.winner === 'X' ? 'x' : 'o'] + 1,
      }));
    } else if (localResult.isDraw) {
      soundManager.playCorrect();
      setLocalScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
    }
  }, [localResult.winner, localResult.isDraw]);

  // Bot response effect in local bot mode
  useEffect(() => {
    if (!isLocalMode || localModeType !== 'bot') return;
    if (localTurn !== 'O' || localResult.winner || localResult.isDraw) return;

    setBotThinking(true);
    const timer = setTimeout(() => {
      const bestMove = getBestBotMove(localBoard);
      if (bestMove >= 0 && bestMove < 9) {
        soundManager.playVote();
        setLocalBoard((prev) => {
          const next = [...prev];
          next[bestMove] = 'O';
          return next;
        });
        setLocalTurn('X');
      }
      setBotThinking(false);
    }, 380);

    return () => clearTimeout(timer);
  }, [isLocalMode, localModeType, localTurn, localBoard, localResult.winner, localResult.isDraw]);

  const handleResetLocalRound = () => {
    setLocalBoard(Array(9).fill(null));
    setLocalTurn('X');
    setBotThinking(false);
  };

  const handleLocalCellClick = (index: number) => {
    if (localBoard[index] !== null || localResult.winner || localResult.isDraw || botThinking) return;
    if (localModeType === 'bot' && localTurn !== 'X') return;

    soundManager.playVote();
    const nextBoard = [...localBoard];
    nextBoard[index] = localTurn;
    setLocalBoard(nextBoard);
    setLocalTurn((prev) => (prev === 'X' ? 'O' : 'X'));
  };

  // -------------------------------------------------------------
  // MULTIPLAYER MODE HANDLERS
  // -------------------------------------------------------------
  const board = session?.game_config?.board || Array(9).fill(null);
  const playerXId = session?.game_config?.player_x_id;
  const playerOId = session?.game_config?.player_o_id;
  const playerX = players.find((p) => p.id === playerXId) || null;
  const playerO = players.find((p) => p.id === playerOId) || null;
  const winningLine = (session?.game_config?.winning_line as [number, number, number] | null) || null;

  const localMark =
    localPlayer?.playerId === playerXId ? 'X' : localPlayer?.playerId === playerOId ? 'O' : null;
  const isSpectator = !isLocalMode && localMark === null;
  const spectators = players.filter((p) => p.id !== playerXId && p.id !== playerOId);

  const handleMultiplayerCellClick = async (index: number) => {
    if (!isMyTurn || board[index] != null || submittingCell !== null) return;
    setSubmittingCell(index);
    await submitMove(index);
    setSubmittingCell(null);
  };

  // Timer percentage (20s max)
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 20) * 100));
  const isCritical = timeRemaining < 5;
  const isUrgent = timeRemaining <= 10 && timeRemaining >= 5;

  const renderMark = (mark: string | null, size = 'w-10 h-10') => {
    if (mark === 'X') {
      return (
        <svg viewBox="0 0 24 24" className={`${size} text-[#3b4cca] animate-fade-in`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    }
    if (mark === 'O') {
      return (
        <svg viewBox="0 0 24 24" className={`${size} text-[#f43f5e] animate-fade-in`} fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-4 animate-fade-in text-slate-800">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {onExitLocal && isLocalMode && (
              <button
                type="button"
                onClick={onExitLocal}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title="Exit to Hub"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 text-[#3b4cca] flex items-center justify-center font-black text-base shadow-2xs">
              ⭕
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm text-[#0b2545] tracking-tight">Tic Tac Toe</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {isLocalMode ? (localModeType === 'bot' ? 'vs AI Bot' : 'Pass & Play') : 'Multiplayer Room'}
                </span>
              </div>
              {isSpectator && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Eye className="w-3 h-3 text-amber-500" /> Spectating Match
                </span>
              )}
            </div>
          </div>

          {!isLocalMode ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                isCritical
                  ? 'bg-rose-50 text-rose-700 border border-rose-300 animate-pulse'
                  : isUrgent
                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeRemaining}s</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResetLocalRound}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#0b2545] text-xs font-bold transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          )}
        </div>

        {!isLocalMode && (
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCritical
                  ? 'bg-rose-500'
                  : isUrgent
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-[#1f9d55] to-[#3b4cca]'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. Mode Selector (Local Mode Only) */}
      {isLocalMode && (
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 flex gap-1 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setLocalModeType('bot');
              handleResetLocalRound();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              localModeType === 'bot'
                ? 'bg-[#0b2545] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-blue-300" />
            <span>Play vs AI Bot</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLocalModeType('pass_and_play');
              handleResetLocalRound();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              localModeType === 'pass_and_play'
                ? 'bg-[#0b2545] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-300" />
            <span>Pass &amp; Play</span>
          </button>
        </div>
      )}

      {/* 3. Players Bar (X vs O) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Player X */}
        <div
          className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
            (!isLocalMode ? currentTurnPlayer?.id === playerX?.id : localTurn === 'X')
              ? 'bg-blue-50/70 border-[#3b4cca] ring-2 ring-blue-100 shadow-xs'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#3b4cca] flex items-center justify-center font-black shrink-0">
            {renderMark('X', 'w-5 h-5')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Player X</div>
            <div className="font-black text-xs text-[#0b2545] truncate">
              {isLocalMode ? 'Player 1' : playerX?.display_name || 'Waiting...'}
            </div>
          </div>
          {isLocalMode && (
            <span className="text-xs font-black text-[#3b4cca] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {localScores.x}
            </span>
          )}
        </div>

        {/* Player O */}
        <div
          className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
            (!isLocalMode ? currentTurnPlayer?.id === playerO?.id : localTurn === 'O')
              ? 'bg-rose-50/70 border-[#f43f5e] ring-2 ring-rose-100 shadow-xs'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100/70 text-[#f43f5e] flex items-center justify-center font-black shrink-0">
            {renderMark('O', 'w-5 h-5')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Player O</div>
            <div className="font-black text-xs text-[#0b2545] truncate">
              {isLocalMode
                ? localModeType === 'bot'
                  ? 'Smart Bot 🤖'
                  : 'Player 2'
                : playerO?.display_name || 'Waiting...'}
            </div>
          </div>
          {isLocalMode && (
            <span className="text-xs font-black text-[#f43f5e] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {localScores.o}
            </span>
          )}
        </div>
      </div>

      {/* 4. Main 3x3 Arena Board */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        {/* Turn Status Pill */}
        <div className="text-center mb-5">
          {isLocalMode ? (
            localResult.winner ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#1f9d55] text-xs font-black animate-bounce">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Player {localResult.winner} Won The Match!</span>
              </div>
            ) : localResult.isDraw ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                <span>It's a Stalemate Draw!</span>
              </div>
            ) : botThinking ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#3b4cca] text-xs font-bold animate-pulse">
                <Bot className="w-3.5 h-3.5 animate-spin" />
                <span>Bot is calculating best move...</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {localTurn === 'X'
                    ? "Your Turn (X)"
                    : localModeType === 'bot'
                    ? "Bot's Turn (O)"
                    : "Player 2's Turn (O)"}
                </span>
              </div>
            )
          ) : isSpectator ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Spectating: <strong>{currentTurnPlayer?.display_name || '...'}</strong>'s turn
              </span>
            </div>
          ) : isMyTurn ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#3b4cca] text-xs font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>YOUR TURN! ({localMark})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
              <span>Waiting for {currentTurnPlayer?.display_name || 'opponent'}</span>
            </div>
          )}
        </div>

        {/* 3x3 Grid Buttons */}
        <div className="grid grid-cols-3 gap-3 max-w-[300px] sm:max-w-[320px] mx-auto">
          {Array(9)
            .fill(null)
            .map((_, index) => {
              const cellValue = isLocalMode ? localBoard[index] : board[index];
              const isHighlightWin = isLocalMode
                ? localResult.winningLine?.includes(index as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)
                : winningLine?.includes(index as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);

              const isClickable = isLocalMode
                ? cellValue === null && !localResult.winner && !localResult.isDraw && !botThinking
                : isMyTurn && cellValue === null && submittingCell === null;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    isLocalMode ? handleLocalCellClick(index) : handleMultiplayerCellClick(index)
                  }
                  disabled={!isClickable}
                  className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all ${
                    isHighlightWin
                      ? 'bg-amber-50 border-amber-400 ring-4 ring-amber-200/60 scale-105 shadow-md'
                      : cellValue !== null
                      ? 'bg-slate-50 border-slate-200 shadow-2xs'
                      : isClickable
                      ? 'bg-white border-slate-300 hover:border-[#3b4cca] hover:bg-blue-50/50 hover:shadow-sm cursor-pointer active:scale-95'
                      : 'bg-slate-100/50 border-slate-200/60 cursor-default'
                  }`}
                >
                  {submittingCell === index ? (
                    <div className="w-5 h-5 border-2 border-[#3b4cca] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    renderMark(cellValue, 'w-10 h-10 sm:w-12 sm:h-12')
                  )}
                </button>
              );
            })}
        </div>

        {/* Post-Game Action Bar for Local Mode */}
        {isLocalMode && (localResult.winner || localResult.isDraw) && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-center animate-fade-in">
            <button
              type="button"
              onClick={handleResetLocalRound}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Next Round</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
            {error}
          </div>
        )}
      </div>

      {/* 5. Spectators Bar (Multiplayer Mode) */}
      {!isLocalMode && spectators.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>Spectating ({spectators.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {spectators.map((p) => (
              <span
                key={p.id}
                className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium"
              >
                {p.display_name} {p.id === localPlayer?.playerId ? '(You)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
