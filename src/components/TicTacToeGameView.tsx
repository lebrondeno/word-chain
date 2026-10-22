import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Clock, Eye, Bot, User, RotateCcw, ArrowLeft, Trophy, Sparkles, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../lib/audio';
import { haptics } from '../lib/haptics';
import {
  DEFAULT_MOVE_RULE,
  DEFAULT_TIC_TAC_TOE_VARIANT,
  HOME_LINES,
  applyPieceMove,
  evaluateBoard,
  getBestBotMove,
  getBestTacticalMove,
  getInitialBoard,
  getLegalDestinations,
  isLegalPieceMove,
  type TicTacToeBoard,
  type TicTacToeMoveRule,
  type TicTacToeVariant,
} from '../lib/ticTacToe';
import type { TicTacToeMark } from '../types/game';

export type TicTacToePlayMode = 'bot' | 'pass_and_play';

interface TicTacToeGameViewProps {
  // If provided, forces local mode (pass & play or bot) even if no Supabase session
  forceLocal?: boolean;
  onExitLocal?: () => void;
}

const renderMark = (mark: string | null, size = 'w-10 h-10') => {
  if (mark === 'X') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${size} text-[#4f46e5] drop-shadow-[0_0_6px_rgba(99,102,241,0.55)]`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (mark === 'O') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${size} text-[#e11d6a] drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
      >
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  }
  return null;
};

const VARIANTS: { id: TicTacToeVariant; label: string }[] = [
  { id: 'tactical', label: '⚡ Tactical Shift' },
  { id: 'classic', label: '⭕ Classic Empty' },
];

