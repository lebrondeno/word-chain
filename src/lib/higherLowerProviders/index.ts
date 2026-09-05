import type { HigherLowerProvider } from './types';
import { generatedProvider } from './generatedProvider';
import { cachedTableProvider } from './cachedTableProvider';

export type { HigherLowerProvider, HigherLowerValue, HigherLowerCategoryInfo } from './types';
export { generatedProvider } from './generatedProvider';
export { cachedTableProvider } from './cachedTableProvider';

/**
 * Category -> provider lookup. 'random_numbers' is the only generated
 * category today; every other higher_lower category is cached-table backed.
 * A future third provider (e.g. a live-called sports-stats API) plugs in
 * here by adding one more branch - nothing else in the app needs to change.
 */
export function getHigherLowerProvider(category: string): HigherLowerProvider {
  if (category === 'random_numbers') return generatedProvider;
  return cachedTableProvider;
}
