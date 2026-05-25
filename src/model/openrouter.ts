import type { GenerateMessage, GenerateOptions } from './gemma';

/**
 * OpenRouter chat-completions client for the remote backend path.
 *
 * Same input/output shape as the local `generate()` in `./gemma.ts` so the
 * dispatcher there can route by `BackendMode` without callers caring which
 * runtime served the response. The OpenRouter API is OpenAI-compatible, so
 * the `messages` array passes through untouched.
 *
 * Errors are converted to `Error` instances with human-readable messages
 * that the existing retry loop in `src/remix/generate.ts` will surface as
 * `engineError` in the UI. 401 / 429 get specific guidance so users can
 * act without opening the network tab.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Transparent backoff for transient 429s. Free-tier OpenRouter caps
// requests per minute, so a retry after a short wait usually succeeds
// without the user seeing anything. Surfaces the 429 to the caller only
// after the schedule is exhausted.
const RATE_LIMIT_BACKOFF_MS = [2_000, 5_000, 12_000] as const;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
};

export async function generateRemote(
  messages: GenerateMessage[],
  options: GenerateOptions,
  apiKey: string,
  modelId: string,
): Promise<string> {
  const body = {
    model: modelId,
    messages,
    temperature: options.temperature ?? 1.0,
    top_p: options.topP ?? 0.95,
    max_tokens: options.maxNewTokens ?? 256,
  };

  for (let attempt = 0; attempt <= RATE_LIMIT_BACKOFF_MS.length; attempt++) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          // OpenRouter ranking attribution - optional but encouraged.
          'HTTP-Referer':
            typeof window !== 'undefined'
              ? window.location.origin
              : 'http://localhost',
          'X-Title': 'Strudel Tutor',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`OpenRouter request failed: ${msg}`);
    }

    if (response.ok) {
      const json = (await response.json()) as ChatCompletionResponse;
      if (json.error?.message) {
        throw new Error(`OpenRouter: ${json.error.message}`);
      }
      return json.choices?.[0]?.message?.content ?? '';
    }

    if (response.status === 429 && attempt < RATE_LIMIT_BACKOFF_MS.length) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      const wait = retryAfter ?? RATE_LIMIT_BACKOFF_MS[attempt];
      await sleep(wait);
      continue;
    }

    const text = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error(
        'OpenRouter rejected the API key (401). Open ⚙ Settings to update it.',
      );
    }
    if (response.status === 429) {
      throw new Error(
        'OpenRouter rate-limited after retries (429). Raise the contestant delay in ⚙ Settings, or switch to Local mode.',
      );
    }
    throw new Error(
      `OpenRouter ${response.status}: ${text || response.statusText}`,
    );
  }

  // Loop always returns or throws above; this is unreachable.
  throw new Error('OpenRouter request failed: unreachable retry exit');
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const secs = Number.parseFloat(value);
  if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, 30_000);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
