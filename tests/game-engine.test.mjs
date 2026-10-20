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

const {
  QUIZ_LENGTH_OPTIONS,
  DEFAULT_QUIZ_LENGTH,
  MAX_CUSTOM_QUESTIONS,
  FRIENDSHIP_QUESTION_BANK,
  getOptionText,
  getOptionImage,
} = await jiti.import('../src/data/friendshipPrompts.ts');

const {
  sanitizeQuestions,
  extractAnswerKey,
  normalizePlayerName,
  generateQuizCode,
  sanitizeQuizCode,
  sortAndRankSubmissions,
  deduplicateSubmissions,
} = await jiti.import('../src/lib/friendshipService.ts');

const {
  getMySavedQuizzes,
  saveCreatedQuizToHistory,
  savePlayedQuizToHistory,
  removeQuizFromHistory,
  getQuizDraft,
  saveQuizDraft,
  clearQuizDraft,
} = await jiti.import('../src/lib/savedQuizzes.ts');

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

test('Friendship Test - Question Bank & Quiz Configuration', () => {
  assert.deepEqual([...QUIZ_LENGTH_OPTIONS], [10, 15, 20]);
  assert.equal(DEFAULT_QUIZ_LENGTH, 10);
  assert.equal(MAX_CUSTOM_QUESTIONS, 3);
  assert.ok(FRIENDSHIP_QUESTION_BANK.length >= 30, 'Bank must have at least 30 questions');

  // Verify bank items structure
  const seenIds = new Set();
  for (const q of FRIENDSHIP_QUESTION_BANK) {
    assert.ok(q.id && !seenIds.has(q.id), `Duplicate or missing ID: ${q.id}`);
    seenIds.add(q.id);
    assert.ok(q.prompt && q.prompt.length > 5, 'Prompt too short');
    assert.equal(q.options.length, 4, 'Each question must have 4 options');
    const uniqueOptions = new Set(q.options.map((o) => getOptionText(o).trim().toLowerCase()));
    assert.equal(uniqueOptions.size, 4, `Question ${q.id} has duplicate options`);

    // Verify visual illustration metadata for every option
    for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
      const opt = q.options[optIdx];
      assert.ok(opt.image, `Question ${q.id} option ${optIdx} missing image metadata`);
      assert.match(opt.image, /^data:image\/svg\+xml/, `Option image must be a valid SVG data URI`);
      assert.ok(getOptionText(opt).length > 0);
      assert.ok(getOptionImage(opt, optIdx).length > 20);
    }
    assert.ok(
      ['habits', 'food', 'travel', 'reactions', 'preferences', 'personality'].includes(q.category),
      `Invalid category ${q.category}`
    );
  }

  // Quiz custom question cap simulation
  const customQuestions = [];
  function addCustomQuestion(prompt, options) {
    if (customQuestions.length >= MAX_CUSTOM_QUESTIONS) {
      throw new Error(`Cannot add more than ${MAX_CUSTOM_QUESTIONS} custom questions`);
    }
    customQuestions.push({ prompt, options });
  }

  assert.doesNotThrow(() => addCustomQuestion('Q1', ['a', 'b', 'c', 'd']));
  assert.doesNotThrow(() => addCustomQuestion('Q2', ['a', 'b', 'c', 'd']));
  assert.doesNotThrow(() => addCustomQuestion('Q3', ['a', 'b', 'c', 'd']));
  assert.throws(() => addCustomQuestion('Q4', ['a', 'b', 'c', 'd']), /Cannot add more than 3/);
  assert.equal(customQuestions.length, 3);
});

