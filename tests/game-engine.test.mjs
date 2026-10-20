import test from 'node:test';
import assert from 'node:assert/strict';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);

const {
  validateWordSubmission,
  normalizeWord,
  getFirstLetter,
  getLastLetter,
  isWordInCategory,
} = await jiti.import('../src/data/index.ts');

const {
  generateRoomCode,
  sanitizeRoomCode,
} = await jiti.import('../src/lib/roomCode.ts');

const {
  GAME_TYPES,
  VOTE_REVEAL_CATEGORIES,
  SEED_PROMPTS,
} = await jiti.import('../src/data/prompts.ts');

const { soundManager } = await jiti.import('../src/lib/audio.ts');

test('Word Normalization and Letter Extraction', () => {
  assert.equal(normalizeWord('  Tokyo  '), 'tokyo');
  assert.equal(normalizeWord('São Paulo'), 'sao paulo');
  assert.equal(getFirstLetter('Tokyo'), 'T');
  assert.equal(getFirstLetter('  oslo'), 'O');
  assert.equal(getLastLetter('Tokyo'), 'O');
  assert.equal(getLastLetter('New York!'), 'K');
});

test('Word Category Validation', () => {
  assert.equal(isWordInCategory('Tokyo', 'cities'), true);
  assert.equal(isWordInCategory('paris', 'cities'), true);
  assert.equal(isWordInCategory('Elephant', 'animals'), true);
  assert.equal(isWordInCategory('NonExistentCityXYZ', 'cities'), false);
});

test('Word Submission Logic', () => {
  // First word in chain (no required letter)
  const firstWord = validateWordSubmission('Tokyo', 'cities', null, []);
  assert.equal(firstWord.valid, true);
  assert.equal(firstWord.nextLastLetter, 'O');

  // Second word matching 'O'
  const secondWord = validateWordSubmission('Oslo', 'cities', 'O', ['Tokyo']);
  assert.equal(secondWord.valid, true);
  assert.equal(secondWord.nextLastLetter, 'O');

  // Wrong starting letter
  const wrongLetter = validateWordSubmission('Berlin', 'cities', 'O', ['Tokyo']);
  assert.equal(wrongLetter.valid, false);
  assert.match(wrongLetter.error, /Word must start with "O"/);

  // Already used word (string list)
  const usedString = validateWordSubmission('Tokyo', 'cities', 'T', ['Tokyo']);
  assert.equal(usedString.valid, false);
  assert.match(usedString.error, /already been used/);

  // Already used word (object list)
  const usedObj = validateWordSubmission('Tokyo', 'cities', null, [{ word: 'tokyo' }]);
  assert.equal(usedObj.valid, false);
  assert.match(usedObj.error, /already been used/);

  // Word too short
  const tooShort = validateWordSubmission('a', 'cities', null, []);
  assert.equal(tooShort.valid, false);
  assert.match(tooShort.error, /at least 2 letters/);

  // Word not in category
  const invalidCategory = validateWordSubmission('Pikachu', 'cities', null, []);
  assert.equal(invalidCategory.valid, false);
  assert.match(invalidCategory.error, /not in the Cities word list/);
});

test('Room Code Generation and Sanitization', () => {
  for (let i = 0; i < 50; i++) {
    const code = generateRoomCode(4);
    assert.equal(code.length, 4);
    // Should not include ambiguous letters: 0, O, 1, I, L
    assert.equal(/[0O1IL]/.test(code), false, `Code ${code} contained ambiguous character`);
    assert.match(code, /^[A-Z0-9]{4}$/);
  }

  assert.equal(sanitizeRoomCode('abcd'), 'ABCD');
  assert.equal(sanitizeRoomCode('ab-cd-123'), 'ABCD');
  assert.equal(sanitizeRoomCode('  xy 99  '), 'XY99');
});

test('Vote & Reveal Prompts and Category Integrity', () => {
  assert.equal(Object.keys(GAME_TYPES).includes('word_chain'), true);
  assert.equal(Object.keys(GAME_TYPES).includes('vote_reveal'), true);
  assert.equal(Object.keys(VOTE_REVEAL_CATEGORIES).includes('general'), true);
  assert.equal(Object.keys(VOTE_REVEAL_CATEGORIES).includes('couples'), true);

  assert.ok(SEED_PROMPTS.length >= 10, 'Expected at least 10 seed prompts');

  const seenIds = new Set();
  for (const prompt of SEED_PROMPTS) {
    assert.equal(prompt.engine, 'vote_reveal');
    assert.ok(['general', 'couples'].includes(prompt.category), `Invalid category ${prompt.category}`);
    assert.ok(prompt.prompt_text && prompt.prompt_text.length > 5);
    assert.equal(prompt.options.length, 2);
    assert.ok(prompt.options[0].length > 0);
    assert.ok(prompt.options[1].length > 0);
    assert.equal(seenIds.has(prompt.id), false, `Duplicate prompt id: ${prompt.id}`);
    seenIds.add(prompt.id);
  }
});

test('Sound Manager Safe Fallback (SSR / Headless)', () => {
  assert.equal(typeof soundManager.getMuted(), 'boolean');
  const initial = soundManager.getMuted();
  const toggled = soundManager.toggleMute();
  assert.equal(toggled, !initial);
  soundManager.toggleMute(); // toggle back

  // Methods should not throw in non-browser/headless environment
  assert.doesNotThrow(() => soundManager.playCorrect());
  assert.doesNotThrow(() => soundManager.playError());
  assert.doesNotThrow(() => soundManager.playTick(true));
  assert.doesNotThrow(() => soundManager.playTurnStart());
  assert.doesNotThrow(() => soundManager.playEliminated());
  assert.doesNotThrow(() => soundManager.playWinner());
  assert.doesNotThrow(() => soundManager.playVote());
  assert.doesNotThrow(() => soundManager.playReveal());
});
