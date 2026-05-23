import { generate } from '../model/gemma';
import { parse as strudelParse } from '../strudel/parse';
import { getTopKSimilar } from '../memory/taste';
import { buildTurnPrompt, type ChatTurn } from './prompts';
import { safeParseTurn, type ParsedTurn } from './schema';

export type TurnStatus =
  | 'valid'
  | 'invalid_json'
  | 'invalid_shape'
  | 'invalid_strudel'
  | 'error';

export type TurnAttempt = {
  rawOutput: string;
  status: TurnStatus;
  error?: string;
  parsed?: ParsedTurn;
};

export type TurnResult = {
  status: TurnStatus;
  turn?: ParsedTurn;
  attempts: TurnAttempt[];
  durationMs: number;
  /** Count of taste exemplars injected into the prompt this turn. */
  exemplarsUsed: number;
};

const MAX_RETRIES = 3;
const MAX_NEW_TOKENS = 320;

export class TurnCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'TurnCancelledError';
  }
}

/**
 * One conversational round-trip with Bleep.
 *
 * Wraps `generate()` from the Gemma loader, validates the JSON with
 * `safeParseTurn`, then runs the proposed mix code through the parser
 * firewall. Up to `MAX_RETRIES` attempts; each retry passes the previous
 * failure reason back to the model as a hint and bumps temperature a
 * little so we don't keep landing on the same bad output.
 *
 * If `signal` is set and gets aborted, throws `TurnCancelledError` at the
 * next checkpoint (before each generate, before each validation step, and
 * between retries). The in-flight `model.generate()` itself can't be
 * cancelled mid-token on WebGPU — its result is just discarded once it
 * settles, which keeps the UI responsive while the orphan completes in
 * the background. On final failure the caller keeps the existing mix and
 * surfaces a persona apology.
 */
export async function composeTurn(args: {
  currentMix: string;
  history: ChatTurn[];
  userMessage: string;
  signal?: AbortSignal;
}): Promise<TurnResult> {
  const t0 = performance.now();
  const attempts: TurnAttempt[] = [];
  let lastError: string | undefined;

  const throwIfCancelled = () => {
    if (args.signal?.aborted) throw new TurnCancelledError();
  };

  // Layer-2 retrieval: pull the top-3 most-similar liked mixes from the
  // taste store and inject them as exemplars in the system prompt. Falls
  // back to an empty list if IndexedDB is unavailable. Cheap enough to do
  // before each round-trip; the retrieval itself runs once per turn (not
  // once per retry) since the user message and current mix are stable
  // across attempts.
  const retrievalKey = args.currentMix.trim() || args.userMessage;
  const exemplars = await getTopKSimilar(retrievalKey, 3).catch(() => []);

  for (let i = 0; i < MAX_RETRIES; i++) {
    throwIfCancelled();
    const { messages } = buildTurnPrompt(
      args.currentMix,
      args.history,
      args.userMessage,
      lastError,
      exemplars,
    );

    let raw = '';
    try {
      raw = await generate(messages, {
        maxNewTokens: MAX_NEW_TOKENS,
        temperature: 0.75 + i * 0.1,
      });
    } catch (err) {
      throwIfCancelled();
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ rawOutput: '', status: 'error', error: msg });
      lastError = msg;
      continue;
    }

    throwIfCancelled();
    const parsed = safeParseTurn(raw);
    if (!parsed.ok) {
      const status: TurnStatus =
        parsed.reason === 'bad_shape' ? 'invalid_shape' : 'invalid_json';
      attempts.push({ rawOutput: raw, status, error: parsed.error });
      lastError = `${status}: ${parsed.error}`;
      continue;
    }

    const firewall = await strudelParse(parsed.value.new_mix_code);
    throwIfCancelled();
    if (!firewall.valid) {
      attempts.push({
        rawOutput: raw,
        status: 'invalid_strudel',
        error: firewall.error,
        parsed: parsed.value,
      });
      // Pass the `reason` along so the next retry hint tells Gemma whether
      // to fix syntax vs. drop a disallowed reference.
      lastError = `invalid_strudel (${firewall.reason}): ${firewall.error}`;
      continue;
    }

    attempts.push({ rawOutput: raw, status: 'valid', parsed: parsed.value });
    return {
      status: 'valid',
      turn: parsed.value,
      attempts,
      durationMs: Math.round(performance.now() - t0),
      exemplarsUsed: exemplars.length,
    };
  }

  return {
    status: attempts.at(-1)?.status ?? 'error',
    attempts,
    durationMs: Math.round(performance.now() - t0),
    exemplarsUsed: exemplars.length,
  };
}
