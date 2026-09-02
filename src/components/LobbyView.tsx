import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { CATEGORIES } from '../data';
import { Play, Copy, Check, Share2, Crown, Users, AlertCircle } from 'lucide-react';
import { ShareModal } from './ShareModal';

export const LobbyView: React.FC = () => {
  const { session, players, localPlayer, startGame, loading, error } = useGame();
  const [copied, setCopied] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  if (!session) return null;

  const isHost = Boolean(localPlayer?.isHost);
  const categoryInfo = CATEGORIES[session.category] || CATEGORIES['cities'];
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${session.room_code}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

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

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 animate-fade-in space-y-5">
      {/* Room Code Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold">
            <span>{categoryInfo.icon}</span>
            <span>{categoryInfo.name}</span>
          </div>
          <button
            onClick={() => setIsShareOpen(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 transition"
          >
            <Share2 className="w-3.5 h-3.5" /> Invite
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
          Room Code
        </div>
        <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-white mb-4 selection:bg-indigo-500">
          {session.room_code}
        </div>

        {/* Quick Link Copy Button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-2.5 px-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
          <span>{copied ? 'Invite Link Copied!' : 'Copy Invite Link'}</span>
        </button>
      </div>

      {/* Players List Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Lobby Players</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {players.length} {players.length === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        {/* Player Roster */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {players.map((p, idx) => {
            const isThisHost = idx === 0;
            const isMe = p.id === localPlayer?.playerId;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                  isMe
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                    : 'bg-slate-950/50 border-slate-800/80 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                      p.display_name
                    )} flex items-center justify-center text-white font-bold text-sm shadow`}
                  >
                    {p.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <span>{p.display_name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isThisHost ? 'Room Host' : 'Ready to play'}
                    </div>
                  </div>
                </div>

                {isThisHost && (
                  <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg" title="Host">
                    <Crown className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Global Error Banner if any */}
        {error && (
          <div className="mt-4 p-3 bg-rose-950/50 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Start Game or Waiting Action */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          {isHost ? (
            <div className="space-y-2">
              <button
                onClick={handleStart}
                disabled={starting || loading || players.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {starting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting Game...
                  </span>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Game ({players.length} {players.length === 1 ? 'Player' : 'Players'})</span>
                  </>
                )}
              </button>

              {players.length === 1 && (
                <p className="text-center text-[11px] text-slate-400">
                  Tip: Share the link to play with friends, or start now for solo practice!
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-center gap-2.5 text-slate-300 text-xs">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
              <span>Waiting for the host to start the game...</span>
            </div>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomCode={session.room_code}
      />
    </div>
  );
};
