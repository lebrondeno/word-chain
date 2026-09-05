/**
 * One-time/manual content-seeding utility - NOT part of the deployed app.
 *
 * Fetches country population figures from the free, public REST Countries
 * API and inserts them into game_prompts under engine = 'higher_lower',
 * category = 'population' - the cached-table data source that
 * cachedTableProvider (src/lib/higherLowerProviders/cachedTableProvider.ts)
 * and submit_guess's SQL both read from at game time (the API itself is
 * never called live during gameplay - see that provider's doc comment).
 * Safe to re-run: rows are deduped on exact prompt_text via
 * ON CONFLICT DO NOTHING, so repeat runs only add newly-fetched countries.
 *
 * Run manually:
 *   npx tsx scripts/seed-higher-lower.ts
 *
 * Requires in .env:
 *   SUPABASE_URL (or the app's existing VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY - from Supabase Dashboard > Project Settings >
 *     API > "service_role" secret key (NOT the anon key). This script needs
 *     it to bypass RLS and write content, so it must only ever run locally -
 *     never commit this key or reference it from client-side code.
 *
 * This script also assumes supabase/schema.sql has been (re-)run so that
 * game_prompts has its numeric_value/source/last_updated columns and its
 * unique index on prompt_text (all added alongside the higher_lower engine).
 *
 * NOTE ON THE API: restcountries.com/v3.1 (the endpoint this script targets,
 * per the original spec) was verified live as fully deprecated at the time
 * this script was written - every v3.1 route now returns a
 * "This API version has been deprecated" error pointing at a v5 migration
 * that appears to require its own signup/API key. If that's still true when
 * you run this, it fails with a clear error below rather than silently
 * inserting nothing; update API_URL to whatever endpoint/auth you have
 * access to and the rest of the script (transform, dedupe, insert) needs no
 * changes. The 8 curated population rows already bundled in
 * supabase/schema.sql (source='manual') work today regardless.
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

const API_URL = 'https://restcountries.com/v3.1/all?fields=name,population';
const MAX_ENTRIES = 50;
const INSERT_CHUNK_SIZE = 200;

interface RestCountry {
  name: { common: string };
  population: number;
}

interface HigherLowerPromptRow {
  engine: 'higher_lower';
  category: 'population';
  prompt_text: string;
  numeric_value: number;
  source: 'restcountries_api';
}

async function fetchCountries(): Promise<RestCountry[]> {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`REST Countries request failed: HTTP ${res.status}`);
  }

  const data = await res.json();

  // The deprecated v3.1 endpoint responds 200 OK with a JSON error body
  // rather than a non-2xx status - `success: false` is how it actually
  // signals failure, so check for that explicitly rather than trusting res.ok
  if (!Array.isArray(data)) {
    const message =
      data && typeof data === 'object' && 'errors' in data
        ? JSON.stringify((data as { errors: unknown }).errors)
        : JSON.stringify(data);
    throw new Error(
      `REST Countries API did not return a country list (got: ${message}).\n` +
        'This endpoint may have changed - see the NOTE ON THE API comment at the top of this file.'
    );
  }

  return data as RestCountry[];
}

function transformCountries(countries: RestCountry[]): HigherLowerPromptRow[] {
  // Dedupe by name (the API has occasionally listed disputed territories
  // twice under slightly different population snapshots), then take the
  // MAX_ENTRIES largest populations - biggest/most-recognizable countries
  // make for a fairer, more guessable spread than a purely random sample
  const byName = new Map<string, RestCountry>();
  for (const c of countries) {
    if (!c.name?.common || !Number.isFinite(c.population) || c.population <= 0) continue;
    byName.set(c.name.common, c);
  }

  return Array.from(byName.values())
    .sort((a, b) => b.population - a.population)
    .slice(0, MAX_ENTRIES)
    .map((c) => ({
      engine: 'higher_lower' as const,
      category: 'population' as const,
      prompt_text: `${c.name.common}'s population`,
      numeric_value: Math.round(c.population),
      source: 'restcountries_api' as const,
    }));
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
    // process.exitCode (not process.exit()) - forcing an immediate exit here
    // races pending fetch/libuv handles and crashes with a libuv assertion
    // on Windows instead of exiting cleanly. Setting exitCode and returning
    // lets Node drain the event loop and exit on its own.
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Fetching country populations from ${API_URL}...\n`);
  const countries = await fetchCountries();
  console.log(`Fetched ${countries.length} countries`);

  const rows = transformCountries(countries);
  console.log(`Selected top ${rows.length} by population (deduped, capped at ${MAX_ENTRIES})\n`);

  if (rows.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  console.log(`Inserting ${rows.length} rows into game_prompts (duplicates skipped)...`);

  // ON CONFLICT (prompt_text) DO NOTHING via upsert + ignoreDuplicates, so
  // re-running this script never inserts the same country twice
  let insertedCount = 0;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('game_prompts')
      .upsert(chunk, { onConflict: 'prompt_text', ignoreDuplicates: true })
      .select('id');

    if (error) {
      if (error.code === '42703' || error.message.includes('numeric_value') || error.message.includes('source')) {
        console.error(
          '\nInsert failed: a required column is missing from game_prompts.\n' +
            'Run the updated supabase/schema.sql in the Supabase SQL Editor first, then re-run this script.'
        );
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    insertedCount += data?.length || 0;
  }

  console.log(
    `\nDone. Fetched: ${countries.length}  |  Selected: ${rows.length}  |  Inserted: ${insertedCount}  |  Skipped (duplicates): ${rows.length - insertedCount}`
  );
}

main().catch((err) => {
  console.error('\nSeed script failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
