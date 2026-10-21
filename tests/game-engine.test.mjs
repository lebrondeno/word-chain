import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  ALL_GAMES_COUNT,
  VOTE_REVEAL_CATEGORIES,
  MOST_LIKELY_CATEGORIES,
  TRIVIA_CATEGORIES,
  HIGHER_LOWER_CATEGORIES,
  HIGHER_LOWER_DIFFICULTIES,
  SEED_PROMPTS,
  SEED_MOST_LIKELY_PROMPTS,
  SEED_TRIVIA_PROMPTS,
  SEED_POPULATION_PROMPTS,
} = await jiti.import('../src/data/prompts.ts');

const {
  checkTicTacToeWin,
  getBestBotMove,
  WIN_LINES,
} = await jiti.import('../src/lib/ticTacToe.ts');

const { soundManager } = await jiti.import('../src/lib/audio.ts');

const {
  QUIZ_LENGTH_OPTIONS,
  DEFAULT_QUIZ_LENGTH,
  MAX_CUSTOM_QUESTIONS,
  FRIENDSHIP_QUESTION_BANK,
  VIBE_PACKS,
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

const {
  getPwaState,
  isPwaInstalled,
  isIosDevice,
  hasNotificationSupport,
  getNotificationPermission,
  subscribePwaState,
  promptPwaInstall,
  applyAppUpdate,
  checkForAppUpdate,
  APP_BUILD_INFO,
} = await jiti.import('../src/utils/pwa.ts');

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

  assert.ok(SEED_PROMPTS.length >= 50, `Expected at least 50 seed prompts, got ${SEED_PROMPTS.length}`);

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
  assert.ok(FRIENDSHIP_QUESTION_BANK.length >= 96, `Bank must have at least 96 questions, found ${FRIENDSHIP_QUESTION_BANK.length}`);

  // Category counts
  const categoryCounts = {
    lovers: 0,
    gen_z: 0,
    chaos: 0,
    habits: 0,
    food: 0,
    travel: 0,
    reactions: 0,
    preferences: 0,
    personality: 0,
  };

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
      ['habits', 'food', 'travel', 'reactions', 'preferences', 'personality', 'lovers', 'gen_z', 'chaos'].includes(q.category),
      `Invalid category ${q.category}`
    );
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
  }

  // Ensure minimum count for new categories
  assert.ok(categoryCounts.lovers >= 25, `Expected >= 25 lovers questions, found ${categoryCounts.lovers}`);
  assert.ok(categoryCounts.gen_z >= 25, `Expected >= 25 gen_z questions, found ${categoryCounts.gen_z}`);
  assert.ok(categoryCounts.chaos >= 10, `Expected >= 10 chaos questions, found ${categoryCounts.chaos}`);

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

test('Friendship Test - Vibe Packs Selection and Fallback Mechanics', () => {
  assert.equal(VIBE_PACKS.length, 5);
  const packIds = VIBE_PACKS.map((p) => p.id);
  assert.deepEqual(packIds, ['all', 'gen_z', 'lovers', 'chaos', 'classic']);

  // Check each pack filters appropriate categories
  for (const pack of VIBE_PACKS) {
    assert.ok(pack.name && pack.badge && pack.description);
    assert.ok(pack.categories.length > 0);
    const packQuestions = FRIENDSHIP_QUESTION_BANK.filter((q) => pack.categories.includes(q.category));
    assert.ok(packQuestions.length >= 10, `Pack ${pack.id} must have at least 10 matching questions`);

    // Simulate builder question selection with fallback
    const targetLength = 20;
    let selected = packQuestions.slice(0, targetLength);
    if (selected.length < targetLength) {
      const selectedIds = new Set(selected.map((q) => q.id));
      const remainingBank = FRIENDSHIP_QUESTION_BANK.filter((q) => !selectedIds.has(q.id));
      selected = [...selected, ...remainingBank.slice(0, targetLength - selected.length)];
    }
    assert.equal(selected.length, targetLength);
  }
});

