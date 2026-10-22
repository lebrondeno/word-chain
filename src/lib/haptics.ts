/**
 * Mobile Haptic Feedback Engine
 * Safe wrapper around navigator.vibrate with graceful no-ops on desktop/iOS/SSR
 * and synchronization with the sound/feedback mute toggle.
 */

const SOUND_MUTE_STORAGE_KEY = 'word_chain_sound_muted';

export const isHapticsSupported = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  );
};

const memoryStorage = new Map<string, string>();

const getStorage = (): {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
} => {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage) {
    return (globalThis as { localStorage?: Storage }).localStorage!;
  }
  return {
    getItem: (key: string) => memoryStorage.get(key) || null,
    setItem: (key: string, val: string) => { memoryStorage.set(key, String(val)); },
    removeItem: (key: string) => { memoryStorage.delete(key); },
  };
};

export const isFeedbackMuted = (): boolean => {
  const storage = getStorage();
  if (!storage) return false;
  try {
    return storage.getItem(SOUND_MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const triggerVibration = (pattern: number | number[]): boolean => {
  if (isFeedbackMuted()) return false;
  if (!isHapticsSupported()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
};

export const haptics = {
  /**
   * Light 10ms tap tick:
   * Used when selecting quiz options, picking a piece in Tactical Tic-Tac-Toe,
   * or switching categories/tabs.
   */
  tap: (): boolean => triggerVibration(10),

  /**
   * Crisp 20ms pulse:
   * Used when submitting a valid word or answer.
   */
  pulse: (): boolean => triggerVibration(20),
  success: (): boolean => triggerVibration(20),

  /**
   * Warning vibration [25, 40, 25]:
   * Used for invalid moves or submissions.
   */
  warning: (): boolean => triggerVibration([25, 40, 25]),

  /**
   * Double-pulse celebration [30, 50, 40]:
   * Used on game win, high score, or final countdown urgency.
   */
  celebrate: (): boolean => triggerVibration([30, 50, 40]),

  /**
   * Custom vibration pattern.
   */
  custom: (pattern: number | number[]): boolean => triggerVibration(pattern),

  /**
   * Feature detection and mute state queries.
   */
  isSupported: isHapticsSupported,
  isMuted: isFeedbackMuted,
};
