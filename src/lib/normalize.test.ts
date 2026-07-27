import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeUrl, urlHash, slugify, clampTags, dateStamp } from './normalize.ts';

test('normalizeUrl: lowercases host, strips query/fragment/trailing slash', () => {
  assert.equal(
    normalizeUrl('HTTPS://Linear.App/Foo/?utm_source=x#top'),
    'https://linear.app/Foo',
  );
});

test('normalizeUrl: preserves root path', () => {
  assert.equal(normalizeUrl('https://example.com/'), 'https://example.com/');
});

test('normalizeUrl: same hash for query-only differences', () => {
  assert.equal(urlHash('https://x.io/a?b=1'), urlHash('https://x.io/a?b=2'));
});

test('slugify: basic', () => {
  assert.equal(slugify('Linear: Issue Tracker'), 'linear-issue-tracker');
});

test('slugify: strips diacritics', () => {
  assert.equal(slugify('Café Crème'), 'cafe-creme');
});

test('slugify: caps length on word boundary', () => {
  const long = 'A'.repeat(80);
  const s = slugify(long);
  assert.ok(s.length <= 60, `got ${s.length}`);
});

test('clampTags: lowercase, dedupe, cap at 4', () => {
  assert.deepEqual(
    clampTags(['Rust', 'rust', 'CLI Tool', 'Async', 'Extra']),
    ['rust', 'cli-tool', 'async', 'extra'],
  );
});

test('clampTags: skips empties', () => {
  assert.deepEqual(clampTags(['', '  ', 'real']), ['real']);
});

test('dateStamp: local date, not UTC', () => {
  const d = new Date(2026, 0, 5, 23, 59); // local 2026-01-05 23:59
  assert.equal(dateStamp(d), '2026-01-05');
});
