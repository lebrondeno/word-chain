import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  HIGHER_LOWER_DIFFICULTIES,
  GAME_TYPES,
} from '../data/prompts';
import { Play, Crown, Users, AlertCircle, Settings2, Trophy } from 'lucide-react';
import { ShareLinkCard } from './ShareLinkCard';
import { GameNightLeaderboard } from './GameNightLeaderboard';

export const LobbyView: React.FC = () => {
  const { session, players, localPlayer, startGame, setGameSettings, error } = useGame();
  const [starting, setStarting] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const isHost = Boolean(localPlayer?.isHost);
  const gameType = session?.game_type || 'word_chain';
  const isTicTacToe = gameType === 'tic_tac_toe';
  const needsPlayerPick = isTicTacToe && players.length > 2;

  // Keep the host's 2-player selection valid as roster/game type changes
  useEffect(() => {
    if (!needsPlayerPick) {
      setSelectedPlayerIds([]);
      return;
    }
    setSelectedPlayerIds((prev) => prev.filter((id) => players.some((p) => p.id === id)));
  }, [needsPlayerPick, players]);

  if (!session) return null;

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${session.room_code}` : '';
  const activeGameTypeInfo = GAME_TYPES[gameType] || GAME_TYPES.word_chain;

  const isHigherLower = gameType === 'higher_lower';

  const hasGameNightScores = players.some((p) => (p.total_score || 0) > 0);

  const togglePlayerSelection = (playerId: string) => {
    if (!isHost) return;
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 2) return [prev[1], playerId];
      return [...prev, playerId];
    });
  };

  const handleStart = async () => {
    setStarting(true);
    if (isTicTacToe && players.length > 2) {
      await startGame(selectedPlayerIds);
    } else {
      await startGame();
    }
    setStarting(false);
  };

  const handleGameTypeChange = async (newType: string) => {
    if (!isHost || updatingSettings || newType === gameType) return;
    setUpdatingSettings(true);
    let defaultCat = 'cities';
    if (newType === 'vote_reveal' || newType === 'most_likely') defaultCat = 'general';
    else if (newType === 'trivia') defaultCat = 'general_knowledge';
    else if (newType === 'higher_lower') defaultCat = 'random_numbers';
    else if (newType === 'tic_tac_toe') defaultCat = 'classic';

    await setGameSettings(newType, defaultCat);
    setUpdatingSettings(false);
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!isHost || updatingSettings || newCategory === session.category) return;
    setUpdatingSettings(true);
    await setGameSettings(gameType, newCategory);
    setUpdatingSettings(false);
  };

  const handleDifficultyChange = async (newDiff: string) => {
    if (!isHost || updatingSettings) return;
    setUpdatingSettings(true);
    await setGameSettings(gameType, session.category, newDiff);
    setUpdatingSettings(false);
  };

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

  const canStart = isTicTacToe ? (players.length >= 2 && (!needsPlayerPick || selectedPlayerIds.length === 2)) : players.length >= 2;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 animate-fade-in space-y-6 text-slate-800">
      {/* 1. Room Code Card */}
      <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-[#3b4cca] rounded-full text-xs font-bold">
            <span>{activeGameTypeInfo.icon}</span>
            <span>{activeGameTypeInfo.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {hasGameNightScores && (
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Scores</span>
              </button>
            )}
            <span className="text-xs font-bold text-slate-400">
              {players.length} {players.length === 1 ? 'Player' : 'Players'}
            </span>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          Room Code
        </div>
        <div className="text-5xl font-black font-mono tracking-widest text-[#0b2545] mb-4 selection:bg-[#3b4cca] selection:text-white">
          {session.room_code}
        </div>

        {/* Share Link Card */}
        <ShareLinkCard
          url={joinUrl}
          code={session.room_code}
          title={`Join our ${activeGameTypeInfo.name} Game!`}
          gameType={gameType === 'vote_reveal' ? 'vote_reveal' : 'word_chain'}
          subtitle={`Room Code: ${session.room_code} • Ready to start`}
          shareMessage={`Join our live ${activeGameTypeInfo.name} game room with code ${session.room_code}! 👉 ${joinUrl}`}
        />
      </div>

      {/* 2. Game Settings Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#3b4cca]" />
            <h2 className="text-sm font-black text-[#0b2545] uppercase tracking-wider">
              Game Mode &amp; Category
            </h2>
          </div>
          {!isHost && (
            <span className="text-xs font-semibold text-slate-400">Host controls settings</span>
          )}
        </div>

        {/* Game Mode Selector Buttons */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Game Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.values(GAME_TYPES)
              .filter((gt) => gt.id !== 'friendship_test') // Friendship test is standalone async
              .map((gt) => {
                const isSelected = gameType === gt.id;
                return (
                  <button
                    key={gt.id}
                    type="button"
                    disabled={!isHost || updatingSettings}
                    onClick={() => handleGameTypeChange(gt.id)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold transition flex items-center gap-2 text-left ${
                      isSelected
                        ? 'bg-blue-50/80 border-[#3b4cca] text-[#3b4cca] ring-2 ring-blue-100 shadow-2xs'
                        : isHost
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-[#3b4cca]'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-lg">{gt.icon}</span>
                    <span className="truncate">{gt.shortName}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Category Picker (if game has categories) */}
        {!isTicTacToe && activeGameTypeInfo.categories.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {activeGameTypeInfo.categories.map((cat) => {
                const isSelected = session.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={!isHost || updatingSettings}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold transition flex items-center gap-2 text-left ${
                      isSelected
                        ? 'bg-emerald-50 border-[#1f9d55] text-[#1f9d55] ring-2 ring-emerald-100 shadow-2xs'
                        : isHost
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-[#1f9d55]'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Higher/Lower Difficulty selector (when random_numbers is active) */}
        {isHigherLower && session.category === 'random_numbers' && (
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Difficulty
            </label>
            <div className="grid grid-cols-4 gap-2">
              {HIGHER_LOWER_DIFFICULTIES.map((diff) => {
                const isSelected = (session.difficulty || 'medium') === diff.id;
                return (
                  <button
                    key={diff.id}
                    type="button"
                    disabled={!isHost || updatingSettings}
                    onClick={() => handleDifficultyChange(diff.id)}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition text-center ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-700 ring-2 ring-amber-100 shadow-2xs'
                        : isHost
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {diff.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tic Tac Toe specific seating guidance */}
        {isTicTacToe && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-slate-600 space-y-1">
            <div className="font-bold text-[#0b2545] flex items-center gap-1.5">
              <span>⭕ 2-Player Head-to-Head</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {players.length === 2
                ? 'Both players will automatically take seats as X and O.'
                : players.length > 2
                ? 'Select 2 players below to take the board. Other players will spectate and can play next round!'
                : 'Waiting for a 2nd player to join the room...'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Players Roster Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3b4cca]" />
            <h2 className="text-sm font-black text-[#0b2545] uppercase tracking-wider">
              Players Joined ({players.length})
            </h2>
          </div>
          {needsPlayerPick && isHost && (
            <span className="text-[11px] font-bold text-[#3b4cca]">
              Pick 2: {selectedPlayerIds.length}/2
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {players.map((player) => {
            const isMe = player.id === localPlayer?.playerId;
            const isPlayerHost = player.id === session.turn_order?.[0] || player.id === players[0]?.id;
            const isPicked = selectedPlayerIds.includes(player.id);
            const pickIndex = selectedPlayerIds.indexOf(player.id);

            return (
              <div
                key={player.id}
                onClick={() => needsPlayerPick && togglePlayerSelection(player.id)}
                className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                  needsPlayerPick && isHost ? 'cursor-pointer hover:border-[#3b4cca]' : ''
                } ${
                  isPicked
                    ? pickIndex === 0
                      ? 'bg-blue-50 border-[#3b4cca] ring-2 ring-blue-100'
                      : 'bg-rose-50 border-[#f43f5e] ring-2 ring-rose-100'
                    : isMe
                    ? 'bg-slate-50 border-slate-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                      player.display_name
                    )} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs`}
                  >
                    {player.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#0b2545] truncate">
                      {player.display_name} {isMe ? '(You)' : ''}
                    </div>
                    {isPlayerHost && (
                      <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3 fill-current" /> Room Host
                      </span>
                    )}
                  </div>
                </div>

                {needsPlayerPick && (
                  <div className="shrink-0">
                    {isPicked ? (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs text-white ${
                          pickIndex === 0 ? 'bg-[#3b4cca]' : 'bg-[#f43f5e]'
                        }`}
                      >
                        {pickIndex === 0 ? 'X' : 'O'}
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full border-2 border-slate-300 block" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Start Game Button */}
      {isHost ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart || starting}
            className="w-full py-4 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-black text-sm sm:text-base shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {starting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Launching Game...
              </span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start {activeGameTypeInfo.name}</span>
              </>
            )}
          </button>

          {!canStart && (
            <p className="text-center text-xs text-slate-500">
              {isTicTacToe && needsPlayerPick
                ? 'Please select exactly 2 players to start Tic Tac Toe'
                : 'Need at least 2 players to start this game'}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-4 text-center border border-slate-200">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
            <div className="w-3.5 h-3.5 border-2 border-[#3b4cca] border-t-transparent rounded-full animate-spin" />
            <span>Waiting for host to start the game...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Game Night Leaderboard Modal */}
      <GameNightLeaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </div>
  );
};
