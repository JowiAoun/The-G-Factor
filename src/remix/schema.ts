import { z } from 'zod';

export const VariationSchema = z.object({
  variation_code: z.string().min(1),
  transformation_label: z.string().min(1),
  explanation_one_line: z.string().min(1),
});

export type Variation = z.infer<typeof VariationSchema>;

/**
 * Strip common LLM fences and extract the first JSON object found.
 */
export function extractJson(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim();
  // Strip ```json ... ``` fences (with or without language tag).
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // Find first { ... last } pair (greedy through last closer).
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return s.slice(first, last + 1);
}

export function safeParseVariation(
  raw: string,
):
  | { ok: true; value: Variation }
  | { ok: false; reason: 'no_json' | 'bad_json' | 'bad_shape'; error: string } {
  const json = extractJson(raw);
  if (!json) return { ok: false, reason: 'no_json', error: 'no JSON object in output' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      ok: false,
      reason: 'bad_json',
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const z = VariationSchema.safeParse(parsed);
  if (!z.success) {
    return { ok: false, reason: 'bad_shape', error: z.error.message };
  }
  return { ok: true, value: z.data };
}
