import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { CATEGORIES } from '../data';
import { VOTE_REVEAL_CATEGORIES, GAME_TYPES } from '../data/prompts';
import { Play, Crown, Users, AlertCircle, Settings2 } from 'lucide-react';
import { ShareLinkCard } from './ShareLinkCard';

export const LobbyView: React.FC = () => {
  const { session, players, localPlayer, startGame, setGameSettings, loading, error } = useGame();
  const [starting, setStarting] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  if (!session) return null;

  const isHost = Boolean(localPlayer?.isHost);
  const gameType = session.game_type || 'word_chain';
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${session.room_code}` : '';

  // Get active category information based on game type
  const isVoteReveal = gameType === 'vote_reveal';
  const categoryInfo = isVoteReveal
    ? VOTE_REVEAL_CATEGORIES[session.category] || VOTE_REVEAL_CATEGORIES['general']
    : CATEGORIES[session.category] || CATEGORIES['cities'];

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  const handleGameTypeChange = async (newType: string) => {
    if (!isHost || updatingSettings || newType === gameType) return;
    setUpdatingSettings(true);
    const defaultCat = newType === 'vote_reveal' ? 'general' : 'cities';
    await setGameSettings(newType, defaultCat);
    setUpdatingSettings(false);
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!isHost || updatingSettings || newCategory === session.category) return;
    setUpdatingSettings(true);
    await setGameSettings(gameType, newCategory);
    setUpdatingSettings(false);
  };

  // Avatar color generator based on player name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-600 to-indigo-700',
      'from-emerald-600 to-teal-700',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-purple-600 to-violet-700',
      'from-cyan-600 to-blue-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 animate-fade-in space-y-6 text-slate-800">
      {/* 1. Room Code Card */}
      <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-[#3b4cca] rounded-full text-xs font-bold">
            <span>{isVoteReveal ? '🗳️' : '⛓️'}</span>
            <span>{isVoteReveal ? 'Would You Rather' : 'Word Chain'}</span>
          </div>

          <span className="text-xs font-bold text-slate-400">
            {players.length} {players.length === 1 ? 'Player' : 'Players'} in Lobby
          </span>
        </div>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          Room Code
        </div>
        <div className="text-5xl font-black font-mono tracking-widest text-[#0b2545] mb-4 selection:bg-[#3b4cca] selection:text-white">
          {session.room_code}
        </div>

        {/* Share Link Card directly in the lobby */}
        <ShareLinkCard
          url={joinUrl}
          code={session.room_code}
          title={`Join our ${isVoteReveal ? 'Would You Rather' : 'Word Chain'} Game!`}
          gameType={isVoteReveal ? 'vote_reveal' : 'word_chain'}
          subtitle={`Room Code: ${session.room_code} • Ready to start`}
          shareMessage={`Join our live ${isVoteReveal ? 'Would You Rather' : 'Word Chain'} game room with code ${session.room_code}! 👉 ${joinUrl}`}
        />
      </div>

      {/* 2. Game Settings Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#3b4cca]" />
            <h3 className="font-bold text-sm text-[#0b2545]">Game Settings</h3>
          </div>
          {isHost ? (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Host Controls
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium">Chosen by host</span>
          )}
        </div>

        {/* Game Engine Mode Selector */}
        {isHost ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Select Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {Object.values(GAME_TYPES).map((type) => {
                  const isSelected = gameType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleGameTypeChange(type.id)}
                      disabled={updatingSettings}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-blue-50/70 border-[#3b4cca] text-[#0b2545] shadow-2xs font-bold ring-1 ring-blue-300'
                          : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{type.icon}</span>
                        <span className="font-bold text-xs">{type.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {type.id === 'word_chain' ? '30s turn elimination' : '20s secret voting & reveal'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                {isVoteReveal ? 'Prompt Theme' : 'Word Category'}
              </label>

              {isVoteReveal ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.values(VOTE_REVEAL_CATEGORIES).map((cat) => {
                    const isSelected = session.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        disabled={updatingSettings}
                        className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold shadow-2xs'
                            : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <div className="overflow-hidden">
                          <div className="font-bold text-xs truncate">{cat.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{cat.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.values(CATEGORIES).map((cat) => {
                    const isSelected = session.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        disabled={updatingSettings}
                        className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 border-[#1f9d55] text-emerald-950 font-bold shadow-2xs'
                            : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <div className="overflow-hidden">
                          <div className="font-bold text-xs truncate">{cat.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {cat.words.length}+ words
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Non-host overview card */
          <div className="p-4 bg-[#f8fafc] border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{categoryInfo.icon}</span>
                <div>
                  <div className="font-bold text-sm text-[#0b2545]">
                    {isVoteReveal ? 'Would You Rather' : 'Word Chain'}
                  </div>
                  <div className="text-xs text-[#3b4cca] font-semibold">{categoryInfo.name}</div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-[#1f9d55] rounded-full text-[11px] font-bold">
                Ready
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isVoteReveal
                ? 'Vote privately on dilemmas within 20s, then reveal how everyone voted!'
                : 'Take turns linking words by their last letter before the 30s timer runs out.'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Players List Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3b4cca]" />
            <h3 className="font-bold text-sm text-[#0b2545]">Lobby Players</h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {players.length} {players.length === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        {/* Player Roster */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {players.map((p, idx) => {
            const isThisHost = idx === 0;
            const isMe = p.id === localPlayer?.playerId;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition shadow-2xs ${
                  isMe
                    ? 'bg-blue-50/70 border-blue-300 text-[#0b2545] font-bold'
                    : 'bg-[#f8fafc] border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                      p.display_name
                    )} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                  >
                    {p.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      <span>{p.display_name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-blue-100 text-[#3b4cca] px-1.5 py-0.2 rounded-full font-bold">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {isThisHost ? 'Room Host' : 'Ready to play'}
                    </div>
                  </div>
                </div>

                {isThisHost && (
                  <div className="p-1.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl" title="Host">
                    <Crown className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Start Game Action */}
        <div className="pt-3 border-t border-slate-100">
          {isHost ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={starting || loading || players.length === 0}
                className="w-full py-4 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-black text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {starting ? (
                  <span>Starting {isVoteReveal ? 'Would You Rather' : 'Word Chain'}...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      Start {isVoteReveal ? 'Would You Rather' : 'Word Chain'} ({players.length}{' '}
                      {players.length === 1 ? 'Player' : 'Players'})
                    </span>
                  </>
                )}
              </button>

              {players.length === 1 && (
                <p className="text-center text-[11px] text-slate-500">
                  Tip: Share the room code or link on WhatsApp to play with friends!
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-center gap-2.5 text-slate-600 text-xs font-semibold">
              <div className="w-2.5 h-2.5 bg-[#3b4cca] rounded-full animate-ping" />
              <span>Waiting for host to start {isVoteReveal ? 'Would You Rather' : 'Word Chain'}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
