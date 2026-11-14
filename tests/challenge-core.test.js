import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHQ_VERSION,
  calculateScore,
  createDefaultChallenge,
  validateChallenge,
  exportChallenge,
  removeChallenge,
  normalizeChallenge,
  resolveCreatorName,
  summarizeProgressTrend,
  summarizeSubjectProgress,
} from '../challenge-core.js';

test('default challenge has valid version and single question', () => {
  const challenge = createDefaultChallenge();
  assert.equal(challenge.version, CHQ_VERSION);
  assert.equal(challenge.questions.length, 1);
  assert.equal(challenge.questions[0].type, 'multiple-choice');
});

test('challenge validation accepts a valid challenge payload', () => {
  const challenge = createDefaultChallenge();
  challenge.title = 'Weekly Quiz';
  challenge.questions.push({
    id: 'q2',
    type: 'true-false',
    prompt: 'The moon orbits Earth.',
    difficulty: 'easy',
    points: 5,
    explanation: 'The moon does orbit Earth.',
    correctAnswer: true,
  });

  const result = validateChallenge(challenge);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('exportChallenge creates portable JSON payload', () => {
  const challenge = createDefaultChallenge();
  challenge.createdBy = 'CreatorOne';
  const payload = exportChallenge(challenge);
  const parsed = JSON.parse(payload);

  assert.equal(parsed.version, CHQ_VERSION);
  assert.equal(parsed.title, 'New Challenge');
  assert.equal(parsed.createdBy, 'CreatorOne');
});

test('exportChallenge uses the active account name as the fallback creator and keeps it locked in the payload', () => {
  const challenge = createDefaultChallenge();
  challenge.title = 'Export lock test';
  challenge.createdBy = 'QuestMaker';

  const parsed = JSON.parse(exportChallenge(challenge));
  assert.equal(parsed.createdBy, 'QuestMaker');
  assert.equal(parsed.creatorLocked, true);

  const fallback = { ...createDefaultChallenge(), createdBy: '   ', accountName: 'QuestPilot' };
  const fallbackParsed = JSON.parse(exportChallenge(fallback));
  assert.equal(fallbackParsed.createdBy, 'QuestPilot');
  assert.equal(fallbackParsed.creatorLocked, true);
});

test('resolveCreatorName falls back to the current session account name', () => {
  assert.equal(resolveCreatorName('', 'Player'), 'Player');
  assert.equal(resolveCreatorName('   ', 'QuestPilot'), 'QuestPilot');
  assert.equal(resolveCreatorName('CreatorOne', 'Player'), 'CreatorOne');
});

test('calculateScore totals points correctly', () => {
  const challenge = createDefaultChallenge();
  challenge.questions = [
    {
      id: 'q1',
      type: 'multiple-choice',
      prompt: '2 + 2 = ?',
      difficulty: 'easy',
      points: 10,
      explanation: 'Basic arithmetic.',
      choices: ['3', '4', '5'],
      correctAnswer: 1,
    },
    {
      id: 'q2',
      type: 'true-false',
      prompt: 'A square has four sides.',
      difficulty: 'easy',
      points: 5,
      explanation: 'A square has four equal sides.',
      correctAnswer: true,
    },
  ];

  const result = calculateScore(challenge, [1, true]);
  assert.equal(result.score, 15);
  assert.equal(result.totalPoints, 15);
  assert.equal(result.correctCount, 2);
});

test('removeChallenge removes a challenge by index from the library', () => {
  const library = [
    createDefaultChallenge(),
    { ...createDefaultChallenge(), title: 'Second challenge', category: 'Science' },
    { ...createDefaultChallenge(), title: 'Third challenge', category: 'History' },
  ];

  const nextLibrary = removeChallenge(library, 1);
  assert.equal(nextLibrary.length, 2);
  assert.equal(nextLibrary[0].title, 'New Challenge');
  assert.equal(nextLibrary[1].title, 'Third challenge');
});

test('summarizeSubjectProgress totals performance by category', () => {
  const history = [
    { category: 'Science', score: 8, total: 10, percentage: 80, completedAt: '2024-01-01T00:00:00.000Z' },
    { category: 'Science', score: 7, total: 10, percentage: 70, completedAt: '2024-01-02T00:00:00.000Z' },
    { category: 'History', score: 5, total: 10, percentage: 50, completedAt: '2024-01-03T00:00:00.000Z' },
  ];

  const summary = summarizeSubjectProgress(history);
  assert.equal(summary[0].category, 'Science');
  assert.equal(summary[0].attempts, 2);
  assert.equal(summary[0].averageAccuracy, 75);
  assert.equal(summary[1].category, 'History');
  assert.equal(summary[1].averageAccuracy, 50);
});

test('summarizeProgressTrend yields a usable line chart series', () => {
  const history = [
    { category: 'Science', percentage: 60, completedAt: '2024-01-01T00:00:00.000Z' },
    { category: 'History', percentage: 75, completedAt: '2024-01-02T00:00:00.000Z' },
    { category: 'Technology', percentage: 88, completedAt: '2024-01-03T00:00:00.000Z' },
  ];

  const trend = summarizeProgressTrend(history);
  assert.equal(trend.points.length, 3);
  assert.deepEqual(trend.points.map((point) => point.value), [60, 75, 88]);
  assert.equal(trend.averageAccuracy, 74);
  assert.equal(trend.latest, 88);
});

test('normalizeChallenge preserves IDs and uploaded image data', () => {
  const challenge = createDefaultChallenge();
  challenge.title = 'Image challenge';
  challenge.image = 'data:image/png;base64,abc123';
  challenge.questions[0].prompt = 'Updated prompt';

  const normalized = normalizeChallenge(challenge);
  assert.equal(normalized.id, challenge.id);
  assert.equal(normalized.image, 'data:image/png;base64,abc123');
  assert.equal(normalized.questions[0].prompt, 'Updated prompt');
});
