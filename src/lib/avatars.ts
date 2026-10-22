/**
 * Curated Player Avatar Medallions & Identity Engine
 * 12 curated emoji medallions with matching gradient rings,
 * localStorage persistence, and deterministic fallback.
 */

export interface AvatarMedallionData {
  id: string;
  emoji: string;
  label: string;
  ringGradient: string;
  bgGradient: string;
  glowColor: string;
  hex: string;
}

export const AVATAR_LIST: AvatarMedallionData[] = [
  {
    id: 'electric',
    emoji: '⚡',
    label: 'Electric',
    ringGradient: 'from-amber-400 to-yellow-600',
    bgGradient: 'from-amber-500/20 to-yellow-600/30',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    hex: '#f59e0b',
  },
  {
    id: 'crown',
    emoji: '👑',
    label: 'Royalty',
    ringGradient: 'from-yellow-300 to-amber-500',
    bgGradient: 'from-yellow-400/20 to-amber-500/30',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    hex: '#eab308',
  },
  {
    id: 'fire',
    emoji: '🔥',
    label: 'Fire',
    ringGradient: 'from-orange-500 to-red-600',
    bgGradient: 'from-orange-500/20 to-red-600/30',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    hex: '#f97316',
  },
  {
    id: 'fox',
    emoji: '🦊',
    label: 'Fox',
    ringGradient: 'from-orange-400 to-amber-600',
    bgGradient: 'from-orange-400/20 to-amber-600/30',
    glowColor: 'rgba(251, 146, 60, 0.4)',
    hex: '#fb923c',
  },
  {
    id: 'rocket',
    emoji: '🚀',
    label: 'Rocket',
    ringGradient: 'from-cyan-400 to-blue-600',
    bgGradient: 'from-cyan-400/20 to-blue-600/30',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    hex: '#06b6d4',
  },
  {
    id: 'target',
    emoji: '🎯',
    label: 'Bullseye',
    ringGradient: 'from-rose-500 to-red-600',
    bgGradient: 'from-rose-500/20 to-red-600/30',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    hex: '#f43f5e',
  },
  {
    id: 'diamond',
    emoji: '💎',
    label: 'Diamond',
    ringGradient: 'from-cyan-300 to-sky-500',
    bgGradient: 'from-cyan-300/20 to-sky-500/30',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    hex: '#38bdf8',
  },
  {
    id: 'lion',
    emoji: '🦁',
    label: 'Lion',
    ringGradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/20 to-orange-600/30',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    hex: '#f59e0b',
  },
  {
    id: 'ghost',
    emoji: '👻',
    label: 'Ghost',
    ringGradient: 'from-purple-400 to-indigo-500',
    bgGradient: 'from-purple-400/20 to-indigo-500/30',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    hex: '#a855f7',
  },
  {
    id: 'brain',
    emoji: '🧠',
    label: 'Brain',
    ringGradient: 'from-pink-400 to-rose-500',
    bgGradient: 'from-pink-400/20 to-rose-500/30',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    hex: '#ec4899',
  },
  {
    id: 'dice',
    emoji: '🎲',
    label: 'Dice',
    ringGradient: 'from-emerald-400 to-teal-600',
    bgGradient: 'from-emerald-400/20 to-teal-600/30',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    hex: '#10b981',
  },
  {
    id: 'star',
    emoji: '🌟',
    label: 'Star',
    ringGradient: 'from-yellow-400 to-amber-500',
    bgGradient: 'from-yellow-400/20 to-amber-500/30',
    glowColor: 'rgba(250, 204, 21, 0.4)',
    hex: '#facc15',
  },
];

export const STORAGE_AVATAR_KEY = 'word_chain_saved_avatar';

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

/**
 * Retrieve the saved avatar emoji from localStorage, or default to '⚡'.
 */
export const getSavedAvatar = (): string => {
  const storage = getStorage();
  if (!storage) return '⚡';
  try {
    const saved = storage.getItem(STORAGE_AVATAR_KEY);
    if (saved && AVATAR_LIST.some((a) => a.emoji === saved || a.id === saved)) {
      const match = AVATAR_LIST.find((a) => a.emoji === saved || a.id === saved);
      return match ? match.emoji : '⚡';
    }
  } catch {
    // Safe
  }
  return '⚡';
};

/**
 * Save player's avatar choice to localStorage.
 */
export const saveAvatar = (avatarEmojiOrId: string): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    const match = AVATAR_LIST.find(
      (a) => a.emoji === avatarEmojiOrId || a.id === avatarEmojiOrId
    );
    const val = match ? match.emoji : avatarEmojiOrId;
    storage.setItem(STORAGE_AVATAR_KEY, val);
  } catch {
    // Safe
  }
};

/**
 * Fast string hash for deterministic avatar assignment.
 */
export const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * Extract leading avatar emoji if name begins with one of our curated avatars.
 */
export const extractPlayerAvatar = (
  rawDisplayName: string
): { cleanName: string; avatar: AvatarMedallionData } => {
  const trimmed = (rawDisplayName || '').trim();
  for (const item of AVATAR_LIST) {
    if (trimmed.startsWith(item.emoji)) {
      const remainder = trimmed.slice(item.emoji.length).trim();
      return {
        cleanName: remainder || trimmed,
        avatar: item,
      };
    }
  }

  // Fallback: deterministic avatar based on name hash
  const idx = hashString(trimmed || 'Player') % AVATAR_LIST.length;
  return {
    cleanName: trimmed || 'Player',
    avatar: AVATAR_LIST[idx],
  };
};

/**
 * Get AvatarMedallionData for a given player name or explicit avatar choice.
 */
export const getAvatarForPlayer = (
  displayName: string,
  preferredEmoji?: string
): AvatarMedallionData => {
  if (preferredEmoji) {
    const match = AVATAR_LIST.find(
      (a) => a.emoji === preferredEmoji || a.id === preferredEmoji
    );
    if (match) return match;
  }
  return extractPlayerAvatar(displayName).avatar;
};

/**
 * Format player name with avatar prefix for cross-client persistence.
 */
export const formatPlayerNameWithAvatar = (name: string, avatarEmoji: string): string => {
  const clean = extractPlayerAvatar(name).cleanName;
  return `${avatarEmoji} ${clean}`.trim();
};
