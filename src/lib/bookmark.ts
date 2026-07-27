import { CATEGORIES, type Category } from './categories.ts';
import { clampTags, slugify } from './normalize.ts';

export interface RawAIResponse {
  title?: unknown;
  summary?: unknown;
  use?: unknown;
  category?: unknown;
  tags?: unknown;
}

export interface ValidatedBookmark {
  title: string;
  summary: string;
  use: string;
  category: Category;
  tags: string[];
}

export class AIResponseError extends Error {}

/** Find closest enum match for a free-text category; fall back to 'Other'. */
export function coerceCategory(raw: unknown): Category {
  if (typeof raw !== 'string') return 'Other';
  const norm = raw.trim().toLowerCase();
  for (const c of CATEGORIES) {
    if (c.toLowerCase() === norm) return c;
  }
  // ponytail: simple substring match — covers "dev" → "Development", "ai/ml" → "AI"
  for (const c of CATEGORIES) {
    const cl = c.toLowerCase();
    if (norm.includes(cl) || cl.includes(norm)) return c;
  }
  return 'Other';
}

/** Validate + clamp the AI's raw JSON into a bookmark we can persist. Throws on hard failures. */
export function validateAIResponse(raw: RawAIResponse): ValidatedBookmark {
  const title = String(raw.title ?? '').trim();
  const summary = String(raw.summary ?? '').trim();
  const use = String(raw.use ?? '').trim();
  if (!title) throw new AIResponseError('AI returned empty title');
  if (!summary) throw new AIResponseError('AI returned empty summary');
  if (!use) throw new AIResponseError('AI returned empty "use" field');
  return {
    title,
    summary,
    use,
    category: coerceCategory(raw.category),
    tags: clampTags(Array.isArray(raw.tags) ? raw.tags : []),
  };
}

/** Stable filename for a bookmark. */
export function filenameFor(b: ValidatedBookmark, dateAdded: string): string {
  return `${dateAdded}-${slugify(b.title)}.md`;
}
