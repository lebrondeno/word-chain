import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { soundManager } from '../lib/audio';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Database,
  LogOut,
  Share2,
  Home,
} from 'lucide-react';
import { RulesModal } from './RulesModal';
import { SupabaseModal } from './SupabaseModal';
import { ShareModal } from './ShareModal';

interface NavbarProps {
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGoHome }) => {
  const { session, leaveGame } = useGame();
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleHomeClick = () => {
    if (session) {
      if (window.confirm('Do you want to leave the current game and return to the home hub?')) {
        leaveGame();
        if (onGoHome) onGoHome();
      }
    } else if (onGoHome) {
      onGoHome();
    }
  };

  const configured = isSupabaseConfigured();

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0b2545] border-b border-[#13315c] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <button
            type="button"
            onClick={handleHomeClick}
            className="flex items-center gap-2.5 text-left group transition active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3b4cca] to-[#1f9d55] flex items-center justify-center text-white shadow-sm font-black text-lg border border-white/10">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-white group-hover:text-blue-200 transition">
                  PartyHub
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/20 hidden sm:inline-flex">
                  3 Games
                </span>
              </div>
            </div>
          </button>

          {/* Center: Room Code Badge if in session */}
          {session && (
            <div className="flex items-center gap-1.5 bg-[#13315c] border border-blue-400/20 px-3 py-1.5 rounded-full shadow-inner">
              <span className="text-xs text-blue-200 font-medium">Room:</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-amber-300 tracking-wider">
                {session.room_code}
              </span>
              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                title="Share room"
                className="p-1 hover:bg-white/10 rounded-full text-blue-200 hover:text-white transition ml-0.5"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Home Icon */}
            <button
              type="button"
              onClick={handleHomeClick}
              title="Return to Game Hub"
              className="p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <Home className="w-5 h-5" />
            </button>

            {/* Rules Button */}
            <button
              type="button"
              onClick={() => setIsRulesOpen(true)}
              title="How to play"
              className="p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-slate-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
            </button>

            {/* Supabase connection modal */}
            <button
              type="button"
              onClick={() => setIsSupabaseOpen(true)}
              title={configured ? 'Supabase Connected' : 'Supabase Not Configured'}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs ${
                configured
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30 animate-pulse'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden md:inline font-bold">
                {configured ? 'Database' : 'Setup DB'}
              </span>
            </button>

            {session && (
              <button
                type="button"
                onClick={leaveGame}
                title="Leave room"
                className="p-2 text-rose-300 hover:text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <SupabaseModal isOpen={isSupabaseOpen} onClose={() => setIsSupabaseOpen(false)} />
      {session && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          roomCode={session.room_code}
        />
      )}
    </>
  );
};
