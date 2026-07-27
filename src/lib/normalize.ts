import { createHash } from 'node:crypto';

/**
 * Normalize a URL for stable dedup: lowercase host, strip query/fragment/trailing slash.
 * https://LINEAR.APP/foo?utm_source=x#top -> https://linear.app/foo
 */
export function normalizeUrl(input: string): string {
  const u = new URL(input);
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  u.search = '';
  let s = u.toString();
  if (s.endsWith('/') && s !== `${u.origin}/`) s = s.slice(0, -1);
  return s;
}

/** Short stable hash of the normalized URL, used for filename + dup detection. */
export function urlHash(input: string): string {
  return createHash('sha256').update(normalizeUrl(input)).digest('hex').slice(0, 10);
}

/**
 * Title -> filename slug. Lowercase, alphanumeric + hyphens, collapse repeats,
 * trim leading/trailing hyphens, cap at 60 chars (word-boundary aware).
 */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= 60) return slug;
  const cut = slug.slice(0, 60);
  const lastHyphen = cut.lastIndexOf('-');
  return (lastHyphen > 20 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/g, '');
}

/** Lowercase, dedupe, cap at 4 tags. */
export function clampTags(tags: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = String(raw).trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
      if (out.length === 4) break;
    }
  }
  return out;
}

/** YYYY-MM-DD for the local date (not UTC — avoids off-by-one on evening saves). */
export function dateStamp(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
