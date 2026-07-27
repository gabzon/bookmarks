# AGENTS.md

Astro static site that renders a searchable list of saved bookmarks. The core
workflow is **not** "edit pages by hand" — it is `pnpm bm <url>`, which calls
the z.ai GLM API to research/classify a URL and writes a markdown file.

## Commands

- `pnpm bm <url>` — research + save a bookmark (the primary write path)
  - `--force` / `-f` — re-research and overwrite when the URL is already saved
  - `--dry-run` / `-n` — print the frontmatter that would be written, no save
  - `--help` / `-h` — usage
- `pnpm dev` — dev server on port 4321
- `pnpm build` — static build to `dist/`
- `pnpm test` — runs `tsx --test "src/**/*.test.ts"` (Node's built-in test
  runner, not vitest/jest). Run a single file: `pnpm test src/lib/bookmark.test.ts`
- There is no lint or format script. Typecheck with `astro check` (not wired
  into `package.json` — invoke directly). TS is strict (`astro/tsconfigs/strict`).

## Environment

Copy `.env.example` to `.env` and set `ZAI_API_KEY` (from https://z.ai). The
`bm` script reads `.env` itself via a tiny inline loader — no `dotenv` dep.

- `ZAI_MODEL` — optional, defaults to `glm-5.2`
- `ZAI_ENDPOINT` — optional. Defaults to the **Coding Plan** endpoint
  (`.../coding/paas/v4/...`). For a pay-as-you-go key, override to
  `https://api.z.ai/api/paas/v4/chat/completions`. Using the wrong endpoint
  for your key type fails at call time.

## How a bookmark flows through the system

1. `pnpm bm <url>` (`scripts/add-url.ts`) normalizes the URL and computes
   `urlHash` (10 hex chars of sha256 over the normalized URL).
2. It scans `src/content/bookmarks/*.md` for an existing file whose
   frontmatter `urlHash` matches. If found, refuses unless `--force`.
3. Calls GLM with `web_search` enabled → raw JSON → `validateAIResponse`
   clamps category/tags and enforces non-empty title/summary/use.
4. Writes `src/content/bookmarks/<YYYY-MM-DD>-<slug>.md` with full frontmatter.
5. `src/pages/index.astro` renders the collection at build/dev time via
   `getCollection('bookmarks')`.

The frontmatter schema is enforced by zod in `src/content/config.ts`. Manual
edits to bookmark files must satisfy it or `pnpm build` / `pnpm dev` will
fail at content collection load.

## Conventions

- **Package manager is `pnpm`** (lockfile + `pnpm-workspace.yaml`).
- **ESM with explicit `.ts` extensions in relative imports**
  (`./bookmark.ts`, not `./bookmark`). Preserve this — the codebase relies on it.
- **Path alias `@/*` → `src/*`** (configured in `tsconfig.json`).
- **`CATEGORIES` in `src/lib/categories.ts` is the single source of truth**
  for valid categories — the zod enum in `src/content/config.ts` derives from
  it, and `coerceCategory` matches AI free-text against it. Add a category
  there, not in the schema.
- **Dedup is by `urlHash`, not URL string.** `normalizeUrl` strips query,
  fragment, trailing slash, and lowercases host before hashing — so
  `?utm_source=x` variants of the same URL already dedupe.
- **`ponytail:` comments** mark deliberate simplifications with a known
  ceiling/upgrade path. Preserve the convention; don't strip them as cruft.
- Bookmark filenames are date-prefixed (`YYYY-MM-DD-`); `dateStamp()` uses
  local date, not UTC — intentional, to avoid off-by-one on evening saves.
