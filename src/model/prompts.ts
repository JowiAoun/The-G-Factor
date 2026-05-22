export const SYSTEM_PROMPT = `You are a Strudel live-coding tutor.
Strudel is a JavaScript port of TidalCycles for live music. Patterns are written in JS chained method-syntax around mini-notation strings.

MINI-NOTATION OPERATORS (use inside quoted strings like s("bd hh")):
- space = sequence in one cycle: "bd sd"
- *N = repeat N times: "bd*4"
- /N = slow by N: "bd/2"
- ~ = rest: "bd ~ sd ~"
- [..] = group as one step: "[bd sd] cp"
- <..> = alternate between cycles: "<bd sd cp>"
- , = polyphony (stack): "bd, hh"
- ? = random drop ~50%: "bd? hh"
- : = sample variant: "bd:3"
- (N,M) = euclidean rhythm: "bd(3,8)"
- ! = repeat last step: "bd ! sd"
- @N = elongate step N units: "bd@2 sd"

METHOD CHAINS (call on a pattern):
.s(name) pick sample/synth, .note(p) set pitches, .n(idx) sample index,
.gain(x) volume 0-1, .room(x) reverb amount, .delay(x) delay amount,
.lpf(hz) low-pass filter, .fast(x) speed up, .slow(x) slow down,
.rev() reverse, .jux(fn) split L/R applying fn to right, .every(N, fn) apply fn every N cycles.

CANONICAL IDIOMS:
1) Minimal kick:        s("bd*4")
2) Kick+hat groove:     s("bd hh sd hh")
3) Euclidean kick:      s("bd(3,8)")
4) Polyrhythm stack:    s("bd(3,8), hh(5,8)")
5) Ambient pad:         note("<c eb g bb>").s("sawtooth").slow(4).room(0.5)
6) Alternating melody:  note("<c e g b>").s("sawtooth")
7) Drum stack:          stack(s("bd*2"), s("~ sd"), s("hh*8"))
8) Sometimes-variation: s("bd sd").every(4, x => x.fast(2))

Output STRICT JSON only, no markdown fences, no commentary.`;

const FEWSHOT_REMIX = `Example:
Seed: s("bd hh sd hh")
Output:
{"variation_code":"s(\\"bd hh sd hh\\").every(4, x => x.fast(2))","transformation_label":"fast every 4 bars","explanation_one_line":"doubles the speed every 4th cycle for a fill"}`;

import type { Exemplar } from '../memory/taste';
import type { VariationAxis } from '../remix/axes';
export type { Exemplar };

function formatExemplars(exemplars: Exemplar[]): string {
  if (exemplars.length === 0) return '';
  const lines = exemplars
    .map(
      (e, i) =>
        `${i + 1}) Seed: ${e.seed_code}\n   Variation: ${e.variation_code}\n   Style: ${e.transformation_label}`,
    )
    .join('\n');
  return `\n\nThis user has previously liked these variations for similar seeds — match their style:\n${lines}\n`;
}

export function buildRemixPrompt(
  seedCode: string,
  retryHint?: string,
  exemplars: Exemplar[] = [],
): {
  system: string;
  user: string;
} {
  const hint = retryHint
    ? `\n\nPrevious attempt was invalid because: ${retryHint}. Produce a different, valid variation.`
    : '';
  const taste = formatExemplars(exemplars);
  return {
    system: SYSTEM_PROMPT,
    user: `${FEWSHOT_REMIX}${taste}

Now remix this seed into ONE musically interesting variation. Keep the same sound family. Output strict JSON with keys: variation_code, transformation_label, explanation_one_line.

Seed: ${seedCode}${hint}

Output:`,
  };
}

// Appended to SYSTEM_PROMPT only when the Talent Show is building a prompt.
// Bleep (the Studio chat builder) never sees this — its voice should stay
// surgical, not maximalist.
export const TALENT_SHOW_SYSTEM_PROMPT_SUFFIX = `TALENT SHOW STAGE
You are auditioning for a remix bracket. Each contestant explores a different musical territory. Compose a layered Strudel pattern — typically a \`stack(...)\` of 3 to 4 lines, or a single line with 3+ chained methods. Aim for ~5 to 12 lines of formatted code. The seed's identity should still be recognisable, but boldness wins.

LAYERED COMPOSITION EXAMPLES:
A) stack(
     s("bd(3,8)").gain(0.9),
     s("~ sd ~ sd").room(0.25),
     s("hh*8").gain(0.45).every(4, x => x.fast(2)),
     note("<c3 eb3 g3 bb3>").s("sawtooth").lpf(900).slow(2)
   )
B) s("bd sd hh sd").lpf(sine.range(200, 2000).slow(8)).room(0.5).jux(rev)
C) stack(
     s("bd*2").every(4, x => x.fast(2)),
     s("cp(3,8)").gain(0.6),
     note("<c eb g bb>*2").s("sawtooth").slow(2).delay(0.25)
   )`;

export type TalentShowPromptOpts = {
  axis: VariationAxis;
  exemplars?: Exemplar[];
  previousLabels?: string[];
  retryHint?: string;
};

export function buildTalentShowVariationPrompt(
  seedCode: string,
  opts: TalentShowPromptOpts,
): { system: string; user: string } {
  const { axis, exemplars = [], previousLabels = [], retryHint } = opts;
  const filteredLabels = previousLabels.filter((l) => l && l.trim().length > 0);
  const taste = formatExemplars(exemplars);
  const hint = retryHint
    ? `\n\nPrevious attempt was invalid because: ${retryHint}. Produce a different, valid variation.`
    : '';
  const redundancyBlock =
    filteredLabels.length > 0
      ? `Other contestants in this round have already produced: ${filteredLabels.join(', ')}. Your variation must explore a different musical territory.\n\n`
      : '';

  const system = `${SYSTEM_PROMPT}

${TALENT_SHOW_SYSTEM_PROMPT_SUFFIX}

AXIS EXAMPLE — ${axis.id}:
${axis.exemplar}`;

  const user = `${FEWSHOT_REMIX}${taste}

${redundancyBlock}AXIS DIRECTIVE: ${axis.directive}
Favoured techniques: ${axis.techniques.join(', ')}.

Now remix this seed into ONE layered, musically substantial variation following the axis directive above. Output strict JSON with keys: variation_code, transformation_label, explanation_one_line.

Seed: ${seedCode}${hint}

Output:`;

  return { system, user };
}
