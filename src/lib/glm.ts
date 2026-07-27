import { CATEGORIES } from './categories.ts';
import type { RawAIResponse } from './bookmark.ts';

// Coding Plan endpoint by default — override with ZAI_ENDPOINT for pay-as-you-go keys.
const ZAI_ENDPOINT =
  process.env.ZAI_ENDPOINT ?? 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const DEFAULT_MODEL = 'glm-5.2';

export interface ResearchOptions {
  /** Override the model id (defaults to ZAI_MODEL env var or glm-5.2). */
  model?: string;
  /** Override the endpoint (defaults to ZAI_ENDPOINT env var or Coding Plan endpoint). */
  endpoint?: string;
  /** Max retries on transient network/5xx errors (default 1). */
  maxRetries?: number;
}

const SYSTEM_PROMPT = `You are a bookmark-classification assistant. Given a URL, you research the site (using web search when needed) and return structured metadata.

Return ONLY a single JSON object — no markdown fences, no commentary. Exact shape:
{
  "title": "site or product name, <= 60 chars",
  "summary": "1-2 sentences: what this site IS",
  "use": "1 short sentence: what someone would use this FOR",
  "category": "ONE of: ${CATEGORIES.join(' | ')}",
  "tags": ["3-4 lowercase kebab-case keywords, no duplicates"]
}

Rules:
- "category" must be one of the listed values (case-insensitive OK).
- "tags" lowercased, hyphenated, max 4 items, no duplicates.
- If the site requires login and you cannot research it deeply, infer from the URL and brand name.
- Never wrap the JSON in backticks or markdown.`;

function buildUserPrompt(url: string): string {
  return `Research and classify this URL:\n\n${url}`;
}

/** Retry wrapper for transient failures. */
async function withRetry<T>(fn: () => Promise<T>, retries: number, delayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
    }
  }
  throw lastErr;
}

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Extract a JSON object from a model response that may be wrapped in fences or prose. */
export function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fall through
    }
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      // fall through
    }
  }
  throw new Error(`No JSON object found in model response:\n${trimmed.slice(0, 400)}`);
}

/**
 * Call GLM via z.ai with web_search enabled, return parsed raw AI response.
 * Throws on non-transient errors, bad auth, or unparseable output.
 */
export async function researchUrl(
  url: string,
  apiKey: string,
  opts: ResearchOptions = {},
): Promise<{ raw: RawAIResponse; rawContent: string }> {
  const model = opts.model ?? process.env.ZAI_MODEL ?? DEFAULT_MODEL;
  const endpoint = opts.endpoint ?? ZAI_ENDPOINT;
  const maxRetries = opts.maxRetries ?? 1;

  const doCall = async (): Promise<{ raw: RawAIResponse; rawContent: string }> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(url) },
        ],
        tools: [{ type: 'web_search', web_search: { enable: true, search_result: false } }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (isTransient(res.status)) {
      const body = await res.text().catch(() => '');
      throw new Error(`transient HTTP ${res.status}: ${body.slice(0, 400)}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GLM API HTTP ${res.status}: ${body.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`GLM API returned no content: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return { raw: extractJSON(content) as RawAIResponse, rawContent: content };
  };

  return withRetry(doCall, maxRetries);
}
