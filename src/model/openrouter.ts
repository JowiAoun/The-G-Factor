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

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        // OpenRouter ranking attribution — optional but encouraged.
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

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error(
        'OpenRouter rejected the API key (401). Open ⚙ Settings to update it.',
      );
    }
    if (response.status === 429) {
      throw new Error(
        'OpenRouter rate-limited the request (429). Try again in a minute, or switch to Local mode.',
      );
    }
    throw new Error(
      `OpenRouter ${response.status}: ${text || response.statusText}`,
    );
  }

  const json = (await response.json()) as ChatCompletionResponse;
  if (json.error?.message) {
    throw new Error(`OpenRouter: ${json.error.message}`);
  }
  return json.choices?.[0]?.message?.content ?? '';
}
