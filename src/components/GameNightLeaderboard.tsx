import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, X, Medal } from 'lucide-react';

interface GameNightLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

// Avatar color generator based on player name (kept in sync with the other
// game views' identical helper)
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

export const GameNightLeaderboard: React.FC<GameNightLeaderboardProps> = ({ isOpen, onClose }) => {
  const { players, localPlayer } = useGame();

  if (!isOpen) return null;

  const ranked = [...players].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Game Night Leaderboard</h3>
              <p className="text-xs text-slate-400">Carries across every game tonight</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto">
          {ranked.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-6">No players yet.</div>
          ) : (
            ranked.map((player, idx) => {
              const isMe = player.id === localPlayer?.playerId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                    isMe
                      ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-6 text-center text-sm shrink-0 font-bold text-slate-400">
                      {medal || `#${idx + 1}`}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                        player.display_name
                      )} flex items-center justify-center text-white font-bold text-sm shadow shrink-0`}
                    >
                      {player.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                        <span className="truncate">{player.display_name}</span>
                        {isMe && (
                          <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded-full font-bold shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      {player.is_eliminated && (
                        <div className="text-[11px] text-slate-500">Eliminated this round</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    {idx === 0 && (player.total_score || 0) > 0 && (
                      <Medal className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="font-black text-base text-white">{player.total_score || 0}</span>
                    <span className="text-[10px] text-slate-400">pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
