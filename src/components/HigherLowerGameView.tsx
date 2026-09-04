import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { HIGHER_LOWER_CATEGORIES } from '../data/prompts';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Clock,
  AlertCircle,
  Flame,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const HigherLowerGameView: React.FC = () => {
  const {
    session,
    players,
    localPlayer,
    isMyTurn,
    currentTurnPlayer,
    timeRemaining,
    submitGuess,
    error,
    setError,
  } = useGame();

  const [submittingGuess, setSubmittingGuess] = useState<'higher' | 'lower' | null>(null);
  // Drives a brief highlight on the "last guess" card whenever a new one
  // lands via realtime, rather than a plain always-on static card - this is
  // the "reveal" beat between one player's guess and the next player's turn.
  const [justRevealed, setJustRevealed] = useState(false);
  const isMobile = useIsMobile();

  const lastGuess = session?.game_config?.last_guess;
  const lastGuessedAt = lastGuess?.guessed_at;

  useEffect(() => {
    if (!lastGuessedAt) return;
    setJustRevealed(true);
    const timer = setTimeout(() => setJustRevealed(false), 2200);
    return () => clearTimeout(timer);
  }, [lastGuessedAt]);

  // Clear any stale error/selection the instant it becomes this player's turn
  useEffect(() => {
    if (isMyTurn) {
      setError(null);
    }
  }, [isMyTurn, session?.current_turn_index, setError]);

  if (!session) return null;

  const categoryKey = session.category || 'population';
  const categoryInfo = HIGHER_LOWER_CATEGORIES[categoryKey] || HIGHER_LOWER_CATEGORIES['population'];
  const currentPrompt = session.game_config?.current_prompt;
  const guessHistory = session.game_config?.guess_history || [];

  const handleGuess = async (guess: 'higher' | 'lower') => {
    if (!isMyTurn || submittingGuess) return;
    setSubmittingGuess(guess);
    await submitGuess(guess);
    setSubmittingGuess(null);
  };

  // Turn order list with players (identical pattern to word-chain's GameView)
  const turnOrderIds = Array.isArray(session.turn_order) ? session.turn_order : [];
  const orderedPlayers = turnOrderIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  // Timer percentage (20s max, same scale/thresholds as the 20s-Second
  // Challenge trivia mode): green 20s-10s, amber 10s-5s, red under 5s
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 20) * 100));
  const isCritical = timeRemaining < 5;
  const isUrgent = timeRemaining <= 10 && timeRemaining >= 5;

  const guessButtonsContent = (
    <>
      <button
        type="button"
        onClick={() => handleGuess('higher')}
        disabled={Boolean(submittingGuess) || !isMyTurn}
        className="relative flex-1 py-6 sm:py-8 rounded-2xl border-2 bg-gradient-to-b from-emerald-950/70 to-slate-950/70 border-emerald-600/60 hover:border-emerald-500 hover:bg-emerald-950 text-emerald-300 font-black text-lg sm:text-xl transition flex flex-col items-center justify-center gap-1.5 disabled:opacity-40"
      >
        {submittingGuess === 'higher' ? (
          <div className="w-6 h-6 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <TrendingUp className="w-7 h-7" />
            <span>HIGHER</span>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => handleGuess('lower')}
        disabled={Boolean(submittingGuess) || !isMyTurn}
        className="relative flex-1 py-6 sm:py-8 rounded-2xl border-2 bg-gradient-to-b from-rose-950/70 to-slate-950/70 border-rose-600/60 hover:border-rose-500 hover:bg-rose-950 text-rose-300 font-black text-lg sm:text-xl transition flex flex-col items-center justify-center gap-1.5 disabled:opacity-40"
      >
        {submittingGuess === 'lower' ? (
          <div className="w-6 h-6 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <TrendingDown className="w-7 h-7" />
            <span>LOWER</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <div
      className={`w-full max-w-lg mx-auto px-4 pt-4 space-y-4 animate-fade-in ${
        isMyTurn ? 'pb-40 sm:pb-4' : 'pb-4'
      }`}
    >
      {/* 1. Header Bar: Category & Turn Timer Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{categoryInfo.icon}</span>
            <div>
              <span className="font-bold text-xs text-white uppercase tracking-wider">
                {categoryInfo.name}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Guess {guessHistory.length + 1}
              </span>
            </div>
          </div>

          {/* Numerical Timer Badge: Green 20s-10s, Amber 10s-5s, Red <5s (pulsing) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
              isCritical
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse scale-105'
                : isUrgent
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isCritical ? 'animate-spin' : ''}`} />
            <span>{timeRemaining}s</span>
          </div>
        </div>

        {/* Visual Progress Countdown Bar */}
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCritical
                ? 'bg-gradient-to-r from-rose-600 to-red-500'
                : isUrgent
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-400'
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Main Game Arena Card */}
      <div
        className={`rounded-3xl p-6 shadow-2xl backdrop-blur-md border transition-all duration-300 ${
          isMyTurn
            ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900/90 border-indigo-500/50 shadow-indigo-500/10 ring-2 ring-indigo-500/20'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        {/* Turn Status Banner */}
        <div className="text-center mb-5">
          {isMyTurn ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>YOUR TURN!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-400 text-xs font-medium">
              <span>Waiting for</span>
              <strong className="text-slate-200">
                {currentTurnPlayer ? currentTurnPlayer.display_name : 'Next Player'}
              </strong>
            </div>
          )}
        </div>

        {/* 3. Current Reference Number Showcase */}
        <div className="text-center py-2 mb-6">
          <div className="text-xs uppercase tracking-widest font-semibold text-slate-400 mb-2">
            {currentPrompt?.prompt_text || 'Loading number...'} is
          </div>
          <div className="inline-block p-4 rounded-3xl bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-600/30 border border-indigo-500/40 shadow-inner">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-lg">
              {currentPrompt?.numeric_value !== undefined ? currentPrompt.numeric_value.toLocaleString() : '—'}
            </span>
          </div>

          {/* Last Guess Reveal - a persistent context card (mirrors word-chain's
              "From X -> Y" hint), with a brief highlight pulse driven by
              justRevealed whenever a fresh guess lands via realtime */}
          {lastGuess && (
            <div
              className={`mt-4 mx-auto max-w-sm p-3 rounded-2xl border text-xs transition-all duration-500 ${
                justRevealed
                  ? lastGuess.correct
                    ? 'bg-emerald-950/60 border-emerald-500/60 scale-105 shadow-lg shadow-emerald-500/10'
                    : 'bg-rose-950/60 border-rose-500/60 scale-105 shadow-lg shadow-rose-500/10'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 font-semibold">
                {lastGuess.correct ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className={lastGuess.correct ? 'text-emerald-300' : 'text-rose-300'}>
                  {lastGuess.player_name} guessed {lastGuess.guess.toUpperCase()} —{' '}
                  {lastGuess.correct ? 'Correct!' : 'Wrong!'}
                </span>
              </div>
              <div className="text-slate-400 mt-1">
                {lastGuess.previous_prompt_text} was {lastGuess.previous_value.toLocaleString()} →{' '}
                {lastGuess.new_prompt_text} is {lastGuess.new_value.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* 4. HIGHER / LOWER Guess Buttons - pinned within thumb reach at the
            bottom on mobile via a portal (so backdrop-blur/transform ancestors
            can't hijack their fixed positioning); inline in the card on
            desktop, matching word-chain's input-form placement pattern */}
        {isMyTurn ? (
          isMobile ? (
            createPortal(
              <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-indigo-500/30 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="max-w-lg mx-auto flex gap-3">{guessButtonsContent}</div>
              </div>,
              document.body
            )
          ) : (
            <div className="flex gap-3">{guessButtonsContent}</div>
          )
        ) : (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-1">
            <div className="text-xs text-slate-400">
              {currentTurnPlayer
                ? `${currentTurnPlayer.display_name} is deciding...`
                : 'Waiting for player...'}
            </div>
            <div className="text-[11px] text-slate-500">
              Get ready! Your turn is coming up next.
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mt-3 p-3 bg-rose-950/50 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 5. Player Roster Bar (Active vs Eliminated) - identical structure to
          word-chain's GameView roster */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-lg backdrop-blur-sm">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          Turn Rotation & Status
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {orderedPlayers.map((player) => {
            if (!player) return null;
            const isTurn = player.id === currentTurnPlayer?.id;
            const isMe = player.id === localPlayer?.playerId;
            const isElim = player.is_eliminated;

            return (
              <div
                key={player.id}
                className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                  isElim
                    ? 'bg-slate-950/40 border-slate-850 text-slate-600 opacity-60 line-through'
                    : isTurn
                    ? 'bg-indigo-950/50 border-indigo-500 text-white ring-1 ring-indigo-500/50 shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isElim
                        ? 'bg-slate-800 text-slate-500'
                        : isTurn
                        ? 'bg-indigo-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {player.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate font-medium">
                    {player.display_name} {isMe ? '(You)' : ''}
                  </div>
                </div>

                {isElim && (
                  <span className="text-[10px] text-rose-400 no-underline font-semibold ml-1">
                    OUT
                  </span>
                )}
                {isTurn && !isElim && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping ml-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