export const TicTacToeGameView: React.FC<TicTacToeGameViewProps> = ({
  forceLocal = false,
  onExitLocal,
}) => {
  const {
    session,
    players,
    localPlayer,
    isMyTurn,
    currentTurnPlayer,
    timeRemaining,
    submitMove,
    submitPieceMove,
    error,
  } = useGame();

  // Local / Bot state
  const isLocalMode = forceLocal || !session;
  const [localModeType, setLocalModeType] = useState<TicTacToePlayMode>('bot');
  const [localVariant, setLocalVariant] = useState<TicTacToeVariant>(DEFAULT_TIC_TAC_TOE_VARIANT);
  const [moveRule, setMoveRule] = useState<TicTacToeMoveRule>(DEFAULT_MOVE_RULE);
  const [localBoard, setLocalBoard] = useState<TicTacToeBoard>(() => getInitialBoard(DEFAULT_TIC_TAC_TOE_VARIANT));
  const [localTurn, setLocalTurn] = useState<TicTacToeMark>('X');
  const [moveCount, setMoveCount] = useState(0);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [localScores, setLocalScores] = useState<{ x: number; o: number; draws: number }>({
    x: 0,
    o: 0,
    draws: 0,
  });
  const [botThinking, setBotThinking] = useState(false);
  const [submittingCell, setSubmittingCell] = useState<number | null>(null);

  // Local game outcome
  const localResult = evaluateBoard(localBoard, localVariant, {
    moveCount,
    toMove: localTurn,
    rule: moveRule,
  });

  // Trigger celebration on local win
  useEffect(() => {
    if (localResult.winner) {
      haptics.celebrate();
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
      haptics.pulse();
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
      if (localVariant === 'tactical') {
        const move = getBestTacticalMove(localBoard, 'O', moveRule);
        if (move) {
          soundManager.playVote();
          setLocalBoard(applyPieceMove(localBoard, move));
          setMoveCount((c) => c + 1);
          setLocalTurn('X');
        }
      } else {
        const bestMove = getBestBotMove(localBoard);
        if (bestMove >= 0 && bestMove < 9) {
          soundManager.playVote();
          setLocalBoard((prev) => {
            const next = [...prev];
            next[bestMove] = 'O';
            return next;
          });
          setMoveCount((c) => c + 1);
          setLocalTurn('X');
        }
      }
      setBotThinking(false);
    }, 420);

    return () => clearTimeout(timer);
  }, [
    isLocalMode,
    localModeType,
    localTurn,
    localBoard,
    localVariant,
    moveRule,
    localResult.winner,
    localResult.isDraw,
  ]);

  const resetLocalRound = (variant: TicTacToeVariant = localVariant) => {
    setLocalBoard(getInitialBoard(variant));
    setLocalTurn('X');
    setMoveCount(0);
    setSelectedCell(null);
    setBotThinking(false);
  };

  const handleLocalCellClick = (index: number) => {
    if (localResult.winner || localResult.isDraw || botThinking) return;
    if (localModeType === 'bot' && localTurn !== 'X') return;

    if (localVariant === 'classic') {
      if (localBoard[index] !== null) return;
      haptics.tap();
      soundManager.playVote();
      const nextBoard = [...localBoard];
      nextBoard[index] = localTurn;
      setLocalBoard(nextBoard);
      setMoveCount((c) => c + 1);
      setLocalTurn((prev) => (prev === 'X' ? 'O' : 'X'));
      return;
    }

    // Tactical: tap own piece to select, then tap a legal open square
    const cell = localBoard[index];
    if (cell === localTurn) {
      haptics.tap();
      soundManager.playTick(false);
      setSelectedCell((prev) => (prev === index ? null : index));
      return;
    }
    if (
      selectedCell !== null &&
      cell === null &&
      isLegalPieceMove(localBoard, localTurn, { from: selectedCell, to: index }, moveRule)
    ) {
      haptics.tap();
      soundManager.playVote();
      setLocalBoard(applyPieceMove(localBoard, { from: selectedCell, to: index }));
      setSelectedCell(null);
      setMoveCount((c) => c + 1);
      setLocalTurn((prev) => (prev === 'X' ? 'O' : 'X'));
    }
  };

  // -------------------------------------------------------------
  // MULTIPLAYER MODE HANDLERS
  // -------------------------------------------------------------
  const board: TicTacToeBoard = session?.game_config?.board || Array(9).fill(null);
  const playerXId = session?.game_config?.player_x_id;
  const playerOId = session?.game_config?.player_o_id;
  const playerX = players.find((p) => p.id === playerXId) || null;
  const playerO = players.find((p) => p.id === playerOId) || null;
  const winningLine = (session?.game_config?.winning_line as [number, number, number] | null) || null;
  const mpTactical = session?.game_config?.ttt_mode === 'tactical';
  const mpRule = (session?.game_config?.move_rule as TicTacToeMoveRule | undefined) || DEFAULT_MOVE_RULE;

  const localMark: TicTacToeMark | null =
    localPlayer?.playerId === playerXId ? 'X' : localPlayer?.playerId === playerOId ? 'O' : null;
  const isSpectator = !isLocalMode && localMark === null;
  const spectators = players.filter((p) => p.id !== playerXId && p.id !== playerOId);

  const handleMultiplayerCellClick = async (index: number) => {
    if (!isMyTurn || submittingCell !== null || isSpectator) return;

    if (mpTactical) {
      if (board[index] === localMark) {
        haptics.tap();
        setSelectedCell((prev) => (prev === index ? null : index));
        return;
      }
      if (selectedCell !== null && board[index] == null) {
        haptics.tap();
        setSubmittingCell(index);
        const res = await submitPieceMove(selectedCell, index);
        setSubmittingCell(null);
        if (res.success) setSelectedCell(null);
      }
      return;
    }

    if (board[index] != null) return;
    haptics.tap();
    setSubmittingCell(index);
    await submitMove(index);
    setSubmittingCell(null);
  };

  // Timer percentage (20s max)
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 20) * 100));
  const isCritical = timeRemaining < 5;
  const isUrgent = timeRemaining <= 10 && timeRemaining >= 5;

  // Unified board view-model
  const isTactical = isLocalMode ? localVariant === 'tactical' : mpTactical;
  const shownBoard = isLocalMode ? localBoard : board;
  const activeRule = isLocalMode ? moveRule : mpRule;
  const mover: TicTacToeMark | null = isLocalMode ? localTurn : isMyTurn ? localMark : null;
  const canAct = isLocalMode
    ? !localResult.winner && !localResult.isDraw && !botThinking && !(localModeType === 'bot' && localTurn !== 'X')
    : isMyTurn && submittingCell === null && !isSpectator;
  const activeSelected =
    canAct && isTactical && selectedCell !== null && shownBoard[selectedCell] === mover ? selectedCell : null;
  const destinations =
    activeSelected !== null ? getLegalDestinations(shownBoard, activeSelected, activeRule) : [];
  const shownWinLine = isLocalMode ? localResult.winningLine : winningLine;

  const xTurn = !isLocalMode ? currentTurnPlayer?.id === playerX?.id : localTurn === 'X';
  const oTurn = !isLocalMode ? currentTurnPlayer?.id === playerO?.id : localTurn === 'O';

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-3 space-y-3 animate-fade-in text-slate-800">
      {/* 1. Header Bar */}
      <div className="glass-card glow-border rounded-3xl p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {onExitLocal && isLocalMode && (
              <button
                type="button"
                onClick={onExitLocal}
                className="p-2 rounded-xl bg-white/70 border border-white hover:bg-white text-slate-700 shrink-0"
                title="Exit to Hub"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-2xl btn-neon flex items-center justify-center text-base shrink-0">
              {isTactical ? <Zap className="w-4 h-4" /> : '⭕'}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm text-[#0b2545] tracking-tight leading-tight">Tic Tac Toe</h2>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                  {isLocalMode ? (localModeType === 'bot' ? 'vs AI Bot' : 'Pass & Play') : 'Online Room'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {isTactical ? 'Tactical Shift' : 'Classic'}
                </span>
              </div>
              {isSpectator && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                  <Eye className="w-3 h-3 text-amber-500" /> Spectating Match
                </span>
              )}
            </div>
          </div>

          {!isLocalMode ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
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
              onClick={() => resetLocalRound()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/70 border border-white hover:bg-white text-[#0b2545] text-xs font-bold shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          )}
        </div>

        {!isLocalMode && (
          <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCritical ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-400 to-indigo-500'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. Mode Selectors (Local Mode Only) */}
      {isLocalMode && (
        <div className="glass-card rounded-2xl p-1.5 space-y-1.5">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setLocalModeType('bot');
                resetLocalRound();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                localModeType === 'bot' ? 'btn-neon' : 'text-slate-700 hover:bg-white/70'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>vs AI Bot</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalModeType('pass_and_play');
                resetLocalRound();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                localModeType === 'pass_and_play' ? 'btn-neon' : 'text-slate-700 hover:bg-white/70'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Pass &amp; Play</span>
            </button>
          </div>
          <div className="flex gap-1">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setLocalVariant(v.id);
                  resetLocalRound(v.id);
                }}
                className={`flex-1 py-2 px-1 rounded-xl text-[11px] font-bold ${
                  localVariant === v.id ? 'bg-[#0b2545] text-white shadow-md' : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {localVariant === 'tactical' && (
            <div className="flex gap-1">
              {(['adjacent', 'anywhere'] as TicTacToeMoveRule[]).map((rule) => (
                <button
                  key={rule}
                  type="button"
                  onClick={() => {
                    setMoveRule(rule);
                    resetLocalRound();
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold ${
                    moveRule === rule
                      ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                      : 'text-slate-600 hover:bg-white/70'
                  }`}
                >
                  {rule === 'adjacent' ? '↔ Move to neighbours' : '✦ Jump anywhere'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Players Bar (X vs O) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className={`glass-card p-2.5 rounded-2xl flex items-center gap-2 ${
            xTurn ? 'ring-2 ring-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.35)]' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-100/80 flex items-center justify-center shrink-0">
            {renderMark('X', 'w-4 h-4')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Player X</div>
            <div className="font-black text-xs text-[#0b2545] break-words leading-tight">
              {isLocalMode ? 'Player 1' : playerX?.display_name || 'Waiting...'}
            </div>
          </div>
          {isLocalMode && (
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {localScores.x}
            </span>
          )}
        </div>

        <div
          className={`glass-card p-2.5 rounded-2xl flex items-center gap-2 ${
            oTurn ? 'ring-2 ring-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.3)]' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-rose-100/80 flex items-center justify-center shrink-0">
            {renderMark('O', 'w-4 h-4')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Player O</div>
            <div className="font-black text-xs text-[#0b2545] break-words leading-tight">
              {isLocalMode
                ? localModeType === 'bot'
                  ? 'Smart Bot 🤖'
                  : 'Player 2'
                : playerO?.display_name || 'Waiting...'}
            </div>
          </div>
          {isLocalMode && (
            <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {localScores.o}
            </span>
          )}
        </div>
      </div>

      {/* 4. Main 3x3 Arena Board */}
      <div className="glass-card glow-border rounded-3xl p-4">
        {/* Turn Status Pill */}
        <div className="text-center mb-3">
          {isLocalMode ? (
            localResult.winner ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black animate-bounce">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Player {localResult.winner} Won The Match!</span>
              </div>
            ) : localResult.isDraw ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                <span>It's a Stalemate Draw!</span>
              </div>
            ) : botThinking ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold animate-pulse">
                <Bot className="w-3.5 h-3.5 animate-spin" />
                <span>Bot is calculating best move...</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 border border-white text-slate-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {localTurn === 'X'
                    ? 'Your Turn (X)'
                    : localModeType === 'bot'
                    ? "Bot's Turn (O)"
                    : "Player 2's Turn (O)"}
                  {localVariant === 'tactical' && canAct
                    ? activeSelected === null
                      ? ' — tap one of your pieces'
                      : ' — tap a glowing square'
                    : ''}
                </span>
              </div>
            )
          ) : isSpectator ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 border border-white text-slate-600 text-xs font-medium">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Spectating: <strong>{currentTurnPlayer?.display_name || '...'}</strong>'s turn
              </span>
            </div>
          ) : isMyTurn ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                YOUR TURN! ({localMark})
                {mpTactical ? (activeSelected === null ? ' — tap a piece' : ' — tap a glowing square') : ''}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 border border-white text-slate-600 text-xs font-medium">
              <span>Waiting for {currentTurnPlayer?.display_name || 'opponent'}</span>
            </div>
          )}
        </div>

        {/* 3x3 Grid Buttons */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[300px] mx-auto">
          {Array(9)
            .fill(null)
            .map((_, index) => {
              const cellValue = shownBoard[index];
              const isHighlightWin = shownWinLine?.includes(index);
              const isSelected = activeSelected === index;
              const isDestination = destinations.includes(index);
              const isOwnPiece = canAct && isTactical && cellValue !== null && cellValue === mover;
              const isClickable = isTactical ? isOwnPiece || isDestination : canAct && cellValue === null;
              const inXHome = isTactical && (HOME_LINES.X as number[]).includes(index);
              const inOHome = isTactical && (HOME_LINES.O as number[]).includes(index);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => (isLocalMode ? handleLocalCellClick(index) : handleMultiplayerCellClick(index))}
                  disabled={!isClickable}
                  className={`aspect-square rounded-2xl border-2 flex items-center justify-center relative ${
                    isHighlightWin
                      ? 'bg-amber-50 border-amber-400 ring-4 ring-amber-200/60 scale-105 shadow-md'
                      : isSelected
                      ? 'bg-white border-cyan-400 animate-piece-glow'
                      : isDestination
                      ? 'bg-cyan-50/80 border-cyan-300 border-dashed cursor-pointer'
                      : isOwnPiece
                      ? 'bg-white/90 border-indigo-300 cursor-pointer'
                      : cellValue !== null
                      ? 'bg-white/70 border-white shadow-sm'
                      : inXHome
                      ? 'bg-indigo-50/60 border-indigo-100'
                      : inOHome
                      ? 'bg-rose-50/60 border-rose-100'
                      : 'bg-white/50 border-white/80'
                  }`}
                >
                  {submittingCell === index ? (
                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  ) : cellValue !== null ? (
                    renderMark(cellValue, 'w-10 h-10 sm:w-12 sm:h-12')
                  ) : isDestination ? (
                    <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)] animate-pulse" />
                  ) : null}
                </button>
              );
            })}
        </div>

        {isTactical && (
          <p className="mt-3 text-[11px] leading-snug text-slate-600 text-center break-words">
            Move one of your pieces onto an open square. Line up your 3 pieces on any row, column or diagonal{' '}
            <strong>except your starting home row</strong> to win.
          </p>
        )}

        {/* Post-Game Action Bar for Local Mode */}
        {isLocalMode && (localResult.winner || localResult.isDraw) && (
          <div className="mt-4 pt-3 border-t border-white/70 text-center animate-fade-in">
            <button
              type="button"
              onClick={() => resetLocalRound()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full btn-neon-emerald font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Next Round</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
            {error}
          </div>
        )}
      </div>

      {/* 5. Spectators Bar (Multiplayer Mode) */}
      {!isLocalMode && spectators.length > 0 && (
        <div className="glass-card rounded-3xl p-3.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>Spectating ({spectators.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {spectators.map((p) => (
              <span
                key={p.id}
                className="px-2.5 py-1 rounded-xl bg-white/70 border border-white text-xs text-slate-700 font-medium break-words"
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
