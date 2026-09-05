/**
 * Data-provider abstraction for the "Higher or Lower" game type.
 *
 * IMPORTANT: these providers are the CLIENT-SIDE fallback data source only -
 * the same role pickRandomPrompt plays for vote_reveal/most_likely/trivia
 * elsewhere in this codebase. The server is authoritative: supabase/
 * schema.sql's start_game and submit_guess RPCs pick every real in-game
 * value themselves (never trusting a client-submitted "next value", only a
 * client-submitted guess), mirroring this same category-driven branch
 * ('random_numbers' generated in SQL vs. every other category pulled from
 * the game_prompts cache table). GameContext only reaches for a provider
 * when the RPC call itself fails and it has to fall back to direct table
 * mutations - see submitGuess/startGame in src/context/GameContext.tsx.
 *
 * Adding a new cached-table category (mountains, movie revenue, geography,
 * ...) never needs a new provider or RPC change - write a seed script that
 * inserts game_prompts rows under engine='higher_lower' with the new
 * category, add a HIGHER_LOWER_CATEGORIES entry in src/data/prompts.ts, and
 * cachedTableProvider picks it up generically. A genuinely new *kind* of
 * source (e.g. a live-called sports-stats API) is the case this interface
 * exists for - implement HigherLowerProvider once for it and register it in
 * ./index.ts's category -> provider map.
 */

export interface HigherLowerValue {
  /** null for generated values, which are drawn from no finite pool */
  id: string | null;
  label: string;
  value: number;
}

export interface HigherLowerCategoryInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Whether the lobby should show the Easy/Medium/Hard/Expert selector for this category */
  hasDifficulty: boolean;
}

export interface HigherLowerProvider {
  /** The starting value shown before any guess has been made this game */
  getInitialValue(category: string, difficulty: string): Promise<HigherLowerValue>;
  /** The next value to compare a guess against, excluding anything already shown this game */
  getNextValue(
    category: string,
    difficulty: string,
    currentValue: number,
    excludeIds: string[]
  ): Promise<HigherLowerValue>;
  getCategoryData(category: string): Promise<HigherLowerCategoryInfo | null>;
  /** Basic sanity guard - finite, usable as a comparison value */
  validateValue(value: number): boolean;
  /**
   * Refresh this category's underlying dataset. Cached-table categories are
   * refreshed by re-running their seed script (e.g. scripts/seed-higher-
   * lower.ts) with service-role access, which this client-side, anon-keyed
   * provider deliberately can't do - see cachedTableProvider's implementation.
   */
  refreshDataset(category: string): Promise<void>;
}
