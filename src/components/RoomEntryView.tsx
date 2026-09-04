import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { CATEGORIES } from '../data';
import { VOTE_REVEAL_CATEGORIES, TRIVIA_CATEGORIES, HIGHER_LOWER_CATEGORIES, GAME_TYPES } from '../data/prompts';
import { sanitizeRoomCode } from '../lib/roomCode';
import { Play, UserPlus, Sparkles, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

interface RoomEntryViewProps {
  initialRoomCode?: string;
}

export const RoomEntryView: React.FC<RoomEntryViewProps> = ({
  initialRoomCode,
}) => {
  const { createGame, joinGame, loading, error, setError } = useGame();

  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [displayName, setDisplayName] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('word_chain_saved_name') || '' : '';
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [gameType, setGameType] = useState<string>('word_chain');
  const [category, setCategory] = useState<string>('cities');
  // Set when joinGame finds an existing (non-eliminated) player with the same
  // name already in the room - lets the player choose to reconnect to that
  // row instead of silently creating a duplicate, or confirm they're a
  // different person joining fresh.
  const [rejoinPrompt, setRejoinPrompt] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(sanitizeRoomCode(initialRoomCode));
      setMode('join');
    }
  }, [initialRoomCode]);

  const saveName = (name: string) => {
    setDisplayName(name);
    setRejoinPrompt(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('word_chain_saved_name', name.trim());
    }
  };

  const handleGameTypeSelect = (typeId: string) => {
    setGameType(typeId);
    if (typeId === 'vote_reveal' || typeId === 'most_likely') {
      setCategory('general');
    } else if (typeId === 'trivia') {
      setCategory('general_knowledge');
    } else if (typeId === 'higher_lower') {
      setCategory('population');
    } else {
      setCategory('cities');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    await createGame(displayName.trim(), category, gameType);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('Please enter a 4-character room code');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    setRejoinPrompt(null);
    const res = await joinGame(roomCode.trim(), displayName.trim());
    if (res.needsRejoinConfirm && res.existingPlayerName) {
      setRejoinPrompt(res.existingPlayerName);
    }
  };

  const handleRejoinAsExisting = async () => {
    setRejoining(true);
    await joinGame(roomCode.trim(), displayName.trim(), 'reuse');
    setRejoining(false);
    setRejoinPrompt(null);
  };

  const handleJoinAsNew = async () => {
    setRejoining(true);
    await joinGame(roomCode.trim(), displayName.trim(), 'new');
    setRejoining(false);
    setRejoinPrompt(null);
  };

  const configured = isSupabaseConfigured();
  const isVoteReveal = gameType === 'vote_reveal';
  const isTrivia = gameType === 'trivia';
  const isHigherLower = gameType === 'higher_lower';

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
      {/* Hero Badge */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Realtime Multiplayer Game Platform
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2">
          Play Together, <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Realtime in Browser.
          </span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto">
          Multiplayer party games: Word Chain elimination & Would You Rather group reveals.
        </p>
      </div>

      {/* Supabase Notice if not configured */}
      {!configured && (
        <div className="mb-6 p-4 bg-amber-950/40 border border-amber-800/40 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-white block mb-0.5">Supabase Not Configured</span>
            Set the <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-100">VITE_SUPABASE_URL</code> and <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-100">VITE_SUPABASE_ANON_KEY</code> environment variables to enable live multiplayer rooms and realtime syncing.
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
        {/* Toggle Mode Tabs */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError(null);
              setRejoinPrompt(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
              mode === 'create'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-4 h-4" /> Create Room
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError(null);
              setRejoinPrompt(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
              mode === 'join'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Join Room
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Create Mode Form */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="e.g. PartyHost"
                maxLength={20}
                value={displayName}
                onChange={(e) => saveName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Game Type Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Choose Game
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(GAME_TYPES).map((type) => {
                  const isSelected = gameType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleGameTypeSelect(type.id)}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-inner ring-1 ring-indigo-500/40'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <div className="overflow-hidden">
                        <div className="font-semibold text-xs text-white truncate">{type.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {type.id === 'word_chain'
                            ? '30s turn timer'
                            : type.id === 'trivia'
                            ? '20s per question'
                            : type.id === 'higher_lower'
                            ? '20s per guess'
                            : '20s vote & reveal'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Picker - most_likely only has a single "General" pool, so
                no theme selection is needed for it */}
            {gameType !== 'most_likely' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isVoteReveal
                    ? 'Theme'
                    : isTrivia
                    ? 'Trivia Category'
                    : isHigherLower
                    ? 'Number Category'
                    : 'Word Category'}
                </label>

                {isVoteReveal ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(VOTE_REVEAL_CATEGORIES).map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-white shadow-inner'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <div className="overflow-hidden">
                            <div className="font-semibold text-xs text-white truncate">{cat.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{cat.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : isTrivia ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(TRIVIA_CATEGORIES).map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-white shadow-inner'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <div className="overflow-hidden">
                            <div className="font-semibold text-xs text-white truncate">{cat.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{cat.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : isHigherLower ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(HIGHER_LOWER_CATEGORIES).map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-white shadow-inner'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <div className="overflow-hidden">
                            <div className="font-semibold text-xs text-white truncate">{cat.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{cat.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.values(CATEGORIES).map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-inner'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <div className="overflow-hidden">
                            <div className="font-semibold text-xs text-white truncate">{cat.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {cat.words.length}+ words
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Room...
                </span>
              ) : (
                <>
                  <span>Create Game Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Join Mode Form */}
        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                4-Character Room Code
              </label>
              <input
                type="text"
                placeholder="ABCD"
                maxLength={4}
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(sanitizeRoomCode(e.target.value));
                  setRejoinPrompt(null);
                }}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-widest text-indigo-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="e.g. WordNinja"
                maxLength={20}
                value={displayName}
                onChange={(e) => saveName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Rejoin Confirmation - shown when a non-eliminated player with
                this same name is already in the room, so a reconnecting
                player merges back into their existing seat instead of
                silently creating a duplicate roster entry */}
            {rejoinPrompt ? (
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300">
                    <strong className="text-white">{rejoinPrompt}</strong> is already in this
                    room. Is that you reconnecting?
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleRejoinAsExisting}
                    disabled={rejoining}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {rejoining ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Rejoin as {rejoinPrompt}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleJoinAsNew}
                    disabled={rejoining}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
                  >
                    No, I'm a different player - join as new
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining Room...
                  </span>
                ) : (
                  <>
                    <span>Enter Game Lobby</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-slate-600" />
        No account required • Instant browser sync
      </div>
    </div>
  );
};
