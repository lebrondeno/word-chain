import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { CATEGORIES, validateWordSubmission } from '../data';
import { WordHistoryDrawer } from './WordHistoryDrawer';
import { VoteRevealGameView } from './VoteRevealGameView';
import { MostLikelyGameView } from './MostLikelyGameView';
import { TriviaGameView } from './TriviaGameView';
import { HigherLowerGameView } from './HigherLowerGameView';
import { TicTacToeGameView } from './TicTacToeGameView';
import type { GameSession } from '../types/game';
import {
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { AvatarMedallion } from './AvatarMedallion';
import { getAvatarForPlayer, extractPlayerAvatar } from '../lib/avatars';
import { haptics } from '../lib/haptics';

interface WordChainGameViewProps {
  session: GameSession;
}

const WordChainGameView: React.FC<WordChainGameViewProps> = ({ session }) => {
  const {
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

  const categoryInfo = CATEGORIES[session.category] || CATEGORIES['cities'];
  const requiredLetter = session.last_letter ? session.last_letter.toUpperCase() : null;

  // Auto-focus input when it becomes user's turn
  useEffect(() => {
    if (isMyTurn) {
      const timer = setTimeout(() => {
        setInputWord('');
        setLocalFeedback(null);
        setError(null);
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isMyTurn, session.current_turn_index, setError]);

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
      haptics.success();
      setInputWord('');
      setLocalFeedback(null);
    } else {
      haptics.warning();
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
  const isRed = timeRemaining < 7;
  const isAmber = timeRemaining >= 7 && timeRemaining <= 15;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-4 animate-fade-in text-slate-800">
      {/* 1. Header Bar: Category & Turn Timer Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{categoryInfo.icon}</span>
            <div>
              <span className="font-black text-xs text-[#0b2545] uppercase tracking-wider">
                {categoryInfo.name}
              </span>
              <span className="text-[10px] text-slate-500 block font-medium">
                Round {usedWordsList.length + 1}
              </span>
            </div>
          </div>

          {/* Numerical Timer Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all border ${
              isRed
                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse scale-105'
                : isAmber
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isRed ? 'animate-spin' : ''}`} />
            <span>{timeRemaining}s</span>
          </div>
        </div>

        {/* Visual Progress Countdown Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isRed
                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                : isAmber
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-[#1f9d55] to-[#3b4cca]'
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Main Game Arena Card */}
      <div
        className={`glass-card glow-border rounded-3xl p-6 shadow-sm border transition-all duration-300 ${
          isMyTurn
            ? 'border-[#3b4cca] shadow-md ring-2 ring-blue-100'
            : 'border-slate-200'
        }`}
      >
        {/* Turn Status Banner */}
        <div className="text-center mb-5">
          {isMyTurn ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#3b4cca] text-xs font-bold animate-pulse">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>YOUR TURN!</span>
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

        {/* 3. Target Letter / Word Connection Showcase */}
        <div className="text-center py-2 mb-6">
          {requiredLetter ? (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Word Must Start With
              </div>
              <div className="inline-block p-4 sm:p-5 rounded-3xl bg-gradient-to-tr from-blue-50 to-indigo-100 border border-blue-200 shadow-inner">
                <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-[#0b2545]">
                  {requiredLetter}
                </span>
              </div>

              {lastSubmittedWord && (
                <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1.5 font-medium">
                  <span>From</span>
                  <span className="font-bold text-[#3b4cca] bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                    {lastSubmittedWord}
                  </span>
                  <span>➔</span>
                  <span className="font-black text-amber-600">{requiredLetter}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <div className="text-4xl">🚀</div>
              <h3 className="font-bold text-[#0b2545] text-base">First Word of the Chain!</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Enter any valid {categoryInfo.name.toLowerCase()} to start the letter chain.
              </p>
            </div>
          )}
        </div>

        {/* 4. Active Player Input Form */}
        {isMyTurn ? (
          <form onSubmit={handleSubmit} className="space-y-3">
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
                className="w-full bg-[#f8fafc] border-2 border-slate-300 focus:border-[#3b4cca] rounded-2xl px-4 py-3.5 text-base sm:text-lg font-bold text-[#0b2545] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-inner"
              />
              <button
                type="submit"
                disabled={submitting || !inputWord.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 bg-[#1f9d55] hover:bg-[#178044] text-white rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm disabled:opacity-40"
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
                className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  localFeedback.valid
                    ? 'text-[#1f9d55] bg-emerald-50 border-emerald-200'
                    : 'text-rose-600 bg-rose-50 border-rose-200'
                }`}
              >
                {localFeedback.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1f9d55] shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                )}
                <span className="font-semibold">{localFeedback.message}</span>
              </div>
            )}
          </form>
        ) : (
          <div className="p-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-center space-y-1">
            <div className="text-xs text-slate-500 font-medium">
              {currentTurnPlayer
                ? `${currentTurnPlayer.display_name} is typing...`
                : 'Waiting for player...'}
            </div>
            <div className="text-[11px] text-slate-400">
              Get ready! Your turn is coming up next.
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 5. Player Roster Bar (Active vs Eliminated) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
          Turn Rotation &amp; Status
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
                className={`p-2.5 rounded-2xl border transition-all text-xs flex items-center justify-between shadow-2xs ${
                  isElim
                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 line-through'
                    : isTurn
                    ? 'bg-blue-50/80 border-[#3b4cca] text-[#0b2545] font-bold ring-1 ring-blue-300'
                    : 'bg-[#f8fafc] border-slate-200 text-slate-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <AvatarMedallion
                    avatar={getAvatarForPlayer(player.display_name)}
                    size="xs"
                    showGlow={isTurn && !isElim}
                  />
                  <div className="break-words font-medium">
                    {extractPlayerAvatar(player.display_name).cleanName} {isMe ? '(You)' : ''}
                  </div>
                </div>

                {isElim && (
                  <span className="text-[10px] text-rose-500 no-underline font-bold ml-1">
                    OUT
                  </span>
                )}
                {isTurn && !isElim && (
                  <span className="w-2 h-2 rounded-full bg-[#3b4cca] animate-ping ml-1" />
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

export const GameView: React.FC = () => {
  const { session } = useGame();

  if (!session) return null;

  switch (session.game_type) {
    case 'vote_reveal':
      return <VoteRevealGameView />;
    case 'most_likely':
      return <MostLikelyGameView />;
    case 'trivia':
      return <TriviaGameView />;
    case 'higher_lower':
      return <HigherLowerGameView />;
    case 'tic_tac_toe':
      return <TicTacToeGameView />;
    case 'word_chain':
    default:
      return <WordChainGameView session={session} />;
  }
};
