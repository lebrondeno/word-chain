export interface UserSavedQuiz {
  code: string;
  creatorName: string;
  totalQuestions: number;
  createdAt: string;
  isCreator: boolean;
  myScore?: number;
}

export interface QuizDraft {
  creatorName: string;
  quizLength: number;
  vibePack?: string;
  builderQuestions: any[];
  currentBuilderIndex: number;
  usedTemplateIds: string[];
  savedAt: string;
}

const STORAGE_MY_QUIZZES = 'partyhub_my_quizzes';
const STORAGE_QUIZ_DRAFT = 'partyhub_quiz_draft';

// Fallback in-memory map for headless/Node environments
const memoryStorage = new Map<string, string>();

function getStorage(kind: 'local' | 'session' = 'local'): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof window !== 'undefined') {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    if (s) return s;
  }
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as unknown as Record<string, Storage | undefined>;
    const s = kind === 'local' ? g.localStorage : g.sessionStorage;
    if (s) return s;
  }
  // In-memory fallback
  return {
    getItem: (key: string) => memoryStorage.get(key) || null,
    setItem: (key: string, val: string) => { memoryStorage.set(key, val); },
    removeItem: (key: string) => { memoryStorage.delete(key); },
  };
}

/**
 * Returns all saved quizzes (created or played) from localStorage
 */
