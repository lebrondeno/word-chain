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
} from 'lucide-react';
import { RulesModal } from './RulesModal';
import { SupabaseModal } from './SupabaseModal';
import { ShareModal } from './ShareModal';

export const Navbar: React.FC = () => {
  const { session, leaveGame } = useGame();
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const configured = isSupabaseConfigured();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 font-black text-lg">
              ⛓️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  WordChain
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-flex">
                  Live
                </span>
              </div>
            </div>
          </div>

          {/* Center: Room Code Badge if in session */}
          {session && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full shadow-inner">
              <span className="text-xs text-slate-400 font-medium">Room:</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-indigo-400 tracking-wider">
                {session.room_code}
              </span>
              <button
                onClick={() => setIsShareOpen(true)}
                title="Share room"
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-indigo-300 transition ml-0.5"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Rules Button */}
            <button
              onClick={() => setIsRulesOpen(true)}
              title="How to play"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-slate-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-indigo-400" />
              )}
            </button>

            {/* Supabase connection modal */}
            <button
              onClick={() => setIsSupabaseOpen(true)}
              title={configured ? 'Supabase Connected' : 'Supabase Not Configured'}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs ${
                configured
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 animate-pulse'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden md:inline font-medium">
                {configured ? 'Supabase' : 'Setup DB'}
              </span>
            </button>

            {/* Leave Room Button */}
            {session && (
              <button
                onClick={leaveGame}
                title="Leave room"
                className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
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
