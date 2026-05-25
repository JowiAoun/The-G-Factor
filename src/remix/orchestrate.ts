import { generateVariation, type GenerationResult } from './generate';
import { pickAxesForBracket } from './axes';
import { getTopKSimilar, type Exemplar } from '../memory/taste';
import { getMode, getThrottleMs } from '../model/backend';

export type RemixProgress = (latest: GenerationResult, index: number) => void;

export type RemixContext = {
  exemplars: Exemplar[];
};

/**
 * Generate `count` contestants against the same seed and stream each result
 * via `onResult`.
 *
 * - **Local backend**: serial — the WebGPU adapter handles one inference at
 *   a time, so parallel calls would just queue on the GPU. Each generation
 *   sees the prior `transformation_label`s and is asked to avoid repeating
 *   them.
 * - **Remote backend**: launches are staggered by `getThrottleMs()` but the
 *   in-flight HTTP requests overlap. This collapses wall time from
 *   `sum(latencies)` to roughly `(count - 1) * stagger + max(latency)`
 *   while keeping the per-minute request rate inside OpenRouter free-tier
 *   limits. Pure fan-out (no stagger) bursts past the cap, triggers 429s
 *   on every request, and because the per-request backoff schedule is
 *   identical, the retries collide on the same retry-after window and
 *   fail again. The per-axis directives already provide musical
 *   diversity, so the label-dedup hint is dropped in this mode.
 *
 * Before generating, retrieve the top-K most-similar liked variations from
 * taste memory and inject them as few-shot exemplars (Layer 2 of the
 * pedagogy: the model gets context-better at predicting *this* user's style).
 *
 * Each slot is pre-assigned a musical axis from a deterministic seed-keyed
 * shuffle so the four (or eight) variations explore different musical
 * territories instead of relying on sampling alone for diversity.
 */
export async function remixSeed(
  seedCode: string,
  count: number,
  onResult: RemixProgress,
): Promise<{ results: GenerationResult[]; context: RemixContext }> {
  const exemplars = await getTopKSimilar(seedCode, 3);
  if (exemplars.length > 0) {
    // eslint-disable-next-line no-console
    console.log('[remix] injecting taste exemplars:', exemplars);
  }
  const axes = pickAxesForBracket(seedCode, count);
  // eslint-disable-next-line no-console
  console.log('[remix] axis lineup:', axes.map((a) => a.id));

  if (getMode() === 'remote') {
    const stagger = getThrottleMs();
    const pending: Promise<GenerationResult>[] = [];
    for (let i = 0; i < count; i++) {
      if (i > 0 && stagger > 0) await sleep(stagger);
      // Axis-derived timbre roster: deterministic, available up-front (the
      // axes are picked before any HTTP launches), and consistent with how
      // the prompt builder already nudges per-axis families.
      const previousTimbres = axes.slice(0, i).map((a) => a.timbre);
      pending.push(
        generateVariation(seedCode, axes[i], exemplars, [], previousTimbres),
      );
    }
    const results: GenerationResult[] = [];
    for (let i = 0; i < pending.length; i++) {
      const res = await pending[i];
      results.push(res);
      onResult(res, i);
    }
    return { results, context: { exemplars } };
  }

  const results: GenerationResult[] = [];
  const previousLabels: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      const delay = getThrottleMs();
      if (delay > 0) await sleep(delay);
    }
    const previousTimbres = axes.slice(0, i).map((a) => a.timbre);
    const res = await generateVariation(
      seedCode,
      axes[i],
      exemplars,
      previousLabels,
      previousTimbres,
    );
    results.push(res);
    const label = res.variation?.transformation_label;
    if (label) previousLabels.push(label);
    onResult(res, i);
  }
  return { results, context: { exemplars } };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
