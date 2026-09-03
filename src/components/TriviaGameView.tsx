import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { TRIVIA_CATEGORIES } from '../data/prompts';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Trophy,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

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
  const isMobile = useIsMobile();

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

  // Avatar color generator based on player name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-pink-500 to-rose-600',
      'from-amber-500 to-orange-600',
      'from-emerald-500 to-teal-600',
      'from-cyan-500 to-blue-600',
      'from-violet-500 to-fuchsia-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleAnswer = async (option: string) => {
    // Lock in the first answer - unlike vote_reveal's "tap to change" pattern,
    // trivia disables further taps once a choice is submitted (word-chain
    // style turn-lock), so the frontend never sends a second submit under
    // normal play
    if (isRevealed || localAnswer || submittingAnswer) return;
    setSubmittingAnswer(option);
    await submitAnswer(option);
    setSubmittingAnswer(null);
  };

  const handleNextRound = async () => {
    setAdvancingRound(true);
    await nextTriviaRound();
    setAdvancingRound(false);
  };

  const handleEndGame = async () => {
    setEndingGame(true);
    await resetGame();
    setEndingGame(false);
  };

  // Timer percentage (5s max)
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 5) * 100));
  const isUrgent = timeRemaining <= 3;
  const isCritical = timeRemaining <= 1;

  const isLocked = Boolean(localAnswer) || Boolean(submittingAnswer);

  const answerOptionsContent = (
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
                ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                : isWrongSelection
                ? 'bg-gradient-to-r from-rose-950/70 to-red-950/70 border-rose-500/80'
                : isSelected
                ? 'bg-gradient-to-r from-indigo-950/80 to-blue-950/80 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-indigo-500/60 text-slate-200 disabled:hover:border-slate-800'
            } ${isLocked && !isSelected ? 'opacity-50' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition ${
                isCorrectOption
                  ? 'bg-emerald-600 text-white'
                  : isWrongSelection
                  ? 'bg-rose-600 text-white'
                  : isSelected
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
              }`}
            >
              {letter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white leading-snug">{option}</div>
            </div>
            {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-scale-in" />}
            {isWrongSelection && <XCircle className="w-5 h-5 text-rose-400 shrink-0 animate-scale-in" />}
          </button>
        );
      })}
    </>
  );

  const hostActionsContent = (
    <>
      <button
        type="button"
        onClick={handleNextRound}
        disabled={advancingRound}
        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {advancingRound ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Loading Next Question...
          </span>
        ) : (
          <>
            <span>Next Round</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleEndGame}
        disabled={endingGame}
        className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Return to Lobby</span>
      </button>
    </>
  );

  return (
    <div
      className={`w-full max-w-lg mx-auto px-4 pt-4 space-y-4 animate-fade-in ${
        !isRevealed || isHost ? 'pb-36 sm:pb-4' : 'pb-4'
      }`}
    >
      {/* 1. Header Bar: Engine, Category, Round & Timer Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{categoryInfo.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white uppercase tracking-wider">
                  5-Second Challenge
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {categoryInfo.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Round {roundNumber} • {totalAnswered}/{totalActivePlayers} Answered
              </span>
            </div>
          </div>

          {/* Timer or Status Badge */}
          {!isRevealed ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse scale-105'
                  : isUrgent
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isCritical ? 'animate-spin' : ''}`} />
              <span>{timeRemaining}s</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Revealed</span>
            </div>
          )}
        </div>

        {/* Visual Progress Countdown Bar */}
        {!isRevealed && (
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCritical
                  ? 'bg-gradient-to-r from-rose-600 to-red-500'
                  : isUrgent
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. Persistent Scoreboard - small, collapsible, visible throughout */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => setIsScoreboardOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Scoreboard</span>
          </div>
          {isScoreboardOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {isScoreboardOpen && (
          <div className="px-4 pb-3 space-y-1.5">
            {sortedByScore.map((player, idx) => {
              const isMe = player.id === localPlayer?.playerId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs ${
                    isMe ? 'bg-indigo-950/40 border border-indigo-500/30' : 'bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-5 text-center shrink-0">{medal}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 text-white bg-gradient-to-tr ${getAvatarColor(
                        player.display_name
                      )}`}
                    >
                      {player.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate font-medium text-slate-200">
                      {player.display_name} {isMe ? '(You)' : ''}
                    </span>
                  </div>
                  <span className="font-bold text-indigo-300 shrink-0">{player.score || 0} pts</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Main Game Arena Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Prompt Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>THE QUESTION</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight max-w-md mx-auto">
            {currentPrompt.prompt_text}
          </h2>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <span>{error}</span>
          </div>
        )}

        {/* --- PHASE 1: ANSWERING SCREEN --- */}
        {!isRevealed ? (
          <div className="space-y-4">
            <p className="text-center text-xs text-slate-400">
              Tap fast! You've got 5 seconds and one shot per question.
            </p>

            {/* Answer options - 2x2 grid on both mobile & desktop; pinned within
                thumb reach at the bottom on mobile via a portal (so
                backdrop-blur/transform ancestors can't hijack their fixed
                positioning) so they're reachable without scrolling */}
            {isMobile
              ? createPortal(
                  <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="grid grid-cols-2 gap-2.5 max-w-lg mx-auto">{answerOptionsContent}</div>
                  </div>,
                  document.body
                )
              : <div className="grid grid-cols-2 gap-3">{answerOptionsContent}</div>}

            {/* Answering Status Toast */}
            <div className="pt-2 text-center">
              {localAnswer ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Answer locked in! Waiting for others ({totalAnswered}/{totalActivePlayers})
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Answered so far: <strong className="text-slate-200">{totalAnswered}</strong> / {totalActivePlayers}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* --- PHASE 2: REVEAL RESULTS SCREEN --- */
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-2.5">{answerOptionsContent}</div>

            {/* Who got it right / wrong, plus running score */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                Results
              </div>
              {activePlayers.map((player) => {
                const playerAnswer = currentRoundAnswers.find((a) => a.player_id === player.id);
                const isMe = player.id === localPlayer?.playerId;

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 text-white bg-gradient-to-tr ${getAvatarColor(
                          player.display_name
                        )}`}
                      >
                        {player.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate font-medium text-slate-200">
                        {player.display_name} {isMe ? '(You)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-indigo-300 font-bold">{player.score || 0} pts</span>
                      {playerAnswer ? (
                        playerAnswer.is_correct ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No answer</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Host Actions (Next Round / End Game) - pinned within thumb reach at the
                bottom on mobile via a portal (so backdrop-blur/transform ancestors can't
                hijack their fixed positioning) so they're reachable without scrolling;
                inline on desktop, unchanged */}
            {isHost ? (
              isMobile ? (
                createPortal(
                  <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="space-y-2 max-w-lg mx-auto">{hostActionsContent}</div>
                  </div>,
                  document.body
                )
              ) : (
                <div className="space-y-2 pt-2 border-t border-slate-800">{hostActionsContent}</div>
              )
            ) : (
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping" />
                <span>Waiting for the host to start the next round...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Player Roster Status Card (answering phase only - reveal phase's
          results list above already covers per-player correctness + score) */}
      {!isRevealed && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                Player Answering Status
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {totalAnswered}/{totalActivePlayers} completed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activePlayers.map((player) => {
              const hasAnswered = currentRoundAnswers.some((a) => a.player_id === player.id);
              const isMe = player.id === localPlayer?.playerId;

              return (
                <div
                  key={player.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    hasAnswered
                      ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 text-white bg-gradient-to-tr ${getAvatarColor(
                        player.display_name
                      )}`}
                    >
                      {player.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate font-medium">
                      {player.display_name} {isMe ? '(You)' : ''}
                    </div>
                  </div>

                  {hasAnswered ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                  ) : (
                    <span className="text-[10px] text-amber-400/80 italic ml-1">Thinking</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
