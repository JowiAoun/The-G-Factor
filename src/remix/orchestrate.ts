import { generateVariation, type GenerationResult } from './generate';

export type RemixProgress = (latest: GenerationResult, index: number) => void;

/**
 * Run `count` sequential generations against the same seed and stream each
 * result via `onResult`. The browser model only handles one inference at a
 * time, so true parallelism would just serialise on the WebGPU adapter — we
 * keep this loop linear and let the UI update incrementally.
 */
export async function remixSeed(
  seedCode: string,
  count: number,
  onResult: RemixProgress,
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  for (let i = 0; i < count; i++) {
    const res = await generateVariation(seedCode);
    results.push(res);
    onResult(res, i);
  }
  return results;
}
