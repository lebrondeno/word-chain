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
