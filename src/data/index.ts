import cities from './cities.json';
import animals from './animals.json';
import countries from './countries.json';
import foods from './foods.json';
import movies from './movies.json';

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  words: string[];
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  cities: {
    id: 'cities',
    name: 'Cities',
    icon: '🏙️',
    description: 'Major world cities and capitals',
    words: cities,
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    icon: '🦁',
    description: 'Mammals, birds, reptiles, sea creatures',
    words: animals,
  },
  countries: {
    id: 'countries',
    name: 'Countries',
    icon: '🌍',
    description: 'Sovereign nations & territories',
    words: countries,
  },
  foods: {
    id: 'foods',
    name: 'Food & Drink',
    icon: '🍕',
    description: 'Delicious dishes, fruits, & snacks',
    words: foods,
  },
  movies: {
    id: 'movies',
    name: 'Movies',
    icon: '🎬',
    description: 'Iconic and acclaimed films',
    words: movies,
  },
};

// Normalized word map for fast O(1) lookup
const categoryWordSets: Record<string, Set<string>> = {};
const categoryDisplayMaps: Record<string, Map<string, string>> = {};

Object.entries(CATEGORIES).forEach(([key, cat]) => {
  const set = new Set<string>();
  const map = new Map<string, string>();
  cat.words.forEach((w) => {
    const norm = normalizeWord(w);
    set.add(norm);
    map.set(norm, w);
  });
  categoryWordSets[key] = set;
  categoryDisplayMaps[key] = map;
});

/**
 * Normalizes a word for comparison (lowercased, trimmed, removes accents/special chars if needed)
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extracts the starting letter of a word (normalized)
 */
export function getFirstLetter(word: string): string {
  const norm = normalizeWord(word);
  const alphaMatch = norm.match(/[a-z]/i);
  return alphaMatch ? alphaMatch[0].toUpperCase() : norm.charAt(0).toUpperCase();
}

/**
 * Extracts the trailing letter of a word (excluding trailing symbols/punctuation)
 */
export function getLastLetter(word: string): string {
  const norm = normalizeWord(word);
  const alphaChars = norm.replace(/[^a-z]/gi, '');
  if (alphaChars.length > 0) {
    return alphaChars.charAt(alphaChars.length - 1).toUpperCase();
  }
  return norm.charAt(norm.length - 1).toUpperCase();
}

/**
 * Validates whether a word exists in the specified category
 */
export function isWordInCategory(word: string, category: string): boolean {
  const set = categoryWordSets[category] || categoryWordSets['cities'];
  const norm = normalizeWord(word);
  return set.has(norm);
}

/**
 * Gets the proper formatted display name of a word if known
 */
export function getDisplayWord(word: string, category: string): string {
  const map = categoryDisplayMaps[category] || categoryDisplayMaps['cities'];
  const norm = normalizeWord(word);
  return map.get(norm) || word.trim();
}

/**
 * Check word submission against all rules:
 * 1. Must be in category
 * 2. Must start with expected last_letter (if last_letter is set)
 * 3. Must not be in used_words
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  formattedWord?: string;
  nextLastLetter?: string;
}

export function validateWordSubmission(
  word: string,
  category: string,
  expectedLastLetter: string | null,
  usedWords: Array<string | { word: string }>
): ValidationResult {
  const trimmed = word.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Word must be at least 2 letters long' };
  }

  const norm = normalizeWord(trimmed);
  const firstLetter = getFirstLetter(trimmed);

  // Check 1: Starting letter match
  if (expectedLastLetter) {
    const expected = expectedLastLetter.toUpperCase();
    if (firstLetter !== expected) {
      return {
        valid: false,
        error: `Word must start with "${expected}" (you entered "${firstLetter}")`,
      };
    }
  }

  // Check 2: Already used
  const isUsed = usedWords.some((w) => {
    const wStr = typeof w === 'string' ? w : w.word;
    return normalizeWord(wStr) === norm;
  });

  if (isUsed) {
    return {
      valid: false,
      error: `"${trimmed}" has already been used in this game!`,
    };
  }

  // Check 3: Category match
  if (!isWordInCategory(trimmed, category)) {
    const catName = CATEGORIES[category]?.name || 'the selected category';
    return {
      valid: false,
      error: `"${trimmed}" is not in the ${catName} word list`,
    };
  }

  const display = getDisplayWord(trimmed, category);
  const nextLetter = getLastLetter(display);

  return {
    valid: true,
    formattedWord: display,
    nextLastLetter: nextLetter,
  };
}
