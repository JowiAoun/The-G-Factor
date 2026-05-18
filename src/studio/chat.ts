import { generate } from '../model/gemma';
import { parse as strudelParse } from '../strudel/parse';
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
};

const MAX_RETRIES = 3;
const MAX_NEW_TOKENS = 320;

/**
 * One conversational round-trip with Bleep.
 *
 * Wraps `generate()` from the Gemma loader, validates the JSON with
 * `safeParseTurn`, then runs the proposed mix code through the parser
 * firewall. Up to `MAX_RETRIES` attempts; each retry passes the previous
 * failure reason back to the model as a hint and bumps temperature a
 * little so we don't keep landing on the same bad output.
 *
 * On final failure the caller keeps the existing mix and surfaces a
 * persona apology — the `attempts` array carries the diagnostic detail.
 */
export async function composeTurn(args: {
  currentMix: string;
  history: ChatTurn[];
  userMessage: string;
}): Promise<TurnResult> {
  const t0 = performance.now();
  const attempts: TurnAttempt[] = [];
  let lastError: string | undefined;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const { messages } = buildTurnPrompt(
      args.currentMix,
      args.history,
      args.userMessage,
      lastError,
    );

    let raw = '';
    try {
      raw = await generate(messages, {
        maxNewTokens: MAX_NEW_TOKENS,
        temperature: 0.75 + i * 0.1,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ rawOutput: '', status: 'error', error: msg });
      lastError = msg;
      continue;
    }

    const parsed = safeParseTurn(raw);
    if (!parsed.ok) {
      const status: TurnStatus =
        parsed.reason === 'bad_shape' ? 'invalid_shape' : 'invalid_json';
      attempts.push({ rawOutput: raw, status, error: parsed.error });
      lastError = `${status}: ${parsed.error}`;
      continue;
    }

    const firewall = await strudelParse(parsed.value.new_mix_code);
    if (!firewall.valid) {
      attempts.push({
        rawOutput: raw,
        status: 'invalid_strudel',
        error: firewall.error,
        parsed: parsed.value,
      });
      lastError = `invalid_strudel: ${firewall.error}`;
      continue;
    }

    attempts.push({ rawOutput: raw, status: 'valid', parsed: parsed.value });
    return {
      status: 'valid',
      turn: parsed.value,
      attempts,
      durationMs: Math.round(performance.now() - t0),
    };
  }

  return {
    status: attempts.at(-1)?.status ?? 'error',
    attempts,
    durationMs: Math.round(performance.now() - t0),
  };
}
