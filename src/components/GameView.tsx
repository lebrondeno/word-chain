import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { CATEGORIES, validateWordSubmission } from '../data';
import { WordHistoryDrawer } from './WordHistoryDrawer';
import { VoteRevealGameView } from './VoteRevealGameView';
import { MostLikelyGameView } from './MostLikelyGameView';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react';

export const GameView: React.FC = () => {
  const {
    session,
    players,
    localPlayer,
    isMyTurn,
    currentTurnPlayer,
    timeRemaining,
    submitWord,
    error,
    setError,
  } = useGame();

  const [inputWord, setInputWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<{ valid: boolean; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Auto-focus input when it becomes user's turn
  useEffect(() => {
    if (isMyTurn) {
      setInputWord('');
      setLocalFeedback(null);
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isMyTurn, session?.current_turn_index, setError]);

  if (!session) return null;

  // Delegate to VoteRevealGameView for vote_reveal game engine
  if (session.game_type === 'vote_reveal') {
    return <VoteRevealGameView />;
  }

  // Delegate to MostLikelyGameView for most_likely game engine
  if (session.game_type === 'most_likely') {
    return <MostLikelyGameView />;
  }

  const categoryInfo = CATEGORIES[session.category] || CATEGORIES['cities'];
  const requiredLetter = session.last_letter ? session.last_letter.toUpperCase() : null;

  // Realtime instant input validation hint
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputWord(val);

    if (val.trim().length === 0) {
      setLocalFeedback(null);
      return;
    }

    const check = validateWordSubmission(
      val,
      session.category,
      session.last_letter,
      session.used_words
    );

    if (check.valid) {
      setLocalFeedback({
        valid: true,
        message: `Valid ${categoryInfo.name}! Next letter: ${check.nextLastLetter}`,
      });
    } else {
      setLocalFeedback({
        valid: false,
        message: check.error || 'Invalid word',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim() || submitting || !isMyTurn) return;

    setSubmitting(true);
    const res = await submitWord(inputWord.trim());
    setSubmitting(false);

    if (res.success) {
      setInputWord('');
      setLocalFeedback(null);
    }
  };

  // Turn order list with players
  const turnOrderIds = Array.isArray(session.turn_order) ? session.turn_order : [];
  const orderedPlayers = turnOrderIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  // Last submitted word info
  const usedWordsList = session.used_words || [];
  const lastSubmittedItem = usedWordsList.length > 0 ? usedWordsList[usedWordsList.length - 1] : null;
  const lastSubmittedWord = lastSubmittedItem
    ? typeof lastSubmittedItem === 'string'
      ? lastSubmittedItem
      : lastSubmittedItem.display_word || lastSubmittedItem.word
    : null;

  // Timer percentage (30s max duration)
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 30) * 100));
  // Color-shift thresholds: green 30s→15s, amber 15s→7s, red under 7s (pulsing)
  const isRed = timeRemaining < 7;
  const isAmber = timeRemaining >= 7 && timeRemaining <= 15;

  const wordInputContent = (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputWord}
          onChange={handleInputChange}
          disabled={submitting}
          placeholder={
            requiredLetter
              ? `Enter ${categoryInfo.name.toLowerCase()} starting with "${requiredLetter}"...`
              : `Enter any ${categoryInfo.name.toLowerCase()}...`
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className="w-full bg-slate-950 border-2 border-indigo-500/70 focus:border-indigo-400 rounded-2xl px-4 py-3.5 text-base sm:text-lg font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition shadow-inner"
        />
        <button
          type="submit"
          disabled={submitting || !inputWord.trim()}
          className="absolute right-2 top-2 bottom-2 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-40"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Submit</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Instant Validation Hint */}
      {localFeedback && (
        <div
          className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
            localFeedback.valid
              ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-800/40'
              : 'text-rose-300 bg-rose-950/40 border border-rose-800/40'
          }`}
        >
          {localFeedback.valid ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span>{localFeedback.message}</span>
        </div>
      )}
    </>
  );

  return (
    <div
      className={`w-full max-w-lg mx-auto px-4 pt-4 space-y-4 animate-fade-in ${
        isMyTurn ? 'pb-32 sm:pb-4' : 'pb-4'
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
                Round {usedWordsList.length + 1}
              </span>
            </div>
          </div>

          {/* Numerical Timer Badge: Green 30s-15s, Amber 15s-7s, Red <7s (pulsing) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
              isRed
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse scale-105'
                : isAmber
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isRed ? 'animate-spin' : ''}`} />
            <span>{timeRemaining}s</span>
          </div>
        </div>

        {/* Visual Progress Countdown Bar */}
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isRed
                ? 'bg-gradient-to-r from-rose-600 to-red-500'
                : isAmber
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

        {/* 3. Target Letter / Word Connection Showcase */}
        <div className="text-center py-2 mb-6">
          {requiredLetter ? (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-widest font-semibold text-slate-400">
                Word Must Start With
              </div>
              <div className="inline-block p-4 rounded-3xl bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-600/30 border border-indigo-500/40 shadow-inner">
                <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-lg">
                  {requiredLetter}
                </span>
              </div>
              {lastSubmittedWord && (
                <div className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                  <span>From</span>
                  <span className="font-semibold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    {lastSubmittedWord}
                  </span>
                  <span>➔</span>
                  <span className="font-bold text-amber-400">{requiredLetter}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 py-4">
              <div className="text-4xl">🚀</div>
              <h3 className="font-bold text-white text-base">First Word of the Chain!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Enter any valid {categoryInfo.name.toLowerCase()} to start the letter chain.
              </p>
            </div>
          )}
        </div>

        {/* 4. Active Player Input Form - pinned within thumb reach at the bottom on
            mobile via a portal (so backdrop-blur/transform ancestors can't hijack its
            fixed positioning) so it's reachable without scrolling; inline in the card
            on desktop, unchanged */}
        {isMyTurn ? (
          isMobile ? (
            createPortal(
              <form
                onSubmit={handleSubmit}
                className="space-y-3 fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-indigo-500/30 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
              >
                <div className="max-w-lg mx-auto space-y-3">{wordInputContent}</div>
              </form>,
              document.body
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {wordInputContent}
            </form>
          )
        ) : (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-1">
            <div className="text-xs text-slate-400">
              {currentTurnPlayer
                ? `${currentTurnPlayer.display_name} is typing...`
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

      {/* 5. Player Roster Bar (Active vs Eliminated) */}
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

      {/* 6. Word History Drawer */}
      <WordHistoryDrawer usedWords={usedWordsList} category={session.category} />
    </div>
  );
};
