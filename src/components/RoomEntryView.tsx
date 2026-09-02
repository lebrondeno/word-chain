import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { CATEGORIES } from '../data';
import { sanitizeRoomCode } from '../lib/roomCode';
import { Play, UserPlus, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface RoomEntryViewProps {
  initialRoomCode?: string;
  onOpenSupabaseModal?: () => void;
}

export const RoomEntryView: React.FC<RoomEntryViewProps> = ({
  initialRoomCode,
  onOpenSupabaseModal,
}) => {
  const { createGame, joinGame, loading, error, setError } = useGame();

  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [displayName, setDisplayName] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('word_chain_saved_name') || '' : '';
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [category, setCategory] = useState<string>('cities');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(sanitizeRoomCode(initialRoomCode));
      setMode('join');
    }
  }, [initialRoomCode]);

  const saveName = (name: string) => {
    setDisplayName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('word_chain_saved_name', name.trim());
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    await createGame(displayName.trim(), category);
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
    await joinGame(roomCode.trim(), displayName.trim());
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
      {/* Hero Badge */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Realtime Multiplayer Word Game
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2">
          Pass the Letter, <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Hold the Chain.
          </span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto">
          Take turns linking words by their last letter before the 15s timer runs out.
        </p>
      </div>

      {/* Supabase Notice if not configured */}
      {!configured && (
        <div className="mb-6 p-4 bg-amber-950/40 border border-amber-800/40 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-white block mb-0.5">Setup Supabase Connection</span>
            Connect your Supabase credentials to enable live multiplayer rooms and realtime syncing.
          </div>
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition shrink-0"
            >
              Configure
            </button>
          )}
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
                placeholder="e.g. MasterWordsmith"
                maxLength={20}
                value={displayName}
                onChange={(e) => saveName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
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
            </div>

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
                onChange={(e) => setRoomCode(sanitizeRoomCode(e.target.value))}
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
