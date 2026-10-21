import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { soundManager } from '../lib/audio';
import { useHistoryLayer } from '../hooks/useHistoryLayer';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  LogOut,
  Share2,
  Home,
  Download,
  Smartphone,
  Share,
  PlusSquare,
  X,
} from 'lucide-react';
import { RulesModal } from './RulesModal';
import { ShareModal } from './ShareModal';
import { MyResultsModal } from './MyResultsModal';
import { ALL_GAMES_COUNT } from '../data/prompts';
import {
  subscribePwaState,
  promptPwaInstall,
  type PwaState,
} from '../utils/pwa';

interface NavbarProps {
  onGoHome?: () => void;
  onOpenQuiz?: (code: string, view?: 'results' | 'play') => void;
  onCreateQuiz?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGoHome,
  onOpenQuiz,
  onCreateQuiz,
}) => {
  const { session, leaveGame } = useGame();
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMyResultsOpen, setIsMyResultsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Back button closes modals instead of leaving the app
  useHistoryLayer(isRulesOpen, () => setIsRulesOpen(false));
  useHistoryLayer(isMyResultsOpen, () => setIsMyResultsOpen(false));
  useHistoryLayer(isShareOpen, () => setIsShareOpen(false));
  useHistoryLayer(showIosGuide, () => setShowIosGuide(false));

  const [pwaState, setPwaState] = useState<PwaState>(() => ({
    isStandalone: false,
    isInstallable: false,
    isUpdateAvailable: false,
    isIos: false,
    hasNotificationSupport: false,
    notificationPermission: 'unsupported',
  }));

  useEffect(() => {
    const unsub = subscribePwaState((state) => {
      setPwaState(state);
    });
    return () => unsub();
  }, []);

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleInstallClick = async () => {
    if (pwaState.isIos) {
      setShowIosGuide(true);
      return;
    }
    await promptPwaInstall();
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
                  {ALL_GAMES_COUNT} Games
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
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Home Icon */}
            <button
              type="button"
              onClick={handleHomeClick}
              title="Return to Game Hub"
              className="p-1.5 sm:p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Install App Button (hidden automatically once installed in standalone mode) */}
            {!pwaState.isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                title="Install PartyHub App on your device"
                className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition flex items-center gap-1 sm:gap-1.5 text-xs font-bold active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Install App</span>
                <span className="md:hidden hidden sm:inline">Install</span>
              </button>
            )}

            {/* My Results Button */}
            <button
              type="button"
              onClick={() => setIsMyResultsOpen(true)}
              title="My Quizzes & Live Results"
              className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition flex items-center gap-1 sm:gap-1.5 text-xs font-bold"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">My Results</span>
            </button>

            {/* Rules Button */}
            <button
              type="button"
              onClick={() => setIsRulesOpen(true)}
              title="How to play"
              className="p-1.5 sm:p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="p-1.5 sm:p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              )}
            </button>

            {session && (
              <button
                type="button"
                onClick={leaveGame}
                title="Leave room"
                className="p-1.5 sm:p-2 text-rose-300 hover:text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded-xl transition"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      
      <MyResultsModal
        isOpen={isMyResultsOpen}
        onClose={() => setIsMyResultsOpen(false)}
        onOpenQuiz={(code, view) => {
          setIsMyResultsOpen(false);
          if (onOpenQuiz) {
            onOpenQuiz(code, view);
          }
        }}
        onCreateNew={onCreateQuiz}
      />

      {session && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          roomCode={session.room_code}
        />
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#0b2545]">
                    Install on iOS Safari
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add PartyHub to your iPhone / iPad Home Screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-[#f8fafc] rounded-2xl p-4 border border-slate-200 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0b2545] text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                  1
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Tap the Safari Share button</span>
                    <Share className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Located at the bottom of your Safari browser bar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0b2545] text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                  2
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Select &ldquo;Add to Home Screen&rdquo;</span>
                    <PlusSquare className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Scroll down through the share options.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0b2545] text-white font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                  3
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">
                    Tap &ldquo;Add&rdquo; in the top-right corner
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    PartyHub will appear on your Home Screen with instant access!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-full bg-[#0b2545] hover:bg-[#13315c] text-white font-bold text-xs transition active:scale-98"
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
