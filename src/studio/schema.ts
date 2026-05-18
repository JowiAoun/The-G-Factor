import { z } from 'zod';
import { extractJson } from '../remix/schema';

export const TurnSchema = z.object({
  /** Full new Strudel code after applying the user's request (no diffs). */
  new_mix_code: z.string(),
  /** One- or two-sentence in-character reply from the persona. */
  assistant_message: z.string().min(1),
  /** Short tag describing the change: "added kick", "halved tempo", "no-op". */
  action_label: z.string().min(1),
});

export type ParsedTurn = z.infer<typeof TurnSchema>;

export type TurnParseResult =
  | { ok: true; value: ParsedTurn }
  | { ok: false; reason: 'no_json' | 'bad_json' | 'bad_shape'; error: string };

/**
 * Strip markdown fences and zod-validate one chat-turn JSON response.
 *
 * Mirrors `safeParseVariation` in `src/remix/schema.ts` — same fence-eating
 * tolerance for LLM output, same discriminated-union return shape so the
 * orchestrator can decide between retry and surface-the-failure.
 */
export function safeParseTurn(raw: string): TurnParseResult {
  const json = extractJson(raw);
  if (!json) {
    return { ok: false, reason: 'no_json', error: 'no JSON object in output' };
  }
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
  const z = TurnSchema.safeParse(parsed);
  if (!z.success) {
    return { ok: false, reason: 'bad_shape', error: z.error.message };
  }
  return { ok: true, value: z.data };
}
