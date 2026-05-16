import { SPIKE_SEEDS, type Seed } from './seeds';
import { generateVariation, type GenerationResult } from '../remix/generate';

export type SpikeRow = {
  id: string;
  seed: Seed;
  variationIndex: number;
  result: GenerationResult;
};

export type SpikeProgress = {
  done: number;
  total: number;
  current?: { seedId: string; variationIndex: number };
  rows: SpikeRow[];
};

export const SPIKE_TOTAL = SPIKE_SEEDS.length * 3;

export async function runSpike(onProgress: (p: SpikeProgress) => void): Promise<SpikeRow[]> {
  const rows: SpikeRow[] = [];
  for (const seed of SPIKE_SEEDS) {
    for (let v = 0; v < 3; v++) {
      onProgress({
        done: rows.length,
        total: SPIKE_TOTAL,
        current: { seedId: seed.id, variationIndex: v },
        rows: [...rows],
      });
      const result = await generateVariation(seed.code);
      rows.push({ id: `${seed.id}-${v}`, seed, variationIndex: v, result });
      onProgress({ done: rows.length, total: SPIKE_TOTAL, rows: [...rows] });
    }
  }
  return rows;
}
