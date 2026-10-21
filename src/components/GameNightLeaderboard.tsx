import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, X, Medal } from 'lucide-react';

interface GameNightLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export const GameNightLeaderboard: React.FC<GameNightLeaderboardProps> = ({ isOpen, onClose }) => {
  const { players, localPlayer } = useGame();

  if (!isOpen) return null;

  const ranked = [...players].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#0b2545]">Game Night Standings</h3>
              <p className="text-xs text-slate-500">Cumulative room points across all games</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-2">
          {ranked.map((player, idx) => {
            const isMe = player.id === localPlayer?.playerId;
            const isTop = idx === 0 && (player.total_score || 0) > 0;

            return (
              <div
                key={player.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                  isTop
                    ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-100 shadow-xs'
                    : isMe
                    ? 'bg-blue-50/70 border-blue-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 text-center font-mono font-black text-xs text-slate-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                      player.display_name
                    )} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs`}
                  >
                    {player.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0b2545] break-words">
                      {player.display_name} {isMe ? '(You)' : ''}
                    </div>
                    {isTop && (
                      <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                        <Medal className="w-3 h-3" /> Leading the Night
                      </div>
                    )}
                  </div>
                </div>

                <div className="font-mono font-black text-sm text-[#0b2545] bg-white px-3 py-1 rounded-xl border border-slate-200">
                  {player.total_score || 0} pts
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-[#0b2545] hover:bg-[#13315c] text-white font-bold py-3 rounded-full transition shadow-sm text-xs sm:text-sm"
          >
            Close Standings
          </button>
        </div>
      </div>
    </div>
  );
};
