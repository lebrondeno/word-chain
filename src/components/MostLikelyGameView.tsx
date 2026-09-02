import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { MOST_LIKELY_CATEGORIES } from '../data/prompts';
import { useIsMobile } from '../hooks/useIsMobile';
import type { PlayerOption } from '../types/game';
import {
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

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
  const isMobile = useIsMobile();

  if (!session) return null;

  const isHost = Boolean(localPlayer?.isHost);
  const categoryKey = session.category || 'general';
  const categoryInfo = MOST_LIKELY_CATEGORIES[categoryKey] || MOST_LIKELY_CATEGORIES['general'];
  const config = session.game_config || {};
  const roundNumber = config.round_number || 1;
  const votingPhase = config.voting_phase || 'voting';
  const isRevealed = votingPhase === 'revealed';

  // Current prompt. Options are players to vote for rather than fixed text;
  // fall back to the live active player roster if the config hasn't got any yet.
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

  // Round votes
  const currentRoundVotes = votes.filter((v) => v.round_number === roundNumber);
  const totalActivePlayers = activePlayers.length;
  const totalVotesCast = currentRoundVotes.length;

  // Tally votes per player, most-voted first
  const tally = promptOptions
    .map((opt) => ({
      option: opt,
      voteCount: currentRoundVotes.filter((v) => v.choice === opt.id).length,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

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

  const handleVote = async (playerId: string) => {
    if (isRevealed || submittingVote) return;
    setSubmittingVote(playerId);
    await submitVote(playerId);
    setSubmittingVote(null);
  };

  const handleNextRound = async () => {
    setAdvancingRound(true);
    await nextVoteRound();
    setAdvancingRound(false);
  };

  const handleEndGame = async () => {
    setEndingGame(true);
    await resetGame();
    setEndingGame(false);
  };

  // Timer percentage (20s max)
  const timerPercent = Math.min(100, Math.max(0, (timeRemaining / 20) * 100));
  const isUrgent = timeRemaining <= 6;
  const isCritical = timeRemaining <= 3;

  const voteOptionsContent = (
    <>
      {promptOptions.map((opt) => {
        const isMe = opt.id === localPlayer?.playerId;
        const isSelected = localVote === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleVote(opt.id)}
            disabled={Boolean(submittingVote)}
            className={`relative w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 group flex items-center gap-3.5 ${
              isSelected
                ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-indigo-500/60 text-slate-200'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                opt.display_name
              )} flex items-center justify-center font-black text-sm shrink-0 text-white shadow-md`}
            >
              {opt.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-white truncate">
                {opt.display_name} {isMe ? '(You)' : ''}
              </div>
              <div className="text-[11px] text-slate-400">
                {isSelected ? 'Your pick (Tap to change)' : 'Tap to vote'}
              </div>
            </div>
            {isSelected && (
              <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0 animate-scale-in" />
            )}
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
            Loading Next Prompt...
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
                  Who's Most Likely
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {categoryInfo.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Round {roundNumber} • {totalVotesCast}/{totalActivePlayers} Voted
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

      {/* 2. Main Game Arena Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Prompt Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>THE PROMPT</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight max-w-md mx-auto">
            {currentPrompt.prompt_text}
          </h2>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <span>{error}</span>
          </div>
        )}

        {/* --- PHASE 1: VOTING SCREEN --- */}
        {!isRevealed ? (
          <div className="space-y-4">
            <p className="text-center text-xs text-slate-400">
              Tap whoever fits best. Votes remain secret until everyone has chosen!
            </p>

            {/* Vote options - pinned within thumb reach at the bottom on mobile via a
                portal (so backdrop-blur/transform ancestors can't hijack their fixed
                positioning) so they're reachable without scrolling; inline in the card
                on desktop, unchanged */}
            {isMobile
              ? createPortal(
                  <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2.5 max-w-lg mx-auto">{voteOptionsContent}</div>
                  </div>,
                  document.body
                )
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{voteOptionsContent}</div>}

            {/* Voting Status Toast */}
            <div className="pt-2 text-center">
              {localVote ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Your vote is saved! Waiting for remaining players ({totalVotesCast}/{totalActivePlayers})
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Votes submitted so far: <strong className="text-slate-200">{totalVotesCast}</strong> / {totalActivePlayers}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* --- PHASE 2: REVEAL RESULTS SCREEN --- */
          <div className="space-y-3 animate-fade-in">
            {tally.map(({ option, voteCount }) => {
              const percent = totalVotesCast > 0 ? Math.round((voteCount / totalVotesCast) * 100) : 0;
              const isMe = option.id === localPlayer?.playerId;
              const votedForThem = currentRoundVotes.filter((v) => v.choice === option.id);

              return (
                <div
                  key={option.id}
                  className={`p-3.5 rounded-2xl border ${
                    localVote === option.id
                      ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${getAvatarColor(
                        option.display_name
                      )} flex items-center justify-center text-xs font-bold text-white shrink-0`}
                    >
                      {option.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-bold text-white truncate">
                        {option.display_name} {isMe ? '(You)' : ''}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-indigo-300 shrink-0">
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'} • {percent}%
                    </div>
                  </div>

                  {/* Proportional vote bar */}
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-700`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Who voted for them */}
                  {votedForThem.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {votedForThem.map((v) => {
                        const voter = players.find((p) => p.id === v.player_id);
                        const name = voter?.display_name || 'Anonymous';
                        const voterIsMe = v.player_id === localPlayer?.playerId;
                        return (
                          <span
                            key={v.player_id}
                            className={`text-[10px] px-2 py-0.5 rounded-lg border ${
                              voterIsMe
                                ? 'bg-indigo-600/30 border-indigo-500/60 text-white font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {name} {voterIsMe ? '(You)' : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

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

      {/* 3. Player Roster Status Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
              Player Voting Status
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {totalVotesCast}/{totalActivePlayers} completed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {activePlayers.map((player) => {
            const hasVoted = currentRoundVotes.some((v) => v.player_id === player.id);
            const isMe = player.id === localPlayer?.playerId;

            return (
              <div
                key={player.id}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  hasVoted
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

                {hasVoted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                ) : (
                  <span className="text-[10px] text-amber-400/80 italic ml-1">Voting</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
