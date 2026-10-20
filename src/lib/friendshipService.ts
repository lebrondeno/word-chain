import { getSupabase, isSupabaseConfigured } from './supabase';
import type { SanitizedQuestion, CreatorQuestionItem } from '../data/friendshipPrompts';

export interface FriendshipQuizData {
  id: string;
  code: string;
  creator_name: string;
  questions: SanitizedQuestion[];
  total_questions: number;
  created_at: string;
}

export interface FriendshipSubmissionItem {
  id: string;
  quiz_id?: string;
  player_name: string;
  player_name_normalized: string;
  score: number;
  total: number;
  created_at: string;
  rank?: number;
}

const LOCAL_STORAGE_QUIZZES = 'friendship_local_quizzes_v1';
const LOCAL_STORAGE_SECRETS = 'friendship_local_secrets_v1';
const LOCAL_STORAGE_SUBMISSIONS = 'friendship_local_submissions_v1';

/**
 * Strips correctIndex from questions before sending to public storage/network
 */
export function sanitizeQuestions(questions: CreatorQuestionItem[]): SanitizedQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: [...q.options],
    isCustom: q.isCustom,
  }));
}

/**
 * Extracts secret answer key indices [0, 2, 1, 3] from creator questions
 */
export function extractAnswerKey(questions: CreatorQuestionItem[]): number[] {
  return questions.map((q) => q.correctIndex);
}

/**
 * Normalizes player name for deduplication
 */
export function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Generates a clean, friendly 5-character quiz code (excluding ambiguous chars)
 */
export function generateQuizCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function sanitizeQuizCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/**
 * Sorts leaderboard strictly by score DESC, created_at ASC (earlier submission wins tie)
 * and assigns 1-based ranks (1, 2, 3...)
 */
