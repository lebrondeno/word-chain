import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { VOTE_REVEAL_CATEGORIES } from '../data/prompts';
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

  const rawOptionA = currentPrompt.options?.[0];
  const rawOptionB = currentPrompt.options?.[1];
  const optionA: string = typeof rawOptionA === 'string' ? rawOptionA : (rawOptionA as { name?: string })?.name || 'Option A';
  const optionB: string = typeof rawOptionB === 'string' ? rawOptionB : (rawOptionB as { name?: string })?.name || 'Option B';

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
      'from-blue-600 to-indigo-700',
      'from-pink-600 to-rose-700',
      'from-amber-500 to-orange-600',
      'from-emerald-600 to-teal-700',
      'from-cyan-600 to-blue-700',
      'from-violet-600 to-fuchsia-700',
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

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 space-y-4 animate-fade-in text-slate-800">
      {/* 1. Header Bar: Engine, Category, Round & Timer Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{categoryInfo.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-[#0b2545] uppercase tracking-wider">
                  Would You Rather
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-50 text-[#3b4cca] font-bold border border-blue-200">
                  {categoryInfo.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block font-medium">
                Round {roundNumber} • {totalVotesCast}/{totalActivePlayers} Voted
              </span>
            </div>
          </div>

          {/* Timer or Status Badge */}
          {!isRevealed ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all border ${
                isCritical
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse scale-105'
                  : isUrgent
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-[#3b4cca] border-blue-200'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isCritical ? 'animate-spin' : ''}`} />
              <span>{timeRemaining}s</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Revealed</span>
            </div>
          )}
        </div>

        {/* Visual Progress Countdown Bar */}
        {!isRevealed && (
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCritical
                  ? 'bg-gradient-to-r from-rose-500 to-red-600'
                  : isUrgent
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-[#3b4cca] to-[#f43f5e]'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. Main Game Arena Card */}
      <div className="glass-card glow-border rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
        {/* Prompt Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#3b4cca] text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-[#3b4cca]" />
            <span>THE DILEMMA</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#0b2545] leading-snug tracking-tight max-w-md mx-auto">
            {currentPrompt.prompt_text}
          </h2>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* --- PHASE 1: VOTING SCREEN --- */}
        {!isRevealed ? (
          <div className="space-y-4">
            <p className="text-center text-xs text-slate-500">
              Pick your answer below. Votes remain secret until everyone has chosen!
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* Option A Button */}
              <button
                type="button"
                onClick={() => handleVote('A')}
                disabled={Boolean(submittingVote)}
                className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition flex items-start gap-4 ${
                  localVote === 'A'
                    ? 'bg-blue-50 border-[#3b4cca] ring-2 ring-blue-200 shadow-sm'
                    : 'bg-[#f8fafc] border-slate-200 hover:border-blue-300 text-slate-800'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition ${
                    localVote === 'A' ? 'bg-[#3b4cca] text-white shadow-sm' : 'bg-slate-200 text-[#3b4cca]'
                  }`}
                >
                  A
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-[#0b2545] mb-0.5">{optionA}</div>
                  <div className="text-[11px] text-slate-500">
                    {localVote === 'A' ? 'Your choice (Tap to change)' : 'Tap to choose Option A'}
                  </div>
                </div>
                {localVote === 'A' && (
                  <CheckCircle2 className="w-6 h-6 text-[#3b4cca] shrink-0 mt-1" />
                )}
              </button>

              {/* Option B Button */}
              <button
                type="button"
                onClick={() => handleVote('B')}
                disabled={Boolean(submittingVote)}
                className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition flex items-start gap-4 ${
                  localVote === 'B'
                    ? 'bg-rose-50 border-[#f43f5e] ring-2 ring-rose-200 shadow-sm'
                    : 'bg-[#f8fafc] border-slate-200 hover:border-rose-300 text-slate-800'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition ${
                    localVote === 'B' ? 'bg-[#f43f5e] text-white shadow-sm' : 'bg-slate-200 text-[#f43f5e]'
                  }`}
                >
                  B
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-[#0b2545] mb-0.5">{optionB}</div>
                  <div className="text-[11px] text-slate-500">
                    {localVote === 'B' ? 'Your choice (Tap to change)' : 'Tap to choose Option B'}
                  </div>
                </div>
                {localVote === 'B' && (
                  <CheckCircle2 className="w-6 h-6 text-[#f43f5e] shrink-0 mt-1" />
                )}
              </button>
            </div>

            {/* Voting Status Toast */}
            <div className="pt-2 text-center">
              {localVote ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#1f9d55] text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#1f9d55]" />
                  <span>
                    Your vote is saved! Waiting for remaining players ({totalVotesCast}/{totalActivePlayers})
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Votes submitted so far: <strong className="text-slate-800">{totalVotesCast}</strong> / {totalActivePlayers}
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
                <span className="text-[#3b4cca]">
                  Option A: {percentA}% ({votesForA.length} {votesForA.length === 1 ? 'vote' : 'votes'})
                </span>
                <span className="text-[#f43f5e]">
                  Option B: {percentB}% ({votesForB.length} {votesForB.length === 1 ? 'vote' : 'votes'})
                </span>
              </div>

              {/* Progress Split Bar */}
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-[#3b4cca] rounded-l-full transition-all duration-700"
                  style={{ width: `${percentA}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-[#f43f5e] rounded-r-full transition-all duration-700"
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
                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-[#f8fafc] border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-lg bg-[#3b4cca] text-white font-black text-xs">
                    OPTION A
                  </span>
                  <span className="text-xs font-bold text-[#3b4cca]">
                    {votesForA.length} {votesForA.length === 1 ? 'player' : 'players'}
                  </span>
                </div>

                <div className="font-bold text-sm text-[#0b2545] mb-3">{optionA}</div>

                {/* Players who voted A */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                    Voted By:
                  </div>
                  {votesForA.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No votes</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {votesForA.map((v) => {
                        const voter = players.find((p) => p.id === v.player_id);
                        const name = voter?.display_name || 'Anonymous';
                        const isMe = v.player_id === localPlayer?.playerId;

                        return (
                          <div
                            key={v.player_id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isMe
                                ? 'bg-blue-100 border-blue-300 text-[#0b2545]'
                                : 'bg-white border-slate-200 text-slate-700'
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
                    ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-300'
                    : 'bg-[#f8fafc] border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-lg bg-[#f43f5e] text-white font-black text-xs">
                    OPTION B
                  </span>
                  <span className="text-xs font-bold text-[#f43f5e]">
                    {votesForB.length} {votesForB.length === 1 ? 'player' : 'players'}
                  </span>
                </div>

                <div className="font-bold text-sm text-[#0b2545] mb-3">{optionB}</div>

                {/* Players who voted B */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                    Voted By:
                  </div>
                  {votesForB.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No votes</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {votesForB.map((v) => {
                        const voter = players.find((p) => p.id === v.player_id);
                        const name = voter?.display_name || 'Anonymous';
                        const isMe = v.player_id === localPlayer?.playerId;

                        return (
                          <div
                            key={v.player_id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isMe
                                ? 'bg-rose-100 border-rose-300 text-rose-950'
                                : 'bg-white border-slate-200 text-slate-700'
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

            {/* Host Actions (Next Round / End Game) */}
            {isHost ? (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={handleNextRound}
                  disabled={advancingRound}
                  className="w-full py-3.5 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {advancingRound ? (
                    <span>Loading Next Dilemma...</span>
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
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Return to Lobby</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-[#f8fafc] border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#3b4cca] rounded-full animate-ping" />
                <span>Waiting for the host to start the next round...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Player Roster Status Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3b4cca]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Player Voting Status
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold">
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
                className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between transition-all shadow-2xs ${
                  hasVoted
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold'
                    : 'bg-[#f8fafc] border-slate-200 text-slate-600'
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
                  <div className="break-words font-medium">
                    {player.display_name} {isMe ? '(You)' : ''}
                  </div>
                </div>

                {isRevealed && playerVoteObj ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      playerVoteObj.choice === 'A' || playerVoteObj.choice === optionA
                        ? 'bg-blue-100 text-[#3b4cca]'
                        : 'bg-rose-100 text-[#f43f5e]'
                    }`}
                  >
                    {playerVoteObj.choice === 'A' || playerVoteObj.choice === optionA ? 'A' : 'B'}
                  </span>
                ) : hasVoted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1f9d55] shrink-0 ml-1" />
                ) : (
                  <span className="text-[10px] text-amber-600/80 italic ml-1">Voting</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
