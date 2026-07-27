import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateAIResponse, coerceCategory, filenameFor } from './bookmark.ts';

test('coerceCategory: exact (case-insensitive)', () => {
  assert.equal(coerceCategory('development'), 'Development');
  assert.equal(coerceCategory('PRODUCTIVITY'), 'Productivity');
});

test('coerceCategory: substring match', () => {
  assert.equal(coerceCategory('ai/ml'), 'AI');
  assert.equal(coerceCategory('news and media'), 'News');
});

test('coerceCategory: unknown → Other', () => {
  assert.equal(coerceCategory('gardening'), 'Other');
  assert.equal(coerceCategory(undefined), 'Other');
});

test('validateAIResponse: happy path', () => {
  const out = validateAIResponse({
    title: 'Linear',
    summary: 'Issue tracker.',
    use: 'Track bugs.',
    category: 'productivity',
    tags: ['SaaS', 'issues', 'issues'],
  });
  assert.deepEqual(out, {
    title: 'Linear',
    summary: 'Issue tracker.',
    use: 'Track bugs.',
    category: 'Productivity',
    tags: ['saas', 'issues'],
  });
});

test('validateAIResponse: throws on missing title', () => {
  assert.throws(
    () => validateAIResponse({ summary: 'x', use: 'y' }),
    /empty title/,
  );
});

test('filenameFor: date + slug', () => {
  const out = validateAIResponse({
    title: 'Linear: Issue Tracker',
    summary: 'x',
    use: 'y',
    category: 'Tools',
    tags: [],
  });
  assert.equal(filenameFor(out, '2026-07-26'), '2026-07-26-linear-issue-tracker.md');
});