test('Friendship Test - Sanitized Question Payloads & Answer Key Extraction (Anti-Cheat)', () => {
  const creatorQuestions = [
    { id: 'q1', prompt: 'Prompt 1', options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
    { id: 'q2', prompt: 'Prompt 2', options: ['W', 'X', 'Y', 'Z'], correctIndex: 0, isCustom: true },
    { id: 'q3', prompt: 'Prompt 3', options: ['1', '2', '3', '4'], correctIndex: 3 },
  ];

  // Answer key extraction
  const answerKey = extractAnswerKey(creatorQuestions);
  assert.deepEqual(answerKey, [2, 0, 3]);

  // Sanitized questions (no correctIndex exposed to public)
  const sanitized = sanitizeQuestions(creatorQuestions);
  assert.equal(sanitized.length, 3);
  for (let i = 0; i < sanitized.length; i++) {
    const item = sanitized[i];
    assert.equal(item.id, creatorQuestions[i].id);
    assert.equal(item.prompt, creatorQuestions[i].prompt);
    assert.deepEqual(item.options, creatorQuestions[i].options);
    assert.equal('correctIndex' in item, false, 'correctIndex must NOT be present in sanitized payload');
    assert.equal(item.correctIndex, undefined);
  }
});

test('Friendship Test - Leaderboard Sorting with Strict Tie-Breaking & Dynamic Ranking', () => {
  const submissions = [
    {
      id: 'sub-1',
      player_name: 'Charlie',
      player_name_normalized: 'charlie',
      score: 8,
      total: 10,
      created_at: '2026-10-20T12:00:00.000Z',
    },
    {
      id: 'sub-2',
      player_name: 'Alice',
      player_name_normalized: 'alice',
      score: 10,
      total: 10,
      created_at: '2026-10-20T14:00:00.000Z',
    },
    {
      id: 'sub-3',
      player_name: 'Bob',
      player_name_normalized: 'bob',
      score: 8,
      total: 10,
      created_at: '2026-10-20T11:00:00.000Z', // Earlier than Charlie!
    },
    {
      id: 'sub-4',
      player_name: 'Dave',
      player_name_normalized: 'dave',
      score: 5,
      total: 10,
      created_at: '2026-10-20T10:00:00.000Z',
    },
  ];

  const ranked = sortAndRankSubmissions(submissions);

  // Expected order:
  // Rank 1: Alice (10/10)
  // Rank 2: Bob (8/10, submitted at 11:00 - wins tie against Charlie)
  // Rank 3: Charlie (8/10, submitted at 12:00)
  // Rank 4: Dave (5/10)
  assert.equal(ranked.length, 4);

  assert.equal(ranked[0].player_name, 'Alice');
  assert.equal(ranked[0].score, 10);
  assert.equal(ranked[0].rank, 1);

  assert.equal(ranked[1].player_name, 'Bob');
  assert.equal(ranked[1].score, 8);
  assert.equal(ranked[1].rank, 2);

  assert.equal(ranked[2].player_name, 'Charlie');
  assert.equal(ranked[2].score, 8);
  assert.equal(ranked[2].rank, 3);

  assert.equal(ranked[3].player_name, 'Dave');
  assert.equal(ranked[3].score, 5);
  assert.equal(ranked[3].rank, 4);
});

test('Friendship Test - Repeat Attempt Deduplication (Highest Score Per Normalized Name)', () => {
  let list = [];

  // 1. Initial attempt by Alice: 6/10
  const t1 = '2026-10-20T10:00:00.000Z';
  list = deduplicateSubmissions(list, {
    playerName: 'Alice',
    score: 6,
    total: 10,
    createdAt: t1,
  });

  assert.equal(list.length, 1);
  assert.equal(list[0].player_name, 'Alice');
  assert.equal(list[0].player_name_normalized, 'alice');
  assert.equal(list[0].score, 6);
  assert.equal(list[0].created_at, t1);
  assert.equal(list[0].rank, 1);

  // 2. Alice attempts again with a lower score (4/10): Should NOT overwrite
  const t2 = '2026-10-20T11:00:00.000Z';
  list = deduplicateSubmissions(list, {
    playerName: 'alice',
    score: 4,
    total: 10,
    createdAt: t2,
  });

  assert.equal(list.length, 1);
  assert.equal(list[0].score, 6, 'Score must remain 6 after lower attempt');
  assert.equal(list[0].created_at, t1, 'Timestamp must remain t1 when score did not improve');

  // 3. Alice attempts again with equal score (6/10): Should NOT overwrite
  const t3 = '2026-10-20T12:00:00.000Z';
  list = deduplicateSubmissions(list, {
    playerName: '  ALICE  ',
    score: 6,
    total: 10,
    createdAt: t3,
  });

  assert.equal(list.length, 1);
  assert.equal(list[0].score, 6);
  assert.equal(list[0].created_at, t1);

  // 4. Bob takes quiz: 8/10
  const t4 = '2026-10-20T13:00:00.000Z';
  list = deduplicateSubmissions(list, {
    playerName: 'Bob',
    score: 8,
    total: 10,
    createdAt: t4,
  });

  assert.equal(list.length, 2);
  assert.equal(list[0].player_name, 'Bob');
  assert.equal(list[0].rank, 1);
  assert.equal(list[1].player_name, 'Alice');
  assert.equal(list[1].rank, 2);

  // 5. Alice attempts again with a different name 'Alice Wonder': Distinct entry
  const t5 = '2026-10-20T14:00:00.000Z';
  list = deduplicateSubmissions(list, {
    playerName: 'Alice Wonder',
    score: 9,
    total: 10,
    createdAt: t5,
  });

  assert.equal(list.length, 3);

  // 6. Alice retries with exact normalized name 'alice' scoring 10/10: Strictly higher!
  const t6 = '2026-10-20T15:00:00.000Z';
  list = deduplicateSubmissions(list, {
    playerName: 'alice',
    score: 10,
    total: 10,
    createdAt: t6,
  });

  assert.equal(list.length, 3);
  const aliceEntry = list.find((item) => item.player_name_normalized === 'alice');
  assert.ok(aliceEntry);
  assert.equal(aliceEntry.score, 10);
  assert.equal(aliceEntry.created_at, t6);
  assert.equal(aliceEntry.rank, 1);
});

test('Friendship Test - Quiz Code Generation and Sanitization', () => {
  for (let i = 0; i < 50; i++) {
    const code = generateQuizCode();
    assert.equal(code.length, 5);
    // Should not include ambiguous characters (0, O, 1, I, L)
    assert.equal(/[0O1IL]/.test(code), false, `Quiz code ${code} had ambiguous character`);
    assert.match(code, /^[A-Z0-9]{5}$/);
  }

  assert.equal(sanitizeQuizCode('abcde'), 'ABCDE');
  assert.equal(sanitizeQuizCode('  xy-z99!  '), 'XYZ99');
  assert.equal(normalizePlayerName('  Alex Mercer  '), 'alex mercer');
});

test('Friendship Test - Option Illustration and Custom Fallback Helpers', () => {
  // Test structured option with SVG image
  const optObj = {
    text: 'Up at sunrise',
    image: 'data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E',
  };
  assert.equal(getOptionText(optObj), 'Up at sunrise');
  assert.equal(getOptionImage(optObj, 0), optObj.image);

  // Test plain string custom option fallback
  const optStr = 'My custom choice';
  assert.equal(getOptionText(optStr), 'My custom choice');
  const fallbackSvg = getOptionImage(optStr, 2);
  assert.ok(fallbackSvg.startsWith('data:image/svg+xml;utf8,'));
  assert.match(decodeURIComponent(fallbackSvg), /<svg/);
});

test('Friendship Test - Saved Quiz History Persistence (partyhub_my_quizzes)', () => {
  // 1. Initially empty or clean
  removeQuizFromHistory('TEST1');
  removeQuizFromHistory('TEST2');

  // 2. Save created quiz
  saveCreatedQuizToHistory({
    code: 'TEST1',
    creatorName: 'Jordan',
    totalQuestions: 10,
    createdAt: '2026-10-21T00:00:00.000Z',
  });

  let list = getMySavedQuizzes();
  const foundCreated = list.find((q) => q.code === 'TEST1');
  assert.ok(foundCreated);
  assert.equal(foundCreated.creatorName, 'Jordan');
  assert.equal(foundCreated.isCreator, true);
  assert.equal(foundCreated.totalQuestions, 10);

  // 3. Save played quiz
  savePlayedQuizToHistory({
    code: 'TEST2',
    creatorName: 'Taylor',
    totalQuestions: 15,
    score: 12,
  });

  list = getMySavedQuizzes();
  const foundPlayed = list.find((q) => q.code === 'TEST2');
  assert.ok(foundPlayed);
  assert.equal(foundPlayed.creatorName, 'Taylor');
  assert.equal(foundPlayed.isCreator, false);
  assert.equal(foundPlayed.myScore, 12);

  // 4. Update played quiz with a higher score (best score preserved)
  savePlayedQuizToHistory({
    code: 'TEST2',
    creatorName: 'Taylor',
    totalQuestions: 15,
    score: 14,
  });

  list = getMySavedQuizzes();
  const updatedPlayed = list.find((q) => q.code === 'TEST2');
  assert.equal(updatedPlayed.myScore, 14);

  // 5. Remove quiz from history
  removeQuizFromHistory('TEST1');
  list = getMySavedQuizzes();
  assert.equal(list.some((q) => q.code === 'TEST1'), false);
  removeQuizFromHistory('TEST2');
});

test('Friendship Test - In-Progress Quiz Draft Persistence (Survive Page Refresh)', () => {
  clearQuizDraft();
  assert.equal(getQuizDraft(), null);

  const draftPayload = {
    creatorName: 'Taylor',
    quizLength: 10,
    builderQuestions: [
      { id: 'q1', prompt: 'Prompt 1', options: ['A', 'B'], correctIndex: 1 },
      { id: 'q2', prompt: 'Prompt 2', options: ['C', 'D'], correctIndex: 0 },
    ],
    currentBuilderIndex: 1,
    usedTemplateIds: ['q1', 'q2'],
  };

  saveQuizDraft(draftPayload);

  const restored = getQuizDraft();
  assert.ok(restored);
  assert.equal(restored.creatorName, 'Taylor');
  assert.equal(restored.currentBuilderIndex, 1);
  assert.equal(restored.builderQuestions.length, 2);
  assert.equal(restored.builderQuestions[0].correctIndex, 1);
  assert.deepEqual(restored.usedTemplateIds, ['q1', 'q2']);

  clearQuizDraft();
  assert.equal(getQuizDraft(), null);
});