export function getMySavedQuizzes(): UserSavedQuiz[] {
  try {
    const storage = getStorage('local');
    const raw = storage.getItem(STORAGE_MY_QUIZZES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading partyhub_my_quizzes:', err);
    return [];
  }
}

/**
 * Saves or updates a created quiz in local history
 */
export function saveCreatedQuizToHistory(quiz: {
  code: string;
  creatorName: string;
  totalQuestions: number;
  createdAt?: string;
}): void {
  try {
    const storage = getStorage('local');
    const list = getMySavedQuizzes();
    const cleanCode = quiz.code.trim().toUpperCase();
    const existingIdx = list.findIndex((q) => q.code.toUpperCase() === cleanCode);

    const entry: UserSavedQuiz = {
      code: cleanCode,
      creatorName: quiz.creatorName.trim(),
      totalQuestions: quiz.totalQuestions,
      createdAt: quiz.createdAt || new Date().toISOString(),
      isCreator: true,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = {
        ...list[existingIdx],
        ...entry,
        isCreator: true,
      };
    } else {
      list.unshift(entry);
    }

    storage.setItem(STORAGE_MY_QUIZZES, JSON.stringify(list));
  } catch (err) {
    console.warn('Error saving created quiz to partyhub_my_quizzes:', err);
  }
}

/**
 * Saves or updates a played quiz score in local history
 */
export function savePlayedQuizToHistory(quiz: {
  code: string;
  creatorName: string;
  totalQuestions: number;
  score: number;
  createdAt?: string;
}): void {
  try {
    const storage = getStorage('local');
    const list = getMySavedQuizzes();
    const cleanCode = quiz.code.trim().toUpperCase();
    const existingIdx = list.findIndex((q) => q.code.toUpperCase() === cleanCode);

    if (existingIdx >= 0) {
      const existing = list[existingIdx];
      const bestScore = existing.myScore !== undefined ? Math.max(existing.myScore, quiz.score) : quiz.score;
      list[existingIdx] = {
        ...existing,
        myScore: bestScore,
        createdAt: quiz.createdAt || existing.createdAt || new Date().toISOString(),
      };
    } else {
      list.unshift({
        code: cleanCode,
        creatorName: quiz.creatorName.trim(),
        totalQuestions: quiz.totalQuestions,
        createdAt: quiz.createdAt || new Date().toISOString(),
        isCreator: false,
        myScore: quiz.score,
      });
    }

    storage.setItem(STORAGE_MY_QUIZZES, JSON.stringify(list));
  } catch (err) {
    console.warn('Error saving played quiz to partyhub_my_quizzes:', err);
  }
}

/**
 * Removes a quiz entry from local history
 */
export function removeQuizFromHistory(code: string): UserSavedQuiz[] {
  try {
    const storage = getStorage('local');
    const cleanCode = code.trim().toUpperCase();
    const list = getMySavedQuizzes().filter((q) => q.code.toUpperCase() !== cleanCode);
    storage.setItem(STORAGE_MY_QUIZZES, JSON.stringify(list));
    return list;
  } catch (err) {
    console.warn('Error removing quiz from partyhub_my_quizzes:', err);
    return getMySavedQuizzes();
  }
}

/**
 * In-progress draft helpers to survive page refresh
 */
export function getQuizDraft(): QuizDraft | null {
  try {
    const lStorage = getStorage('local');
    const sStorage = getStorage('session');
    const raw = lStorage.getItem(STORAGE_QUIZ_DRAFT) || sStorage.getItem(STORAGE_QUIZ_DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.builderQuestions) && parsed.builderQuestions.length > 0) {
      return parsed as QuizDraft;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveQuizDraft(draft: Omit<QuizDraft, 'savedAt'>): void {
  try {
    const lStorage = getStorage('local');
    const sStorage = getStorage('session');
    const payload: QuizDraft = {
      ...draft,
      savedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(payload);
    lStorage.setItem(STORAGE_QUIZ_DRAFT, json);
    sStorage.setItem(STORAGE_QUIZ_DRAFT, json);
  } catch (err) {
    console.warn('Failed to save quiz draft:', err);
  }
}

export function clearQuizDraft(): void {
  try {
    const lStorage = getStorage('local');
    const sStorage = getStorage('session');
    lStorage.removeItem(STORAGE_QUIZ_DRAFT);
    sStorage.removeItem(STORAGE_QUIZ_DRAFT);
  } catch (err) {
    console.warn('Failed to clear quiz draft:', err);
  }
}

// ---------------------------------------------------------------------------
// Ownership & completion (guest flow gating)
//
// - "Created quizzes": codes this browser created, each with a random creator
//   token. Only these devices may open the creator leaderboard shortcut.
// - "Completed quizzes": quizzes this browser finished as a guest (name, score,
//   answers). Only after completion is the score breakdown / live leaderboard
//   unlocked for non-creators - also on later visits to the same link.
// ---------------------------------------------------------------------------

const STORAGE_CREATED_QUIZZES = 'partyhub_created_quizzes';
const STORAGE_COMPLETED_QUIZZES = 'partyhub_completed_quizzes';

export interface CreatedQuizRecord {
  code: string;
  token: string;
  createdAt: string;
}

export interface QuizCompletionRecord {
  code: string;
  playerName: string;
  score: number;
  total: number;
  answers: number[];
  completedAt: string;
}

/** 'creator' = made this quiz on this device; 'completed' = guest who finished it; 'guest' = neither. */
export type QuizAccessLevel = 'creator' | 'completed' | 'guest';

const cleanQuizCode = (code: string) => (code || '').trim().toUpperCase();

function readRecordMap<T>(key: string): Record<string, T> {
  try {
    const raw = getStorage('local').getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeRecordMap<T>(key: string, map: Record<string, T>): void {
  try {
    getStorage('local').setItem(key, JSON.stringify(map));
  } catch (err) {
    console.warn(`Error writing ${key}:`, err);
  }
}

function generateCreatorToken(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(12);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Persists creator ownership of `code` on this device. Idempotent - keeps the original token. */
export function markQuizCreatedByMe(code: string): CreatedQuizRecord | null {
  const clean = cleanQuizCode(code);
  if (!clean) return null;
  const map = readRecordMap<CreatedQuizRecord>(STORAGE_CREATED_QUIZZES);
  if (!map[clean]) {
    map[clean] = { code: clean, token: generateCreatorToken(), createdAt: new Date().toISOString() };
    writeRecordMap(STORAGE_CREATED_QUIZZES, map);
  }
  return map[clean];
}

/**
 * True only on the device/browser that created this quiz. Also honours quizzes
 * recorded as created in the older partyhub_my_quizzes history.
 */
export function isQuizCreator(code: string): boolean {
  const clean = cleanQuizCode(code);
  if (!clean) return false;
  if (readRecordMap<CreatedQuizRecord>(STORAGE_CREATED_QUIZZES)[clean]?.token) return true;
  return getMySavedQuizzes().some((q) => cleanQuizCode(q.code) === clean && q.isCreator === true);
}

/** Saves a guest's finished quiz so reopening the link shows their score + leaderboard. */
export function saveQuizCompletion(input: {
  code: string;
  playerName: string;
  score: number;
  total: number;
  answers: number[];
}): void {
  const clean = cleanQuizCode(input.code);
  if (!clean) return;
  const map = readRecordMap<QuizCompletionRecord>(STORAGE_COMPLETED_QUIZZES);
  const existing = map[clean];
  // Keep the best attempt, mirroring the server-side "highest score per name" rule
  if (existing && existing.playerName === input.playerName.trim() && existing.score > input.score) return;
  map[clean] = {
    code: clean,
    playerName: input.playerName.trim(),
    score: input.score,
    total: input.total,
    answers: [...input.answers],
    completedAt: new Date().toISOString(),
  };
  writeRecordMap(STORAGE_COMPLETED_QUIZZES, map);
}

export function getQuizCompletion(code: string): QuizCompletionRecord | null {
  const clean = cleanQuizCode(code);
  if (!clean) return null;
  const rec = readRecordMap<QuizCompletionRecord>(STORAGE_COMPLETED_QUIZZES)[clean];
  return rec && typeof rec.score === 'number' && typeof rec.total === 'number' ? rec : null;
}

export function hasCompletedQuiz(code: string): boolean {
  return getQuizCompletion(code) !== null;
}

export function getQuizAccessLevel(code: string): QuizAccessLevel {
  if (isQuizCreator(code)) return 'creator';
  if (hasCompletedQuiz(code)) return 'completed';
  return 'guest';
}

/** Only the creator may bypass the quiz; guests need a completed submission. */
export function canBypassToCreatorLeaderboard(code: string): boolean {
  return getQuizAccessLevel(code) === 'creator';
}

/** Live leaderboard is unlocked for the creator, or for a guest after finishing every question. */
export function canViewQuizLeaderboard(code: string): boolean {
  return getQuizAccessLevel(code) !== 'guest';
}

/** What a shared quiz link should open for the current device. */
export type SharedQuizEntryScreen = 'creator_summary' | 'guest_result' | 'welcome';

export function resolveSharedQuizEntry(
  code: string,
  requestedView: 'play' | 'results' | 'create' = 'play'
): SharedQuizEntryScreen {
  const level = getQuizAccessLevel(code);
  if (requestedView === 'results') {
    if (level === 'creator') return 'creator_summary';
    if (level === 'completed') return 'guest_result';
    return 'welcome'; // guests can never skip the quiz via ?view=results
  }
  if (level === 'creator') return 'welcome'; // creator sees the welcome card + 👑 shortcut
  if (level === 'completed') return 'guest_result';
  return 'welcome';
}
