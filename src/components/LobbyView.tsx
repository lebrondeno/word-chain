import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { HIGHER_LOWER_DIFFICULTIES, GAME_TYPES } from '../data/prompts';
import {
  Play,
  Crown,
  Users,
  AlertCircle,
  Trophy,
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Bot,
  Repeat,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { GameNightLeaderboard } from './GameNightLeaderboard';
import { TicTacToeGameView } from './TicTacToeGameView';
import { useHistoryLayer } from '../hooks/useHistoryLayer';
import { DEFAULT_TIC_TAC_TOE_VARIANT, type TicTacToeVariant } from '../lib/ticTacToe';
import { canStartLobby, getMinPlayersToStart } from '../lib/lobbyRules';

export const LobbyView: React.FC = () => {
  const { session, players, localPlayer, startGame, setGameSettings, setTicTacToeVariant, leaveGame, error } =
    useGame();
  const [starting, setStarting] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [showGameSwitcher, setShowGameSwitcher] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLocalTicTacToeOpen, setIsLocalTicTacToeOpen] = useState(false);

  useHistoryLayer(isLocalTicTacToeOpen, () => setIsLocalTicTacToeOpen(false));

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

  if (isLocalTicTacToeOpen) {
    return <TicTacToeGameView forceLocal onExitLocal={() => setIsLocalTicTacToeOpen(false)} />;
  }

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${session.room_code}` : '';
  const activeGameTypeInfo = GAME_TYPES[gameType] || GAME_TYPES.word_chain;
  const isHigherLower = gameType === 'higher_lower';
  const hasGameNightScores = players.some((p) => (p.total_score || 0) > 0);
  const tttVariant = (session.game_config?.ttt_mode as TicTacToeVariant | undefined) || DEFAULT_TIC_TAC_TOE_VARIANT;

  const minPlayers = getMinPlayersToStart(gameType);
  const isSolo = players.length === 1;
  const soloTicTacToe = isTicTacToe && isSolo;
  const canStart = canStartLobby(gameType, players.length, { selectedSeatCount: selectedPlayerIds.length });

  const shareMessage = `Join my ${activeGameTypeInfo.name} room on PartyHub! Code ${session.room_code} 👉 ${joinUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${activeGameTypeInfo.name} on PartyHub`, text: shareMessage, url: joinUrl });
      } catch {
        // user cancelled
      }
    } else {
      void handleCopy();
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    if (!isHost) return;
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 2) return [prev[1], playerId];
      return [...prev, playerId];
    });
  };

  const handleStart = async () => {
    if (soloTicTacToe) {
      setIsLocalTicTacToeOpen(true);
      return;
    }
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
    setShowGameSwitcher(false);
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

  const handleVariantChange = async (variant: TicTacToeVariant) => {
    if (!isHost || variant === tttVariant) return;
    await setTicTacToeVariant(variant);
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

  const startLabel = soloTicTacToe
    ? 'Play vs AI Bot Now'
    : isSolo && minPlayers === 1
    ? 'Start Solo Now'
    : `Start ${activeGameTypeInfo.shortName}`;

  const startHint = !canStart
    ? isTicTacToe && needsPlayerPick
      ? 'Tap exactly 2 players below to take the board'
      : isTicTacToe
      ? 'Waiting for a 2nd player…'
      : `Need at least ${minPlayers} players to start this game`
    : soloTicTacToe
    ? 'No friends yet? Play instantly against the AI bot — or share the code to invite one.'
    : isSolo && minPlayers === 1
    ? 'Play solo right now — or invite friends first.'
    : '';

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-3 animate-fade-in space-y-2.5 text-slate-800">
      {/* 1. Compact room header card */}
      <div className="glass-card glow-border rounded-3xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={leaveGame}
            className="p-2 rounded-xl bg-white/70 border border-white hover:bg-white text-slate-700 shrink-0"
            title="Leave room"
            aria-label="Leave room"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl btn-neon flex items-center justify-center text-lg shrink-0">
              {activeGameTypeInfo.icon}
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm text-[#0b2545] leading-tight break-words">
                {activeGameTypeInfo.name}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                {players.length} {players.length === 1 ? 'player' : 'players'} in room
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasGameNightScores && (
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(true)}
                className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700"
                title="Game Night scores"
                aria-label="Game Night scores"
              >
                <Trophy className="w-4 h-4" />
              </button>
            )}
            {isHost && (
              <button
                type="button"
                onClick={() => setShowGameSwitcher((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border text-[11px] font-bold ${
                  showGameSwitcher
                    ? 'bg-[#0b2545] text-white border-[#0b2545]'
                    : 'bg-white/70 border-white text-[#0b2545] hover:bg-white'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Change Game</span>
              </button>
            )}
          </div>
        </div>

        {/* Game switcher (hidden unless host opens it) */}
        {isHost && showGameSwitcher && (
          <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
            {Object.values(GAME_TYPES)
              .filter((gt) => gt.id !== 'friendship_test')
              .map((gt) => {
                const isSelected = gameType === gt.id;
                return (
                  <button
                    key={gt.id}
                    type="button"
                    disabled={updatingSettings}
                    onClick={() => handleGameTypeChange(gt.id)}
                    className={`p-2 rounded-2xl border text-[11px] font-bold flex items-center gap-1.5 text-left ${
                      isSelected
                        ? 'bg-cyan-50 border-cyan-400 text-cyan-900 ring-2 ring-cyan-100'
                        : 'bg-white/60 border-white text-slate-700 hover:bg-white'
                    }`}
                  >
                    <span className="text-base shrink-0">{gt.icon}</span>
                    <span className="break-words leading-tight">{gt.shortName}</span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Room code + share row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-2xl bg-[#0b2545] text-white px-3 py-2 text-center">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">Room Code</div>
            <div className="text-2xl font-black font-mono tracking-[0.25em] leading-tight">{session.room_code}</div>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-2xl btn-neon-emerald flex items-center justify-center shrink-0 active:scale-[0.97] transition-all"
            title="Invite on WhatsApp"
            aria-label="Invite on WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="w-11 h-11 rounded-2xl bg-white/80 border border-white text-[#0b2545] flex items-center justify-center shrink-0"
            title="Copy invite link"
            aria-label="Copy invite link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-11 h-11 rounded-2xl bg-white/80 border border-white text-[#0b2545] flex items-center justify-center shrink-0"
            title="Share"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Game options (only for the chosen game) */}
      {(activeGameTypeInfo.categories.length > 0 || isHigherLower || isTicTacToe) && (
        <div className="glass-card rounded-3xl p-3.5 space-y-3">
          {!isTicTacToe && activeGameTypeInfo.categories.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</div>
              <div className="grid grid-cols-2 gap-1.5">
                {activeGameTypeInfo.categories.map((cat) => {
                  const isSelected = session.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={!isHost || updatingSettings}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`p-2 rounded-2xl border text-[11px] font-bold flex items-center gap-1.5 text-left ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-100'
                          : isHost
                          ? 'bg-white/60 border-white text-slate-700 hover:bg-white'
                          : 'bg-white/40 border-white/60 text-slate-500'
                      }`}
                    >
                      <span className="text-base shrink-0">{cat.icon}</span>
                      <span className="break-words leading-tight">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isHigherLower && session.category === 'random_numbers' && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Difficulty</div>
              <div className="grid grid-cols-4 gap-1.5">
                {HIGHER_LOWER_DIFFICULTIES.map((diff) => {
                  const isSelected = (session.difficulty || 'medium') === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      disabled={!isHost || updatingSettings}
                      onClick={() => handleDifficultyChange(diff.id)}
                      className={`py-2 px-1 rounded-xl border text-[11px] font-bold text-center ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-100'
                          : 'bg-white/60 border-white text-slate-600'
                      }`}
                    >
                      {diff.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isTicTacToe && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Board Mode</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleVariantChange('tactical')}
                  className={`p-2 rounded-2xl border text-[11px] font-bold text-left ${
                    tttVariant === 'tactical'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-100'
                      : 'bg-white/60 border-white text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Tactical Shift
                  </span>
                  <span className="block text-[10px] font-medium text-slate-500 leading-snug mt-0.5">
                    3 X + 3 O pre-placed. Move pieces to line up 3.
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleVariantChange('classic')}
                  className={`p-2 rounded-2xl border text-[11px] font-bold text-left ${
                    tttVariant === 'classic'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-100'
                      : 'bg-white/60 border-white text-slate-700'
                  }`}
                >
                  <span>⭕ Classic Empty</span>
                  <span className="block text-[10px] font-medium text-slate-500 leading-snug mt-0.5">
                    Empty board. Place marks one by one.
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                {players.length === 1
                  ? 'Solo? Start now to battle the AI bot. Invite a friend to play online instead.'
                  : players.length === 2
                  ? 'Both players will automatically take seats as X and O.'
                  : 'Pick 2 players below to take the board — everyone else spectates.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Players roster */}
      <div className="glass-card rounded-3xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-black text-[#0b2545] uppercase tracking-wider">
              Players ({players.length})
            </h2>
          </div>
          {needsPlayerPick && isHost && (
            <span className="text-[11px] font-bold text-indigo-700">Pick 2: {selectedPlayerIds.length}/2</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {players.map((player) => {
            const isMe = player.id === localPlayer?.playerId;
            const isPlayerHost = player.id === session.turn_order?.[0] || player.id === players[0]?.id;
            const isPicked = selectedPlayerIds.includes(player.id);
            const pickIndex = selectedPlayerIds.indexOf(player.id);

            return (
              <button
                type="button"
                key={player.id}
                onClick={() => needsPlayerPick && togglePlayerSelection(player.id)}
                disabled={!needsPlayerPick || !isHost}
                className={`pl-1.5 pr-2.5 py-1.5 rounded-full border flex items-center gap-1.5 text-left ${
                  isPicked
                    ? pickIndex === 0
                      ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-100'
                      : 'bg-rose-50 border-rose-400 ring-2 ring-rose-100'
                    : 'bg-white/70 border-white'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full bg-gradient-to-tr ${getAvatarColor(
                    player.display_name
                  )} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}
                >
                  {player.display_name.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-bold text-[#0b2545] break-words leading-tight">
                  {player.display_name}
                  {isMe ? ' (You)' : ''}
                </span>
                {isPlayerHost && <Crown className="w-3 h-3 text-amber-500 fill-current shrink-0" />}
                {isPicked && (
                  <span
                    className={`w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center ${
                      pickIndex === 0 ? 'bg-indigo-600' : 'bg-rose-500'
                    }`}
                  >
                    {pickIndex === 0 ? 'X' : 'O'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Start CTA */}
      {isHost ? (
        <div className="space-y-1.5 pb-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart || starting}
            className="w-full py-3.5 rounded-full btn-neon-emerald font-black text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {starting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Launching Game...
              </span>
            ) : (
              <>
                {soloTicTacToe ? <Bot className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                <span>{startLabel}</span>
              </>
            )}
          </button>
          {startHint && <p className="text-center text-[11px] text-slate-600 leading-snug">{startHint}</p>}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-3.5 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Waiting for host to start the game...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Game Night Leaderboard Modal */}
      <GameNightLeaderboard isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
    </div>
  );
};
