import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { TRIVIA_CATEGORIES } from '../data/prompts';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AvatarMedallion } from './AvatarMedallion';
import { getAvatarForPlayer, extractPlayerAvatar } from '../lib/avatars';
import { haptics } from '../lib/haptics';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const TriviaGameView: React.FC = () => {
  const {
    session,
    players,
    answers,
    localPlayer,
    timeRemaining,
    localAnswer,
    submitAnswer,
    nextTriviaRound,
    resetGame,
    error,
  } = useGame();

  const [submittingAnswer, setSubmittingAnswer] = useState<string | null>(null);
  const [advancingRound, setAdvancingRound] = useState(false);
  const [endingGame, setEndingGame] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(true);

  if (!session) return null;

  const isHost = Boolean(localPlayer?.isHost);
  const categoryKey = session.category || 'general_knowledge';
  const categoryInfo = TRIVIA_CATEGORIES[categoryKey] || TRIVIA_CATEGORIES['general_knowledge'];
  const config = session.game_config || {};
  const roundNumber = config.round_number || 1;
  const phase = config.phase || 'answering';
  const isRevealed = phase === 'revealed';

  const currentPrompt = config.current_prompt || {
    id: 'default',
    prompt_text: 'Loading question...',
    options: [] as string[],
    correct_answer: undefined,
  };

  const options = (currentPrompt.options as string[] | undefined) || [];
  const correctAnswer = currentPrompt.correct_answer;

  const currentRoundAnswers = answers.filter((a) => a.round_number === roundNumber);
  const activePlayers = players.filter((p) => !p.is_eliminated);
  const totalActivePlayers = activePlayers.length;
  const totalAnswered = currentRoundAnswers.length;

  const sortedByScore = [...activePlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

  const handleAnswer = async (answer: string) => {
    if (isRevealed || submittingAnswer !== null) return;
    haptics.tap();
    setSubmittingAnswer(answer);
    await submitAnswer(answer);
    setSubmittingAnswer(null);
  };

  const handleNextRound = async () => {
    if (!isHost || advancingRound) return;
    setAdvancingRound(true);
    await nextTriviaRound();
    setAdvancingRound(false);
  };

  const handleEndGame = async () => {
    if (!isHost || endingGame) return;
    setEndingGame(true);
    await resetGame();
    setEndingGame(false);
  };

  const isLocked = Boolean(localAnswer);
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 20) * 100));
  const isCritical = timeRemaining < 5;
  const isUrgent = timeRemaining <= 10 && timeRemaining >= 5;

  const optionsGrid = (
    <>
      {options.map((option, idx) => {
        const letter = OPTION_LETTERS[idx] || String(idx + 1);
        const isSelected = localAnswer === option;
        const isCorrectOption = isRevealed && option === correctAnswer;
        const isWrongSelection = isRevealed && isSelected && option !== correctAnswer;

        return (
          <button
            key={`${option}-${idx}`}
            type="button"
            onClick={() => handleAnswer(option)}
            disabled={isLocked || isRevealed}
            className={`relative w-full p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 group flex items-start gap-3 ${
              isCorrectOption
                ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-200 text-emerald-950 font-bold'
                : isWrongSelection
                ? 'bg-rose-50 border-rose-400 text-rose-950 font-medium'
                : isSelected
                ? 'bg-blue-50 border-[#3b4cca] shadow-sm ring-2 ring-blue-100 text-[#0b2545]'
                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#3b4cca] text-slate-800 disabled:hover:border-slate-200'
            } ${isLocked && !isSelected ? 'opacity-60' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                isCorrectOption
                  ? 'bg-[#1f9d55] text-white'
                  : isWrongSelection
                  ? 'bg-rose-600 text-white'
                  : isSelected
                  ? 'bg-[#3b4cca] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 group-hover:border-[#3b4cca] group-hover:text-[#3b4cca]'
              }`}
            >
              {letter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#0b2545] leading-snug break-words whitespace-normal">
                {option}
              </div>
            </div>
            {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-[#1f9d55] shrink-0 animate-scale-in" />}
            {isWrongSelection && <XCircle className="w-5 h-5 text-rose-500 shrink-0 animate-scale-in" />}
          </button>
        );
      })}
    </>
  );

  const hostActionsContent = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleNextRound}
        disabled={advancingRound}
        className="w-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold py-3.5 rounded-full shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
      >
        {advancingRound ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Loading Next Question...
          </span>
        ) : (
          <>
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleEndGame}
        disabled={endingGame}
        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Return to Lobby</span>
      </button>
    </div>
  );

  return (
    <div
      className={`w-full max-w-lg mx-auto px-4 pt-4 space-y-4 animate-fade-in text-slate-800 ${
        !isRevealed || isHost ? 'pb-36 sm:pb-4' : 'pb-4'
      }`}
    >
      {/* 1. Header Bar: Engine, Category, Round & Timer Bar */}
      <div className="glass-card glow-border rounded-3xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{categoryInfo.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-[#0b2545] uppercase tracking-wider">
                  20-Second Challenge
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#3b4cca] font-bold border border-blue-100">
                  {categoryInfo.name}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Round {roundNumber} • {totalAnswered}/{totalActivePlayers} Answered
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

        {/* Turn Countdown Bar */}
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

      {/* 2. Main Question Card */}
      <div className="glass-card glow-border rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        {/* Status Pill */}
        <div className="text-center">
          {isRevealed ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#1f9d55] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Answers Revealed!</span>
            </div>
          ) : isLocked ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#3b4cca] text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answer locked in — waiting for group</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tap your answer fast!</span>
            </div>
          )}
        </div>

        {/* Question Text */}
        <div className="text-center py-2 px-1">
          <h2 className="text-base sm:text-xl font-black text-[#0b2545] leading-relaxed">
            {currentPrompt.prompt_text}
          </h2>
        </div>

        {/* 4 Answer Choices */}
        <div className="space-y-2.5 pt-2">{optionsGrid}</div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs text-center">
            {error}
          </div>
        )}
      </div>

      {/* 3. Live Round Scoreboard Accordion */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
        <button
          type="button"
          onClick={() => setIsScoreboardOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0b2545]"
        >
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Scores ({activePlayers.length} Players)</span>
          </div>
          {isScoreboardOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isScoreboardOpen && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            {sortedByScore.map((p, idx) => {
              const answered = currentRoundAnswers.some((a) => a.player_id === p.id);
              const isMe = p.id === localPlayer?.playerId;
              return (
                <div
                  key={p.id}
                  className={`p-2 rounded-xl flex items-center justify-between text-xs ${
                    isMe ? 'bg-blue-50/70 border border-blue-100' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-4 text-[10px]">#{idx + 1}</span>
                    <AvatarMedallion avatar={getAvatarForPlayer(p.display_name)} size="xs" />
                    <span className="font-bold text-[#0b2545]">
                      {extractPlayerAvatar(p.display_name).cleanName} {isMe ? '(You)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {answered ? (
                      <span className="text-[10px] text-[#1f9d55] font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Answered
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        Thinking...
                      </span>
                    )}
                    <span className="font-mono font-black text-xs text-[#0b2545] min-w-[28px] text-right">
                      {p.score || 0} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Host Controls */}
      {isHost && isRevealed && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          {hostActionsContent}
        </div>
      )}
    </div>
  );
};