export function sortAndRankSubmissions(submissions: FriendshipSubmissionItem[]): FriendshipSubmissionItem[] {
  const sorted = [...submissions].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeA - timeB;
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * Deduplicates submissions: keeps ONLY the highest score per normalized player name.
 * If score is strictly higher, created_at is updated.
 */
export function deduplicateSubmissions(
  existing: FriendshipSubmissionItem[],
  newSubmission: { playerName: string; score: number; total: number; createdAt?: string }
): FriendshipSubmissionItem[] {
  const normName = normalizePlayerName(newSubmission.playerName);
  const now = newSubmission.createdAt || new Date().toISOString();
  const list = [...existing];
  const existingIdx = list.findIndex((item) => item.player_name_normalized === normName);

  if (existingIdx >= 0) {
    if (newSubmission.score > list[existingIdx].score) {
      // Strictly higher score achieved
      list[existingIdx] = {
        ...list[existingIdx],
        score: newSubmission.score,
        total: newSubmission.total,
        player_name: newSubmission.playerName.trim(),
        created_at: now,
      };
    }
  } else {
    list.push({
      id: `local-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      player_name: newSubmission.playerName.trim(),
      player_name_normalized: normName,
      score: newSubmission.score,
      total: newSubmission.total,
      created_at: now,
    });
  }

  return sortAndRankSubmissions(list);
}

// Local Storage helpers for fallback mode
function getLocalQuizzes(): Record<string, FriendshipQuizData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_QUIZZES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalQuiz(quiz: FriendshipQuizData, secretAnswers: number[]) {
  if (typeof window === 'undefined') return;
  try {
    const quizzes = getLocalQuizzes();
    quizzes[quiz.code] = quiz;
    localStorage.setItem(LOCAL_STORAGE_QUIZZES, JSON.stringify(quizzes));

    const rawSecrets = localStorage.getItem(LOCAL_STORAGE_SECRETS);
    const secrets = rawSecrets ? JSON.parse(rawSecrets) : {};
    secrets[quiz.code] = secretAnswers;
    localStorage.setItem(LOCAL_STORAGE_SECRETS, JSON.stringify(secrets));
  } catch (err) {
    console.warn('Error saving local quiz:', err);
  }
}

function getLocalSecrets(code: string): number[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SECRETS);
    const secrets = raw ? JSON.parse(raw) : {};
    return secrets[code] || null;
  } catch {
    return null;
  }
}

function getLocalSubmissions(code: string): FriendshipSubmissionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS);
    const subs = raw ? JSON.parse(raw) : {};
    return subs[code] || [];
  } catch {
    return [];
  }
}

function saveLocalSubmissions(code: string, list: FriendshipSubmissionItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS);
    const subs = raw ? JSON.parse(raw) : {};
    subs[code] = list;
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS, JSON.stringify(subs));
  } catch (err) {
    console.warn('Error saving local submissions:', err);
  }
}

// ======================================================================
// PUBLIC SERVICE API
// ======================================================================

export async function createFriendshipQuiz(
  creatorName: string,
  questions: CreatorQuestionItem[]
): Promise<{ success: boolean; code?: string; error?: string }> {
  const cleanCode = generateQuizCode();
  const sanitized = sanitizeQuestions(questions);
  const secretAnswers = extractAnswerKey(questions);

  // Always save locally first for instant offline fallback
  const localQuizObj: FriendshipQuizData = {
    id: `local-q-${Date.now()}`,
    code: cleanCode,
    creator_name: creatorName.trim(),
    questions: sanitized,
    total_questions: sanitized.length,
    created_at: new Date().toISOString(),
  };
  saveLocalQuiz(localQuizObj, secretAnswers);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('create_friendship_quiz', {
        p_code: cleanCode,
        p_creator_name: creatorName.trim(),
        p_questions: sanitized,
        p_answer_key: secretAnswers,
      });

      if (!error && data?.success) {
        return { success: true, code: cleanCode };
      }
    } catch {
      // Supabase failed/offline, proceed with local copy
    }
  }

  return { success: true, code: cleanCode };
}

export async function getFriendshipQuiz(
  code: string
): Promise<{ success: boolean; quiz?: FriendshipQuizData; error?: string }> {
  const cleanCode = sanitizeQuizCode(code);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('friendship_quizzes')
        .select('*')
        .eq('code', cleanCode.toLowerCase())
        .single();

      if (!error && data) {
        return {
          success: true,
          quiz: {
            id: data.id,
            code: data.code.toUpperCase(),
            creator_name: data.creator_name,
            questions: data.questions,
            total_questions: data.total_questions,
            created_at: data.created_at,
          },
        };
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Local fallback
  const localQuizzes = getLocalQuizzes();
  const found = localQuizzes[cleanCode] || localQuizzes[cleanCode.toLowerCase()] || localQuizzes[cleanCode.toUpperCase()];
  if (found) {
    return { success: true, quiz: found };
  }

  return { success: false, error: 'Quiz not found. Check the link or code!' };
}

/**
 * Checks single answer with immediate reveal without leaking other answers
 */
export async function checkFriendshipAnswer(
  code: string,
  questionIndex: number,
  selectedOption: number
): Promise<{ isCorrect: boolean; correctOption: number }> {
  const cleanCode = sanitizeQuizCode(code);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('check_friendship_answer', {
        p_code: cleanCode.toLowerCase(),
        p_question_index: questionIndex,
        p_selected_option: selectedOption,
      });

      if (!error && data && data.success) {
        return {
          isCorrect: Boolean(data.is_correct),
          correctOption: Number(data.correct_option),
        };
      }
    } catch {
      // Fallback to local
    }
  }

  // Local fallback
  const secrets = getLocalSecrets(cleanCode) || getLocalSecrets(cleanCode.toUpperCase()) || [];
  const correctOpt = secrets[questionIndex] !== undefined ? secrets[questionIndex] : 0;
  return {
    isCorrect: correctOpt === selectedOption,
    correctOption: correctOpt,
  };
}

/**
 * Submits complete quiz and records authoritatively scored submission
 */
export async function submitFriendshipQuiz(
  code: string,
  playerName: string,
  answers: number[]
): Promise<{ success: boolean; score: number; total: number; error?: string }> {
  const cleanCode = sanitizeQuizCode(code);

  // Authoritative server check if connected
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('submit_friendship_quiz', {
        p_code: cleanCode.toLowerCase(),
        p_player_name: playerName.trim(),
        p_answers: answers,
      });

      if (!error && data && data.success) {
        return {
          success: true,
          score: data.score,
          total: data.total,
        };
      }
    } catch {
      // Fallback
    }
  }

  // Local fallback calculation
  const secrets = getLocalSecrets(cleanCode) || getLocalSecrets(cleanCode.toUpperCase()) || [];
  let score = 0;
  const total = secrets.length || answers.length;

  answers.forEach((ans, idx) => {
    if (secrets[idx] !== undefined && secrets[idx] === ans) {
      score++;
    }
  });

  const currentLocal = getLocalSubmissions(cleanCode);
  const updated = deduplicateSubmissions(currentLocal, {
    playerName: playerName.trim(),
    score,
    total,
  });
  saveLocalSubmissions(cleanCode, updated);

  return {
    success: true,
    score,
    total,
  };
}

/**
 * Gets leaderboard for a quiz ordered by score DESC, created_at ASC
 */
export async function getFriendshipLeaderboard(
  code: string,
  quizId?: string
): Promise<FriendshipSubmissionItem[]> {
  const cleanCode = sanitizeQuizCode(code);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('friendship_submissions')
        .select('*')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true });

      if (quizId) {
        query = query.eq('quiz_id', quizId);
      } else {
        const { data: qData } = await supabase
          .from('friendship_quizzes')
          .select('id')
          .eq('code', cleanCode.toLowerCase())
          .single();
        if (qData?.id) {
          query = query.eq('quiz_id', qData.id);
        }
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return sortAndRankSubmissions(
          data.map((d) => ({
            id: d.id,
            quiz_id: d.quiz_id,
            player_name: d.player_name,
            player_name_normalized: d.player_name_normalized,
            score: d.score,
            total: d.total,
            created_at: d.created_at,
          }))
        );
      }
    } catch {
      // Fallback
    }
  }

  // Local fallback
  const localList = getLocalSubmissions(cleanCode);
  return sortAndRankSubmissions(localList);
}