test('Friendship Test - In-Progress Quiz Draft Persistence (Survive Page Refresh)', () => {
  clearQuizDraft();
  assert.equal(getQuizDraft(), null);

  const draftPayload = {
    creatorName: 'Taylor',
    quizLength: 15,
    vibePack: 'lovers',
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
  assert.equal(restored.quizLength, 15);
  assert.equal(restored.vibePack, 'lovers');
  assert.equal(restored.currentBuilderIndex, 1);
  assert.equal(restored.builderQuestions.length, 2);
  assert.equal(restored.builderQuestions[0].correctIndex, 1);
  assert.deepEqual(restored.usedTemplateIds, ['q1', 'q2']);

  clearQuizDraft();
  assert.equal(getQuizDraft(), null);
});

test('PWA Manifest & App Icons Integrity', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.name, 'PartyHub - Word Chain, Would You Rather & Friendship Quiz');
  assert.equal(manifest.short_name, 'PartyHub');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#eef4fa');
  assert.equal(manifest.theme_color, '#0b2545');

  // Icons verification
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  const icon192 = manifest.icons.find((i) => i.sizes === '192x192' && i.src === '/pwa-192x192.png');
  const icon512 = manifest.icons.find((i) => i.sizes === '512x512' && i.src === '/pwa-512x512.png');
  const maskableIcon = manifest.icons.find((i) => i.purpose?.includes('maskable'));

  assert.ok(icon192, 'Manifest must have 192x192 icon');
  assert.ok(icon512, 'Manifest must have 512x512 icon');
  assert.ok(maskableIcon, 'Manifest must include maskable icon');

  // Physical PNG files
  const pwa192Path = path.join(rootDir, 'public', 'pwa-192x192.png');
  const pwa512Path = path.join(rootDir, 'public', 'pwa-512x512.png');
  const appleIconPath = path.join(rootDir, 'public', 'apple-touch-icon.png');
  const swPath = path.join(rootDir, 'public', 'sw.js');

  assert.ok(fs.existsSync(pwa192Path), 'pwa-192x192.png must exist');
  assert.ok(fs.statSync(pwa192Path).size > 1000, 'pwa-192x192.png must be non-empty');

  assert.ok(fs.existsSync(pwa512Path), 'pwa-512x512.png must exist');
  assert.ok(fs.statSync(pwa512Path).size > 5000, 'pwa-512x512.png must be non-empty');

  assert.ok(fs.existsSync(appleIconPath), 'apple-touch-icon.png must exist');
  assert.ok(fs.statSync(appleIconPath).size > 1000, 'apple-touch-icon.png must be non-empty');

  assert.ok(fs.existsSync(swPath), 'sw.js must exist');
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert.ok(swContent.includes('SKIP_WAITING'), 'sw.js must handle SKIP_WAITING message');
  assert.ok(swContent.includes('CACHE_VERSION'), 'sw.js must manage cache version');
});

test('PWA Utilities - Headless and SSR Safe Execution', async () => {
  assert.ok(APP_BUILD_INFO.version);
  assert.ok(APP_BUILD_INFO.buildTime);

  // Calling utils in Node should never throw
  assert.equal(typeof isPwaInstalled(), 'boolean');
  assert.equal(typeof isIosDevice(), 'boolean');
  assert.equal(typeof hasNotificationSupport(), 'boolean');
  assert.equal(typeof getNotificationPermission(), 'string');

  const state = getPwaState();
  assert.equal(typeof state.isStandalone, 'boolean');
  assert.equal(typeof state.isInstallable, 'boolean');
  assert.equal(typeof state.isUpdateAvailable, 'boolean');
  assert.equal(typeof state.isIos, 'boolean');
  assert.equal(typeof state.hasNotificationSupport, 'boolean');

  // Subscription works
  let receivedState = null;
  const unsub = subscribePwaState((s) => {
    receivedState = s;
  });
  assert.ok(receivedState);
  assert.equal(typeof receivedState.isStandalone, 'boolean');
  unsub();

  // Async helpers do not throw
  const installResult = await promptPwaInstall();
  assert.equal(installResult, false);

  const checkResult = await checkForAppUpdate();
  assert.equal(checkResult, false);

  assert.doesNotThrow(() => applyAppUpdate());
});

