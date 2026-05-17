import { generateVariation, type GenerationResult } from './generate';
import { getTopKSimilar, type Exemplar } from '../memory/taste';

export type RemixProgress = (latest: GenerationResult, index: number) => void;

export type RemixContext = {
  exemplars: Exemplar[];
};

/**
 * Run `count` sequential generations against the same seed and stream each
 * result via `onResult`. The browser model only handles one inference at a
 * time, so true parallelism would just serialise on the WebGPU adapter — we
 * keep this loop linear and let the UI update incrementally.
 *
 * Before generating, retrieve the top-K most-similar liked variations from
 * taste memory and inject them as few-shot exemplars (Layer 2 of the
 * pedagogy: the model gets context-better at predicting *this* user's style).
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
  const results: GenerationResult[] = [];
  for (let i = 0; i < count; i++) {
    const res = await generateVariation(seedCode, exemplars);
    results.push(res);
    onResult(res, i);
  }
  return { results, context: { exemplars } };
}
