import type { HigherLowerCategoryInfo, HigherLowerProvider, HigherLowerValue } from './types';
import { HIGHER_LOWER_CATEGORIES } from '../../data/prompts';

// Mirrors submit_guess's v_spread CASE in supabase/schema.sql exactly -
// keep these two in sync if the difficulty tiers ever change
const DIFFICULTY_SPREAD: Record<string, number> = {
  easy: 0.4,
  medium: 0.2,
  hard: 0.08,
  expert: 0.03,
};

function spreadFor(difficulty: string): number {
  return DIFFICULTY_SPREAD[difficulty] ?? DIFFICULTY_SPREAD.medium;
}

/**
 * Generated provider for the 'random_numbers' category - procedurally
 * produces values with no external dataset, so there's nothing to cache or
 * exhaust. This is the client-side mirror of start_game/submit_guess's
 * 'random_numbers' branch, used only when the RPC call itself fails (see
 * GameContext's startGame/submitGuess fallback paths).
 */
export const generatedProvider: HigherLowerProvider = {
  async getInitialValue(): Promise<HigherLowerValue> {
    // Round base in a presentable range - the difficulty spread only
    // applies from the second value onward, same as the SQL version
    const value = 50 + Math.floor(Math.random() * 49950);
    return { id: null, label: 'Random Number', value };
  },

  async getNextValue(_category, difficulty, currentValue): Promise<HigherLowerValue> {
    const spread = spreadFor(difficulty);
    const factor = 1 + (Math.random() * 2 - 1) * spread;
    const value = Math.max(1, Math.round(currentValue * factor));
    return { id: null, label: 'Random Number', value };
  },

  async getCategoryData(category): Promise<HigherLowerCategoryInfo | null> {
    const info = HIGHER_LOWER_CATEGORIES[category];
    if (!info) return null;
    return { ...info, hasDifficulty: Boolean(info.hasDifficulty) };
  },

  validateValue(value): boolean {
    return Number.isFinite(value) && value >= 1;
  },

  async refreshDataset(): Promise<void> {
    // Nothing to refresh - values are procedurally generated per-guess, not
    // drawn from a stored dataset
  },
};