test('Would You Rather - Full 58 Dilemmas Pool Integrity & Merging', () => {
  assert.equal(SEED_PROMPTS.length, 58, `Expected exactly 58 seed dilemmas, found ${SEED_PROMPTS.length}`);

  const generalPrompts = SEED_PROMPTS.filter((p) => p.category === 'general');
  const couplesPrompts = SEED_PROMPTS.filter((p) => p.category === 'couples');

  assert.equal(generalPrompts.length, 31, 'Expected 31 general dilemmas (9 initial + 22 added)');
  assert.equal(couplesPrompts.length, 27, 'Expected 27 couples dilemmas (7 initial + 20 added)');

  // Simulate prompt merging logic from GameContext
  const mockDbPrompts = [
    {
      id: 'db-custom-1',
      engine: 'vote_reveal',
      category: 'general',
      prompt_text: 'DB prompt 1',
      options: ['Option A', 'Option B'],
    },
  ];

  const mergedMap = new Map();
  for (const p of generalPrompts) {
    mergedMap.set(p.id, p);
  }
  for (const p of mockDbPrompts) {
    mergedMap.set(p.id, p);
  }

  // 31 general prompts + 1 db prompt = 32
  assert.equal(mergedMap.size, 32);
});

test('Tic-Tac-Toe Game Engine Logic & Minimax Bot AI', () => {
  assert.equal(WIN_LINES.length, 8, 'Tic-Tac-Toe must have 8 winning combinations');

  // Rows win detection
  const row0 = ['X', 'X', 'X', null, null, null, null, null, null];
  assert.deepEqual(checkTicTacToeWin(row0), {
    winner: 'X',
    winningLine: [0, 1, 2],
    isDraw: false,
  });

  const row1 = [null, null, null, 'O', 'O', 'O', null, null, null];
  assert.deepEqual(checkTicTacToeWin(row1), {
    winner: 'O',
    winningLine: [3, 4, 5],
    isDraw: false,
  });

  const row2 = [null, null, null, null, null, null, 'X', 'X', 'X'];
  assert.deepEqual(checkTicTacToeWin(row2), {
    winner: 'X',
    winningLine: [6, 7, 8],
    isDraw: false,
  });

  // Columns win detection
  const col0 = ['X', null, null, 'X', null, null, 'X', null, null];
  assert.deepEqual(checkTicTacToeWin(col0), {
    winner: 'X',
    winningLine: [0, 3, 6],
    isDraw: false,
  });

  const col1 = [null, 'O', null, null, 'O', null, null, 'O', null];
  assert.deepEqual(checkTicTacToeWin(col1), {
    winner: 'O',
    winningLine: [1, 4, 7],
    isDraw: false,
  });

  const col2 = [null, null, 'X', null, null, 'X', null, null, 'X'];
  assert.deepEqual(checkTicTacToeWin(col2), {
    winner: 'X',
    winningLine: [2, 5, 8],
    isDraw: false,
  });

  // Diagonals win detection
  const diag0 = ['O', null, null, null, 'O', null, null, null, 'O'];
  assert.deepEqual(checkTicTacToeWin(diag0), {
    winner: 'O',
    winningLine: [0, 4, 8],
    isDraw: false,
  });

  const diag1 = [null, null, 'X', null, 'X', null, 'X', null, null];
  assert.deepEqual(checkTicTacToeWin(diag1), {
    winner: 'X',
    winningLine: [2, 4, 6],
    isDraw: false,
  });

  // Incomplete board with no winner yet
  const ongoing = ['X', 'O', 'X', null, null, null, null, null, null];
  assert.deepEqual(checkTicTacToeWin(ongoing), {
    winner: null,
    winningLine: null,
    isDraw: false,
  });

  // Draw board
  const draw = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.deepEqual(checkTicTacToeWin(draw), {
    winner: null,
    winningLine: null,
    isDraw: true,
  });

  // Bot AI - Winning move prioritization
  const canWinBoard = ['O', 'O', null, 'X', 'X', null, null, null, null];
  assert.equal(getBestBotMove(canWinBoard), 2, 'Bot should immediately take winning index 2');

  // Bot AI - Opponent block prioritization
  const mustBlockBoard = ['X', 'X', null, null, 'O', null, null, null, null];
  assert.equal(getBestBotMove(mustBlockBoard), 2, 'Bot should block opponent winning index 2');

  // Bot AI - Center control
  const centerOpenBoard = ['X', null, null, null, null, null, null, null, null];
  assert.equal(getBestBotMove(centerOpenBoard), 4, 'Bot should prefer center index 4');

  // Bot AI - Corner preference when center is occupied
  const cornersOpenBoard = [null, null, null, null, 'X', null, null, null, null];
  const botCornerMove = getBestBotMove(cornersOpenBoard);
  assert.ok([0, 2, 6, 8].includes(botCornerMove), `Bot should pick a corner, got ${botCornerMove}`);

  // Bot AI - Full board returns -1
  assert.equal(getBestBotMove(draw), -1, 'Full board should return -1');
});

