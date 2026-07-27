#!/usr/bin/env tsx
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOKMARKS_DIR = path.join(ROOT, 'src/content/bookmarks');

// Tiny dotenv loader — avoids node flag plumbing. ponytail: process.loadEnvFile would also work
// but throws if .env is missing; this is calmer.
async function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const txt = await readFile(envPath, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

interface Flags {
  force: boolean;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): { url: string | null; flags: Flags } {
  const flags: Flags = { force: false, dryRun: false, help: false };
  const positional: string[] = [];
  for (const a of argv.slice(2)) {
    if (a === '-f' || a === '--force') flags.force = true;
    else if (a === '-n' || a === '--dry-run') flags.dryRun = true;
    else if (a === '-h' || a === '--help') flags.help = true;
    else positional.push(a);
  }
  return { url: positional[0] ?? null, flags };
}

const HELP = `Usage: pnpm bm <url> [options]

Options:
  -f, --force      Re-research and overwrite if URL already saved
  -n, --dry-run    Show what AI would write, don't save
  -h, --help       Show this help

Env:
  ZAI_API_KEY      Required (z.ai API key)
  ZAI_MODEL        Optional model id (default: glm-4.6)`;

/** Scan existing files for one whose urlHash matches. */
async function findExisting(
  hash: string,
): Promise<{ file: string; title: string; date: string } | null> {
  if (!existsSync(BOOKMARKS_DIR)) return null;
  const files = await readdir(BOOKMARKS_DIR).catch(() => []);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const content = await readFile(path.join(BOOKMARKS_DIR, file), 'utf8');
    const m = content.match(/^urlHash:\s*"?([a-f0-9]+)/m);
    if (m && m[1] === hash) {
      const titleMatch = content.match(/^title:\s*"?(.+?)"?\s*$/m);
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})-/);
      return { file, title: titleMatch?.[1] ?? '(unknown)', date: dateMatch?.[1] ?? '?' };
    }
  }
  return null;
}

function yamlValue(s: string): string {
  // Quote if it contains characters that would break YAML flow scalars.
  if (/[:#\n"'&*!|>%@`{}[\],]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

function toFrontmatter(b: {
  url: string;
  title: string;
  summary: string;
  use: string;
  category: string;
  tags: string[];
  dateAdded: string;
  urlHash: string;
}): string {
  const lines = [
    '---',
    `url: ${yamlValue(b.url)}`,
    `title: ${yamlValue(b.title)}`,
    `summary: ${yamlValue(b.summary)}`,
    `use: ${yamlValue(b.use)}`,
    `category: ${b.category}`,
    `tags: [${b.tags.map((t) => yamlValue(t)).join(', ')}]`,
    `dateAdded: ${b.dateAdded}`,
    `urlHash: ${b.urlHash}`,
    '---',
    '',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  await loadEnv();
  const { url, flags } = parseArgs(process.argv);

  if (flags.help || !url) {
    console.log(HELP);
    process.exit(flags.help ? 0 : 1);
  }

  let normalized: string;
  try {
    normalized = new URL(url).toString();
  } catch {
    console.error(`Not a valid URL: ${url}`);
    process.exit(1);
  }

  const { normalizeUrl, urlHash, dateStamp } = await import('../src/lib/normalize.ts');
  const { researchUrl } = await import('../src/lib/glm.ts');
  const { validateAIResponse, AIResponseError, filenameFor } = await import(
    '../src/lib/bookmark.ts'
  );

  const hash = urlHash(normalized);
  const existing = await findExisting(hash);
  if (existing && !flags.force) {
    console.error(
      `Already saved as "${existing.title}" on ${existing.date} (${existing.file}).`,
    );
    console.error(`Use --force to re-research.`);
    process.exit(1);
  }

  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    console.error(`ZAI_API_KEY is not set. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }

  console.log(`Researching ${normalized} ...`);
  let result;
  try {
    result = await researchUrl(normalized, apiKey);
  } catch (err) {
    console.error(`GLM research failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  let bookmark;
  try {
    bookmark = validateAIResponse(result.raw);
  } catch (err) {
    console.error(
      `AI returned invalid data: ${err instanceof Error ? err.message : String(err)}`,
    );
    console.error(`Raw response:\n${result.rawContent.slice(0, 800)}`);
    process.exit(1);
  }

  const dateAdded = dateStamp();
  const filename = filenameFor(bookmark, dateAdded);
  const filepath = path.join(BOOKMARKS_DIR, filename);
  const fileBody = toFrontmatter({
    url: normalized,
    title: bookmark.title,
    summary: bookmark.summary,
    use: bookmark.use,
    category: bookmark.category,
    tags: bookmark.tags,
    dateAdded,
    urlHash: hash,
  });

  if (flags.dryRun) {
    console.log(`\n--- DRY RUN: ${filename} ---`);
    console.log(fileBody);
    process.exit(0);
  }

  await mkdir(BOOKMARKS_DIR, { recursive: true });
  await writeFile(filepath, fileBody, 'utf8');
  console.log(`Saved: ${filename}`);
  console.log(`  ${bookmark.title} [${bookmark.category}] (${bookmark.tags.join(', ')})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
