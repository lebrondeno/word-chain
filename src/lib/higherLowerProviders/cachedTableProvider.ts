import type { HigherLowerCategoryInfo, HigherLowerProvider, HigherLowerValue } from './types';
import { HIGHER_LOWER_CATEGORIES } from '../../data/prompts';
import { getSupabase } from '../supabase';

/**
 * Cached-table provider - backs every non-generated category (population,
 * football_stats, and any future category populated by its own seed
 * script) with a single, generic implementation. It never calls a live
 * external API itself; it only reads game_prompts rows that a seed script
 * (e.g. scripts/seed-higher-lower.ts) already wrote there with
 * engine='higher_lower'. This is what makes adding a new external-data
 * category free of engine/RPC changes - write the seed script, add a
 * HIGHER_LOWER_CATEGORIES entry, and this provider picks it up by category
 * name alone.
 *
 * This is the client-side mirror of start_game/submit_guess's cached-table
 * branch in supabase/schema.sql, used only when the RPC call itself fails.
 */
export const cachedTableProvider: HigherLowerProvider = {
  async getInitialValue(category): Promise<HigherLowerValue> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('game_prompts')
      .select('*')
      .eq('engine', 'higher_lower')
      .eq('category', category);

    if (!data || data.length === 0) {
      throw new Error(
        `No higher_lower prompts available for category "${category}". Run scripts/seed-higher-lower.ts (or re-run supabase/schema.sql for the bundled categories) first.`
      );
    }

    const selected = data[Math.floor(Math.random() * data.length)];
    return { id: selected.id, label: selected.prompt_text, value: selected.numeric_value ?? 0 };
  },

  async getNextValue(category, _difficulty, _currentValue, excludeIds): Promise<HigherLowerValue> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('game_prompts')
      .select('*')
      .eq('engine', 'higher_lower')
      .eq('category', category);

    if (!data || data.length === 0) {
      throw new Error(
        `No higher_lower prompts available for category "${category}". Run scripts/seed-higher-lower.ts (or re-run supabase/schema.sql for the bundled categories) first.`
      );
    }

    // Exclude everything already shown this game; if every prompt in the
    // category has been used, cycle and allow any from it - same fallback
    // ladder as submit_guess's SQL
    const unused = data.filter((p) => !excludeIds.includes(p.id));
    const pool = unused.length > 0 ? unused : data;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return { id: selected.id, label: selected.prompt_text, value: selected.numeric_value ?? 0 };
  },

  async getCategoryData(category): Promise<HigherLowerCategoryInfo | null> {
    const info = HIGHER_LOWER_CATEGORIES[category];
    if (!info) return null;
    return { ...info, hasDifficulty: Boolean(info.hasDifficulty) };
  },

  validateValue(value): boolean {
    return Number.isFinite(value);
  },

  async refreshDataset(category): Promise<void> {
    // This provider runs with the anon key and RLS-public access - it can
    // read game_prompts but has no service-role credentials to call an
    // external API and write fresh rows. Refreshing a dataset is a manual,
    // service-role operation: `npx tsx scripts/seed-higher-lower.ts`.
    throw new Error(
      `Cannot refresh "${category}" from the client. Run \`npx tsx scripts/seed-higher-lower.ts\` with SUPABASE_SERVICE_ROLE_KEY set instead.`
    );
  },
};
