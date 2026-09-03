/**
 * One-time/manual content-seeding utility - NOT part of the deployed app.
 *
 * Fetches multiple-choice trivia questions from the free, public Open
 * Trivia DB API (https://opentdb.com) across a handful of categories
 * relevant to a "Trivia" / "Fastest Finger" game mode, and inserts them
 * into game_prompts under engine = 'trivia'. Safe to re-run: questions are
 * deduped on exact prompt_text via ON CONFLICT DO NOTHING, so repeat runs
 * only add newly-fetched questions.
 *
 * Run manually:
 *   npx tsx scripts/seed-trivia.ts
 *
 * Requires in .env:
 *   SUPABASE_URL (or the app's existing VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY - from Supabase Dashboard > Project Settings >
 *     API > "service_role" secret key (NOT the anon key). This script needs
 *     it to bypass RLS and write content, so it must only ever run locally -
 *     never commit this key or reference it from client-side code.
 *
 * This script also assumes supabase/schema.sql has been (re-)run so that
 * game_prompts has its correct_answer column and its unique index on
 * prompt_text (both added alongside this script).
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// --- Minimal .env loader --------------------------------------------------
// Avoids pulling in the `dotenv` package for a handful of KEY=VALUE lines.
function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const contents = readFileSync(filePath, 'utf-8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(__dirname, '..', '.env'));

// --- Categories --------------------------------------------------------
// Open Trivia DB category IDs for a general "Trivia" / "Fastest Finger" mix
const CATEGORIES: { id: number; slug: string }[] = [
  { id: 9, slug: 'general_knowledge' },
  { id: 21, slug: 'sports' },
  { id: 22, slug: 'geography' },
  { id: 27, slug: 'animals' },
  { id: 23, slug: 'history' },
];

const AMOUNT_PER_CATEGORY = 50; // Open Trivia DB's max per request
const REQUEST_DELAY_MS = 5500; // Open Trivia DB allows ~1 request / 5s per IP
const INSERT_CHUNK_SIZE = 200;

interface OpenTriviaQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTriviaResponse {
  response_code: number;
  results: OpenTriviaQuestion[];
}

interface TriviaPromptRow {
  engine: 'trivia';
  category: string;
  prompt_text: string;
  options: string[];
  correct_answer: string;
}

interface InsertedRow {
  id: string;
  category: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fisher-Yates shuffle
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Open Trivia DB's default encoding returns HTML entities (&quot;, &#039;,
// &amp;, ...). Requesting url3986 encoding instead means every text field
// comes back as a clean percent-encoded string that decodeURIComponent
// turns straight into plain text - no hand-rolled HTML-entity decoder needed.
function decode(text: string): string {
  return decodeURIComponent(text);
}

async function fetchCategoryQuestions(
  categoryId: number,
  amount: number,
  attempt = 1
): Promise<OpenTriviaQuestion[]> {
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&type=multiple&encode=url3986`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open Trivia DB request failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as OpenTriviaResponse;

  // response_code: 0 = success, 1 = not enough questions available for the
  // category/amount requested, 5 = rate limited (back off and retry)
  if (data.response_code === 5 && attempt <= 3) {
    console.warn(`  Rate limited by Open Trivia DB, waiting ${REQUEST_DELAY_MS}ms and retrying...`);
    await sleep(REQUEST_DELAY_MS);
    return fetchCategoryQuestions(categoryId, amount, attempt + 1);
  }

  if (data.response_code !== 0) {
    console.warn(`  Open Trivia DB response_code ${data.response_code} - no usable results`);
    return [];
  }

  return data.results;
}

function transformQuestion(q: OpenTriviaQuestion, categorySlug: string): TriviaPromptRow {
  const correctAnswer = decode(q.correct_answer);
  const options = shuffle([q.correct_answer, ...q.incorrect_answers]).map(decode);
  return {
    engine: 'trivia',
    category: categorySlug,
    prompt_text: decode(q.question),
    options,
    correct_answer: correctAnswer,
  };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY in .env.\n\n' +
        'Add SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard > Project Settings > API\n' +
        '(the "service_role" secret key, NOT the anon key) before running this script.\n' +
        'Never commit this key or use it in client-side code.'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Fetching trivia questions from Open Trivia DB across ${CATEGORIES.length} categories...\n`);

  const fetchCounts: Record<string, number> = {};
  const insertedCounts: Record<string, number> = {};
  const allRows: TriviaPromptRow[] = [];

  for (let i = 0; i < CATEGORIES.length; i++) {
    const { id, slug } = CATEGORIES[i];
    console.log(`[${slug}] Requesting ${AMOUNT_PER_CATEGORY} questions (category id ${id})...`);
    const questions = await fetchCategoryQuestions(id, AMOUNT_PER_CATEGORY);
    fetchCounts[slug] = questions.length;
    console.log(`[${slug}] Fetched ${questions.length} questions`);

    allRows.push(...questions.map((q) => transformQuestion(q, slug)));

    // Respect Open Trivia DB's rate limit between category requests
    if (i < CATEGORIES.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  if (allRows.length === 0) {
    console.log('\nNo questions fetched - nothing to insert.');
    return;
  }

  console.log(`\nInserting ${allRows.length} questions into game_prompts (duplicates skipped)...`);

  // ON CONFLICT (prompt_text) DO NOTHING via upsert + ignoreDuplicates, so
  // re-running this script never inserts the same question twice. Chunked
  // to stay well under Supabase's request payload limits.
  const insertedRows: InsertedRow[] = [];
  for (let i = 0; i < allRows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = allRows.slice(i, i + INSERT_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('game_prompts')
      .upsert(chunk, { onConflict: 'prompt_text', ignoreDuplicates: true })
      .select('id, category');

    if (error) {
      if (error.code === '42703' || error.message.includes('correct_answer')) {
        console.error(
          '\nInsert failed: the "correct_answer" column is missing from game_prompts.\n' +
            'Run the updated supabase/schema.sql in the Supabase SQL Editor first, then re-run this script.'
        );
        process.exit(1);
      }
      throw error;
    }

    if (data) insertedRows.push(...(data as InsertedRow[]));
  }

  for (const row of insertedRows) {
    insertedCounts[row.category] = (insertedCounts[row.category] || 0) + 1;
  }

  console.log('\n=== Summary ===');
  for (const { slug } of CATEGORIES) {
    const fetched = fetchCounts[slug] || 0;
    const inserted = insertedCounts[slug] || 0;
    const skipped = fetched - inserted;
    console.log(
      `${slug.padEnd(20)} fetched: ${String(fetched).padStart(3)}  inserted: ${String(inserted).padStart(3)}  skipped (duplicates): ${skipped}`
    );
  }

  const totalFetched = Object.values(fetchCounts).reduce((a, b) => a + b, 0);
  const totalInserted = insertedRows.length;
  console.log(
    `\nTotal fetched: ${totalFetched}  |  Total inserted: ${totalInserted}  |  Total skipped: ${totalFetched - totalInserted}`
  );
}

main().catch((err) => {
  console.error('\nSeed script failed:', err);
  process.exit(1);
});
