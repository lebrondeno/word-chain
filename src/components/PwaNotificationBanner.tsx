import React, { useState, useEffect } from 'react';
import {
  subscribePwaState,
  promptPwaInstall,
  applyAppUpdate,
  requestNotificationPermission,
  type PwaState,
} from '../utils/pwa';
import {
  Download,
  RefreshCw,
  X,
  Share,
  PlusSquare,
  Bell,
  Sparkles,
  Smartphone,
} from 'lucide-react';

const STORAGE_DISMISSED_KEY = 'partyhub_pwa_install_dismissed';

interface PwaNotificationBannerProps {
  onOpenIosGuide?: () => void;
}

export const PwaNotificationBanner: React.FC<PwaNotificationBannerProps> = () => {
  const [pwaState, setPwaState] = useState<PwaState>(() => ({
    isStandalone: false,
    isInstallable: false,
    isUpdateAvailable: false,
    isIos: false,
    hasNotificationSupport: false,
    notificationPermission: 'unsupported',
  }));

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(STORAGE_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribePwaState((state) => {
      setPwaState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleDismissInstall = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
    } catch {
      // Safe
    }
  };

  const handleInstallClick = async () => {
    if (pwaState.isIos) {
      setShowIosGuide(true);
      return;
    }
    const accepted = await promptPwaInstall();
    if (accepted) {
      setIsDismissed(true);
    }
  };

  const handleUpdateClick = () => {
    setIsApplyingUpdate(true);
    applyAppUpdate();
  };

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
  };

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* 1. HIGH-PRIORITY: NEW UPDATE AVAILABLE BANNER         */}
      {/* ---------------------------------------------------- */}
      {pwaState.isUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-bounce-subtle">
          <div className="bg-[#0b2545] border-2 border-amber-400/60 rounded-3xl p-4 sm:p-5 text-white shadow-2xl flex flex-col gap-3 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-xl shadow-inner">
                🚀
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-amber-300 tracking-tight">
                    New Update Available!
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                  A fresh version of PartyHub is ready with new features &amp; questions. Tap below to load instantly!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1 relative z-10">
              <button
                type="button"
                onClick={handleUpdateClick}
                disabled={isApplyingUpdate}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-black text-xs shadow-md shadow-emerald-900/30 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isApplyingUpdate ? 'animate-spin' : ''}`} />
                <span>{isApplyingUpdate ? 'Updating...' : 'Install Update Now'}</span>
              </button>

              {pwaState.hasNotificationSupport && pwaState.notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  title="Enable browser update alerts"
                  className="py-2.5 px-3 rounded-full bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Alerts</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. PWA INSTALL BANNER (Floating Light Classic Card)   */}
      {/* ---------------------------------------------------- */}
      {!pwaState.isStandalone && !isDismissed && !pwaState.isUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-40 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 text-slate-800 shadow-xl shadow-slate-900/10 flex flex-col gap-3 relative">
            {/* Close / Dismiss button */}
            <button
              type="button"
              onClick={handleDismissInstall}
              title="Dismiss for now"
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 rounded-2xl bg-[#0b2545] border border-blue-900 flex items-center justify-center shrink-0 shadow-sm text-lg">
                📲
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-black text-sm text-[#0b2545] tracking-tight">
                    Install PartyHub App
                  </h4>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                  Faster play, full-screen view &amp; instant access right from your home screen!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>

              <button
                type="button"
                onClick={handleDismissInstall}
                className="py-2.5 px-3 rounded-full text-slate-500 hover:text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. iOS SAFARI INSTALL INSTRUCTIONS POPOVER / MODAL   */}
      {/* ---------------------------------------------------- */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
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
                    Scroll down through the share actions list.
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
                    PartyHub will appear on your Home Screen with instant offline access!
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
