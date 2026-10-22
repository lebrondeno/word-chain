import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { MOST_LIKELY_CATEGORIES } from '../data/prompts';
import type { PlayerOption } from '../types/game';
import {
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { AvatarMedallion } from './AvatarMedallion';
import { getAvatarForPlayer, extractPlayerAvatar } from '../lib/avatars';
import { haptics } from '../lib/haptics';

export const MostLikelyGameView: React.FC = () => {
  const {
    session,
    players,
    votes,
    localPlayer,
    timeRemaining,
    localVote,
    submitVote,
    nextVoteRound,
    resetGame,
    error,
  } = useGame();

  const [submittingVote, setSubmittingVote] = useState<string | null>(null);
  const [advancingRound, setAdvancingRound] = useState(false);
  const [endingGame, setEndingGame] = useState(false);

  if (!session) return null;

  const isHost = Boolean(localPlayer?.isHost);
  const categoryKey = session.category || 'general';
  const categoryInfo = MOST_LIKELY_CATEGORIES[categoryKey] || MOST_LIKELY_CATEGORIES['general'];
  const config = session.game_config || {};
  const roundNumber = config.round_number || 1;
  const votingPhase = config.voting_phase || 'voting';
  const isRevealed = votingPhase === 'revealed';

  const currentPrompt = config.current_prompt || {
    id: 'default',
    prompt_text: "Who's most likely to become famous one day?",
    options: null,
  };

  const activePlayers = players.filter((p) => !p.is_eliminated);
  const promptOptions: PlayerOption[] =
    Array.isArray(currentPrompt.options) && currentPrompt.options.length > 0
      ? (currentPrompt.options as PlayerOption[])
      : activePlayers.map((p) => ({ id: p.id, display_name: p.display_name }));

  const currentRoundVotes = votes.filter((v) => v.round_number === roundNumber);
  const totalActivePlayers = activePlayers.length;
  const totalVotesCast = currentRoundVotes.length;

  const tally = promptOptions
    .map((opt) => ({
      option: opt,
      voteCount: currentRoundVotes.filter((v) => v.choice === opt.id).length,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

  const handleVote = async (choiceId: string) => {
    if (isRevealed || submittingVote !== null) return;
    haptics.tap();
    setSubmittingVote(choiceId);
    await submitVote(choiceId);
    setSubmittingVote(null);
  };

  const handleNextRound = async () => {
    if (!isHost || advancingRound) return;
    setAdvancingRound(true);
    await nextVoteRound();
    setAdvancingRound(false);
  };

  const handleEndGame = async () => {
    if (!isHost || endingGame) return;
    setEndingGame(true);
    await resetGame();
    setEndingGame(false);
  };

  const isLocked = Boolean(localVote);
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 20) * 100));
  const isCritical = timeRemaining < 5;
  const isUrgent = timeRemaining <= 10 && timeRemaining >= 5;

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
                  Who's Most Likely
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#3b4cca] font-bold border border-blue-100">
                  {categoryInfo.name}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Round {roundNumber} • {totalVotesCast}/{totalActivePlayers} Voted
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

      {/* 2. Main Question Card */}
      <div className="glass-card glow-border rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        {/* Status Pill */}
        <div className="text-center">
          {isRevealed ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#1f9d55] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Results Revealed!</span>
            </div>
          ) : isLocked ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#3b4cca] text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Vote locked in — waiting for others</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Vote for the person who fits best!</span>
            </div>
          )}
        </div>

        {/* Prompt Heading */}
        <div className="text-center py-2 px-1">
          <h2 className="text-base sm:text-xl font-black text-[#0b2545] leading-relaxed">
            {currentPrompt.prompt_text}
          </h2>
        </div>

        {/* Player Choices Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          {promptOptions.map((opt) => {
            const isSelected = localVote === opt.id;
            const voteCount = currentRoundVotes.filter((v) => v.choice === opt.id).length;
            const percent = totalVotesCast > 0 ? Math.round((voteCount / totalVotesCast) * 100) : 0;
            const isTop = isRevealed && tally[0]?.option.id === opt.id && voteCount > 0;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleVote(opt.id)}
                disabled={isLocked || isRevealed}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between gap-3 ${
                  isTop
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-200 shadow-sm'
                    : isSelected
                    ? 'bg-blue-50 border-[#3b4cca] ring-2 ring-blue-100 shadow-sm'
                    : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#3b4cca]'
                } ${isLocked && !isSelected ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AvatarMedallion
                    avatar={getAvatarForPlayer(opt.display_name)}
                    size="sm"
                    showGlow={isSelected}
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#0b2545] break-words">
                      {extractPlayerAvatar(opt.display_name).cleanName} {opt.id === localPlayer?.playerId ? '(You)' : ''}
                    </div>
                    {isRevealed && (
                      <div className="text-[11px] text-slate-500 font-medium">
                        {voteCount} vote{voteCount !== 1 ? 's' : ''} ({percent}%)
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-[#3b4cca] shrink-0" />
                )}
                {isTop && (
                  <span className="text-base shrink-0">👑</span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs text-center">
            {error}
          </div>
        )}
      </div>

      {/* 3. Host Action Bar */}
      {isHost && isRevealed && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2">
          <button
            type="button"
            onClick={handleNextRound}
            disabled={advancingRound}
            className="w-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold py-3.5 rounded-full shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {advancingRound ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Next Prompt...
              </span>
            ) : (
              <>
                <span>Next Prompt</span>
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
      )}
    </div>
  );
};
