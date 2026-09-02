import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { VOTE_REVEAL_CATEGORIES } from '../data/prompts';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

export const VoteRevealGameView: React.FC = () => {
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
  const categoryInfo = VOTE_REVEAL_CATEGORIES[categoryKey] || VOTE_REVEAL_CATEGORIES['general'];
  const config = session.game_config || {};
  const roundNumber = config.round_number || 1;
  const votingPhase = config.voting_phase || 'voting';
  const isRevealed = votingPhase === 'revealed';

  // Current prompt
  const currentPrompt = config.current_prompt || {
    id: 'default',
    prompt_text: 'Would you rather always be 10 minutes late or always be 20 minutes early?',
    options: ['Always 10 minutes late', 'Always 20 minutes early'] as [string, string],
  };

  const optionA = currentPrompt.options?.[0] || 'Option A';
  const optionB = currentPrompt.options?.[1] || 'Option B';

  // Round votes
  const currentRoundVotes = votes.filter((v) => v.round_number === roundNumber);
  const activePlayers = players.filter((p) => !p.is_eliminated);
  const totalActivePlayers = activePlayers.length;
  const totalVotesCast = currentRoundVotes.length;

  const votesForA = currentRoundVotes.filter((v) => v.choice === 'A' || v.choice === optionA);
  const votesForB = currentRoundVotes.filter((v) => v.choice === 'B' || v.choice === optionB);

  const percentA = totalVotesCast > 0 ? Math.round((votesForA.length / totalVotesCast) * 100) : 50;
  const percentB = totalVotesCast > 0 ? 100 - percentA : 50;

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

  const handleVote = async (choiceKey: 'A' | 'B') => {
    if (isRevealed || submittingVote) return;
    setSubmittingVote(choiceKey);
    await submitVote(choiceKey);
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
      {/* Option A Button */}
      <button
        type="button"
        onClick={() => handleVote('A')}
        disabled={Boolean(submittingVote)}
        className={`relative w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 group flex items-start gap-4 ${
          localVote === 'A'
            ? 'bg-gradient-to-r from-indigo-950/80 to-blue-950/80 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
            : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-indigo-500/60 text-slate-200'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition ${
            localVote === 'A'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
          }`}
        >
          A
        </div>
        <div className="flex-1">
          <div className="text-base font-bold text-white mb-0.5">{optionA}</div>
          <div className="text-[11px] text-slate-400">
            {localVote === 'A' ? 'Your selected choice (Tap to change)' : 'Tap to choose Option A'}
          </div>
        </div>
        {localVote === 'A' && (
          <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0 mt-1 animate-scale-in" />
        )}
      </button>

      {/* Option B Button */}
      <button
        type="button"
        onClick={() => handleVote('B')}
        disabled={Boolean(submittingVote)}
        className={`relative w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 group flex items-start gap-4 ${
          localVote === 'B'
            ? 'bg-gradient-to-r from-pink-950/80 to-purple-950/80 border-pink-500 shadow-lg shadow-pink-500/20 ring-2 ring-pink-500/30'
            : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-pink-500/60 text-slate-200'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition ${
            localVote === 'B'
              ? 'bg-pink-600 text-white shadow-md'
              : 'bg-slate-800 text-pink-400 group-hover:bg-pink-600 group-hover:text-white'
          }`}
        >
          B
        </div>
        <div className="flex-1">
          <div className="text-base font-bold text-white mb-0.5">{optionB}</div>
          <div className="text-[11px] text-slate-400">
            {localVote === 'B' ? 'Your selected choice (Tap to change)' : 'Tap to choose Option B'}
          </div>
        </div>
        {localVote === 'B' && (
          <CheckCircle2 className="w-6 h-6 text-pink-400 shrink-0 mt-1 animate-scale-in" />
        )}
      </button>
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
            Loading Next Dilemma...
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
                  Would You Rather
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
            <span>THE DILEMMA</span>
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
              Pick your answer below. Votes remain secret until everyone has chosen!
            </p>

            {/* Vote options - pinned within thumb reach at the bottom on mobile via a
                portal (so backdrop-blur/transform ancestors can't hijack their fixed
                positioning) so they're reachable without scrolling; inline in the card
                on desktop, unchanged */}
            {isMobile
              ? createPortal(
                  <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">{voteOptionsContent}</div>
                  </div>,
                  document.body
                )
              : <div className="grid grid-cols-1 gap-3.5">{voteOptionsContent}</div>}

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
          <div className="space-y-6 animate-fade-in">
            {/* Split Comparison Percentage Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold px-1">
                <span className="text-indigo-400">
                  Option A: {percentA}% ({votesForA.length} {votesForA.length === 1 ? 'vote' : 'votes'})
                </span>
                <span className="text-pink-400">
                  Option B: {percentB}% ({votesForB.length} {votesForB.length === 1 ? 'vote' : 'votes'})
                </span>
              </div>

              {/* Progress Split Bar */}
              <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-l-full transition-all duration-700"
                  style={{ width: `${percentA}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-600 rounded-r-full transition-all duration-700"
                  style={{ width: `${percentB}%` }}
                />
              </div>
            </div>

            {/* Side-by-side / Stacked Detailed Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A Breakdown */}
              <div
                className={`p-4 rounded-2xl border ${
                  localVote === 'A'
                    ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-xs">
                    OPTION A
                  </span>
                  <span className="text-xs font-bold text-indigo-300">
                    {votesForA.length} {votesForA.length === 1 ? 'player' : 'players'}
                  </span>
                </div>

                <div className="font-bold text-sm text-white mb-3">{optionA}</div>

                {/* Players who voted A */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Voted By:
                  </div>
                  {votesForA.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No votes</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {votesForA.map((v) => {
                        const voter = players.find((p) => p.id === v.player_id);
                        const name = voter?.display_name || 'Anonymous';
                        const isMe = v.player_id === localPlayer?.playerId;

                        return (
                          <div
                            key={v.player_id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border ${
                              isMe
                                ? 'bg-indigo-600/30 border-indigo-500/60 text-white font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-gradient-to-tr ${getAvatarColor(
                                name
                              )} text-[9px] font-bold text-white flex items-center justify-center`}
                            >
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              {name} {isMe ? '(You)' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Option B Breakdown */}
              <div
                className={`p-4 rounded-2xl border ${
                  localVote === 'B'
                    ? 'bg-pink-950/40 border-pink-500/50 ring-1 ring-pink-500/30'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-lg bg-pink-600 text-white font-black text-xs">
                    OPTION B
                  </span>
                  <span className="text-xs font-bold text-pink-300">
                    {votesForB.length} {votesForB.length === 1 ? 'player' : 'players'}
                  </span>
                </div>

                <div className="font-bold text-sm text-white mb-3">{optionB}</div>

                {/* Players who voted B */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Voted By:
                  </div>
                  {votesForB.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No votes</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {votesForB.map((v) => {
                        const voter = players.find((p) => p.id === v.player_id);
                        const name = voter?.display_name || 'Anonymous';
                        const isMe = v.player_id === localPlayer?.playerId;

                        return (
                          <div
                            key={v.player_id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border ${
                              isMe
                                ? 'bg-pink-600/30 border-pink-500/60 text-white font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-gradient-to-tr ${getAvatarColor(
                                name
                              )} text-[9px] font-bold text-white flex items-center justify-center`}
                            >
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              {name} {isMe ? '(You)' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
            const playerVoteObj = currentRoundVotes.find((v) => v.player_id === player.id);
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

                {isRevealed && playerVoteObj ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      playerVoteObj.choice === 'A'
                        ? 'bg-indigo-600/40 text-indigo-300'
                        : 'bg-pink-600/40 text-pink-300'
                    }`}
                  >
                    {playerVoteObj.choice}
                  </span>
                ) : hasVoted ? (
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
