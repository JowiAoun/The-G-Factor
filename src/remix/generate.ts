import { buildTalentShowVariationPrompt, type Exemplar } from '../model/prompts';
import { generate } from '../model/gemma';
import { safeParseVariation, type Variation } from './schema';
import { parse as strudelParse } from '../strudel/parse';
import type { VariationAxis } from './axes';

export type GenerationStatus =
  | 'valid'
  | 'invalid_json'
  | 'invalid_shape'
  | 'invalid_strudel'
  | 'error';

export type GenerationAttempt = {
  rawOutput: string;
  status: GenerationStatus;
  error?: string;
  variation?: Variation;
};

export type GenerationResult = {
  attempts: GenerationAttempt[];
  status: GenerationStatus;
  variation?: Variation;
  durationMs: number;
};

const MAX_RETRIES = 3;
// Talent Show variations are now layered compositions (`stack(...)` of 3-4
// lines, or single chains with several methods). 480 tokens accommodates the
// target shape with headroom for the JSON envelope.
const MAX_NEW_TOKENS = 480;
// Higher base temperature so the per-axis directive has room to push the
// sampler into different regions of the output distribution. Retries bump
// further, capped at 1.25 so JSON shape stays robust.
function temperatureForAttempt(i: number): number {
  return Math.min(0.95 + i * 0.1, 1.25);
}

export async function generateVariation(
  seedCode: string,
  axis: VariationAxis,
  exemplars: Exemplar[] = [],
  previousLabels: string[] = [],
): Promise<GenerationResult> {
  const t0 = performance.now();
  const attempts: GenerationAttempt[] = [];
  let lastError: string | undefined;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const { system, user } = buildTalentShowVariationPrompt(seedCode, {
      axis,
      exemplars,
      previousLabels,
      retryHint: lastError,
    });
    let raw = '';
    try {
      raw = await generate(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        {
          maxNewTokens: MAX_NEW_TOKENS,
          temperature: temperatureForAttempt(i),
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ rawOutput: '', status: 'error', error: msg });
      lastError = msg;
      continue;
    }

    const parsed = safeParseVariation(raw);
    if (!parsed.ok) {
      const status: GenerationStatus =
        parsed.reason === 'no_json' || parsed.reason === 'bad_json'
          ? 'invalid_json'
          : 'invalid_shape';
      attempts.push({ rawOutput: raw, status, error: parsed.error });
      lastError = `${status}: ${parsed.error}`;
      continue;
    }

    const firewall = await strudelParse(parsed.value.variation_code);
    if (!firewall.valid) {
      attempts.push({
        rawOutput: raw,
        status: 'invalid_strudel',
        error: firewall.error,
        variation: parsed.value,
      });
      lastError = `invalid_strudel: ${firewall.error}`;
      continue;
    }

    attempts.push({ rawOutput: raw, status: 'valid', variation: parsed.value });
    return {
      attempts,
      status: 'valid',
      variation: parsed.value,
      durationMs: Math.round(performance.now() - t0),
    };
  }

  return {
    attempts,
    status: attempts.at(-1)?.status ?? 'error',
    durationMs: Math.round(performance.now() - t0),
  };
}
