import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { HIGHER_LOWER_CATEGORIES } from '../data/prompts';
import {
  Clock,
  Flame,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Scale,
  RotateCcw,
} from 'lucide-react';
import { AvatarMedallion } from './AvatarMedallion';
import { getAvatarForPlayer, extractPlayerAvatar } from '../lib/avatars';
import { haptics } from '../lib/haptics';

export const HigherLowerGameView: React.FC = () => {
  const {
    session,
    players,
    localPlayer,
    isMyTurn,
    currentTurnPlayer,
    timeRemaining,
    submitGuess,
    resetGame,
    error,
    setError,
  } = useGame();

  const [submittingGuess, setSubmittingGuess] = useState<'higher' | 'lower' | null>(null);
  const [returningToLobby, setReturningToLobby] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);

  const lastGuess = session?.game_config?.last_guess;
  const lastGuessedAt = lastGuess?.guessed_at;

  useEffect(() => {
    if (!lastGuessedAt) return;
    setJustRevealed(true);
    const timer = setTimeout(() => setJustRevealed(false), 2200);
    return () => clearTimeout(timer);
  }, [lastGuessedAt]);

  useEffect(() => {
    if (isMyTurn) {
      setError(null);
    }
  }, [isMyTurn, session?.current_turn_index, setError]);

  if (!session) return null;

  const categoryKey = session.category || 'random_numbers';
  const categoryInfo = HIGHER_LOWER_CATEGORIES[categoryKey] || HIGHER_LOWER_CATEGORIES['random_numbers'];
  const currentValue = session.game_config?.current_value;
  const guessHistory = session.game_config?.guess_history || [];

  const handleGuess = async (guess: 'higher' | 'lower') => {
    if (!isMyTurn || submittingGuess) return;
    haptics.tap();
    setSubmittingGuess(guess);
    await submitGuess(guess);
    setSubmittingGuess(null);
  };

  const handleReturnToLobby = async () => {
    setReturningToLobby(true);
    await resetGame();
    setReturningToLobby(false);
  };

  const turnOrderIds = Array.isArray(session.turn_order) ? session.turn_order : [];
  const orderedPlayers = turnOrderIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is (typeof players)[0] => Boolean(p));

  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 20) * 100));
  const isCritical = timeRemaining < 5;
  const isUrgent = timeRemaining <= 10 && timeRemaining >= 5;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-4 animate-fade-in text-slate-800">
      {/* 1. Header Bar: Category, Turn Timer */}
      <div className="glass-card glow-border rounded-3xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{categoryInfo.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-[#0b2545] uppercase tracking-wider">
                  Higher or Lower
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#3b4cca] font-bold border border-blue-100">
                  {categoryInfo.name}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {guessHistory.length} guesses so far • Elimination Mode
              </span>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
              isCritical
                ? 'bg-rose-50 text-rose-700 border border-rose-300 animate-pulse'
                : isUrgent
                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isCritical ? 'animate-spin' : ''}`} />
            <span>{timeRemaining}s</span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
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
      </div>

      {/* 2. Main Guess Arena Card */}
      <div
        className={`glass-card glow-border rounded-3xl p-5 sm:p-6 shadow-sm border transition-all duration-300 ${
          isMyTurn ? 'border-[#3b4cca] shadow-md ring-2 ring-blue-100' : 'border-slate-200'
        }`}
      >
        {/* Turn Status Banner */}
        <div className="text-center mb-4">
          {isMyTurn ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#3b4cca] text-xs font-bold animate-pulse">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>YOUR TURN! Higher or Lower?</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
              <span>Waiting for</span>
              <strong className="text-[#0b2545]">
                {currentTurnPlayer ? currentTurnPlayer.display_name : 'Next Player'}
              </strong>
            </div>
          )}
        </div>

        {/* Current Benchmark Value Display */}
        <div className="text-center py-4 px-2 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Current Benchmark
          </span>
          <div className="text-xs sm:text-sm font-semibold text-slate-600">
            {currentValue?.label || 'Target Value'}
          </div>
          <div className="inline-block p-4 sm:p-5 rounded-3xl bg-gradient-to-tr from-blue-50 to-indigo-100 border border-blue-200 shadow-inner">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-[#0b2545]">
              {currentValue ? currentValue.value.toLocaleString() : '---'}
            </span>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Will the next value be higher or lower?
          </p>
        </div>

        {/* Guess Buttons (Higher vs Lower) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleGuess('higher')}
            disabled={!isMyTurn || submittingGuess !== null}
            className="w-full py-4 px-3 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm sm:text-base shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            <span>HIGHER</span>
          </button>

          <button
            type="button"
            onClick={() => handleGuess('lower')}
            disabled={!isMyTurn || submittingGuess !== null}
            className="w-full py-4 px-3 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-sm sm:text-base shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <TrendingDown className="w-5 h-5 stroke-[2.5]" />
            <span>LOWER</span>
          </button>
        </div>

        {/* Last Guess Reveal Feedback */}
        {lastGuess && (
          <div
            className={`mt-4 p-3 rounded-2xl border text-xs flex items-center justify-between transition-all ${
              justRevealed ? 'ring-2 ring-blue-300 scale-[1.01]' : ''
            } ${
              lastGuess.outcome === 'correct'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : lastGuess.outcome === 'incorrect'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {lastGuess.outcome === 'correct' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : lastGuess.outcome === 'incorrect' ? (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Scale className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-semibold break-words">
                {lastGuess.player_name} guessed {lastGuess.guess.toUpperCase()}
              </span>
            </div>
            <span className="font-mono font-bold text-[11px] shrink-0">
              {lastGuess.new_value.toLocaleString()} ({lastGuess.outcome.toUpperCase()})
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
            {error}
          </div>
        )}
      </div>

      {/* 3. Turn Order Roster Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
          Player Turn Order
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {orderedPlayers.map((player) => {
            const isTurn = currentTurnPlayer?.id === player.id;
            const isElim = player.is_eliminated;
            const isMe = player.id === localPlayer?.playerId;

            return (
              <div
                key={player.id}
                className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                  isElim
                    ? 'bg-slate-50 border-slate-200 opacity-50 line-through'
                    : isTurn
                    ? 'bg-blue-50 border-[#3b4cca] text-[#3b4cca] font-bold ring-2 ring-blue-100 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AvatarMedallion
                    avatar={getAvatarForPlayer(player.display_name)}
                    size="xs"
                    showGlow={isTurn && !isElim}
                  />
                  <span className="break-words font-semibold">
                    {extractPlayerAvatar(player.display_name).cleanName} {isMe ? '(You)' : ''}
                  </span>
                </div>
                {isElim && <span className="text-[10px] text-rose-600 font-bold ml-1">OUT</span>}
                {isTurn && !isElim && (
                  <span className="w-2 h-2 rounded-full bg-[#3b4cca] animate-ping ml-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Return to Lobby on error */}
      {error && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleReturnToLobby}
            disabled={returningToLobby}
            className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to Lobby</span>
          </button>
        </div>
      )}
    </div>
  );
};