test('Recovered Game Modes & Hub Category Integrity', () => {
  assert.equal(ALL_GAMES_COUNT, 7, 'Hub must announce exactly 7 games');
  const expectedGameKeys = [
    'word_chain',
    'vote_reveal',
    'friendship_test',
    'tic_tac_toe',
    'trivia',
    'higher_lower',
    'most_likely',
  ];

  for (const key of expectedGameKeys) {
    assert.ok(GAME_TYPES[key], `GAME_TYPES must include ${key}`);
    const g = GAME_TYPES[key];
    assert.ok(g.id && g.name && g.shortName && g.description, `Game ${key} missing basic info`);
    assert.ok(g.icon, `Game ${key} missing icon`);
    assert.ok(Array.isArray(g.categories), `Game ${key} categories must be an array`);
  }

  // Category integrity
  assert.ok(Object.keys(TRIVIA_CATEGORIES).includes('general_knowledge'));
  assert.ok(Object.keys(TRIVIA_CATEGORIES).includes('sports'));
  assert.ok(Object.keys(TRIVIA_CATEGORIES).includes('geography'));
  assert.ok(Object.keys(TRIVIA_CATEGORIES).includes('animals'));
  assert.ok(Object.keys(TRIVIA_CATEGORIES).includes('history'));

  assert.ok(Object.keys(HIGHER_LOWER_CATEGORIES).includes('random_numbers'));
  assert.ok(Object.keys(HIGHER_LOWER_CATEGORIES).includes('population'));

  const difficultyIds = HIGHER_LOWER_DIFFICULTIES.map((d) => d.id);
  assert.ok(difficultyIds.includes('easy'));
  assert.ok(difficultyIds.includes('medium'));
  assert.ok(difficultyIds.includes('hard'));

  assert.ok(Object.keys(MOST_LIKELY_CATEGORIES).includes('general'));

  // Seed prompt pools
  assert.ok(SEED_TRIVIA_PROMPTS.length >= 6, 'Expected at least 6 trivia seed prompts');
  assert.ok(SEED_POPULATION_PROMPTS.length >= 12, 'Expected at least 12 population seed prompts');
  assert.ok(SEED_MOST_LIKELY_PROMPTS.length >= 8, 'Expected at least 8 most likely seed prompts');
});

test('Mobile Option Card Text Truncation Prevention & Responsive Bubbles', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const quizViewPath = path.join(rootDir, 'src', 'components', 'FriendshipQuizView.tsx');
  assert.ok(fs.existsSync(quizViewPath), 'FriendshipQuizView.tsx must exist');

  const quizSource = fs.readFileSync(quizViewPath, 'utf8');

  // Verify no ellipsis truncation on option text
  assert.equal(
    quizSource.includes('line-clamp-1'),
    false,
    'FriendshipQuizView must not use line-clamp-1 on option cards'
  );
  assert.equal(
    quizSource.includes('line-clamp-2'),
    false,
    'FriendshipQuizView must not use line-clamp-2 on option cards'
  );

  // Verify flexible bottom container height & responsive break-words
  assert.ok(
    quizSource.includes('min-h-[64px]'),
    'Option cards must have flexible min-h-[64px] bottom banner'
  );
  assert.ok(
    quizSource.includes('break-words'),
    'Option cards text must have break-words to prevent overflow'
  );

  // Verify top progress bubbles wrap cleanly
  assert.ok(
    quizSource.includes('flex-wrap') && quizSource.includes('justify-center'),
    'Progress bubbles must have flex-wrap and justify-center to prevent horizontal scrollbar or half-cut bubble on mobile'
  );

  // Verify responsive portrait container
  assert.ok(
    quizSource.includes('w-20 h-20 sm:w-28 sm:h-28'),
    'Portrait container must use compact mobile size w-20 h-20 sm:w-28 sm:h-28'
  );
});
