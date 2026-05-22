import { describe, expect, it } from 'vitest';
import {
  SYSTEM_PROMPT,
  TALENT_SHOW_SYSTEM_PROMPT_SUFFIX,
  buildRemixPrompt,
  buildTalentShowVariationPrompt,
} from './prompts';
import { VARIATION_AXES } from '../remix/axes';

describe('buildRemixPrompt (Studio / regression guard)', () => {
  // The Studio's Bleep path uses a different builder, but `buildRemixPrompt`
  // is still exported and we don't want its voice to drift just because the
  // Talent Show got louder next door. Guard the shape.
  it('returns the bare SYSTEM_PROMPT as system message', () => {
    const { system } = buildRemixPrompt('s("bd*4")');
    expect(system).toBe(SYSTEM_PROMPT);
    expect(system).not.toContain('TALENT SHOW STAGE');
  });

  it("preserves the 'Keep the same sound family' directive", () => {
    const { user } = buildRemixPrompt('s("bd*4")');
    expect(user).toContain('Keep the same sound family');
    expect(user).toContain('ONE musically interesting variation');
  });

  it('does not leak any Talent Show vocabulary into the user prompt', () => {
    const { user } = buildRemixPrompt('s("bd*4")');
    expect(user).not.toContain('AXIS DIRECTIVE');
    expect(user).not.toContain('layered, musically substantial');
    expect(user).not.toContain('Other contestants in this round');
  });

  it('renders the retry hint when present', () => {
    const { user } = buildRemixPrompt('s("bd*4")', 'unbalanced parens');
    expect(user).toContain('Previous attempt was invalid because: unbalanced parens');
  });

  it('renders taste exemplars when present', () => {
    const exemplars = [
      {
        seed_code: 's("bd*4")',
        variation_code: 's("bd*4").every(4, x => x.fast(2))',
        transformation_label: 'fast fill',
      },
    ];
    const { user } = buildRemixPrompt('s("bd*4")', undefined, exemplars);
    expect(user).toContain('This user has previously liked');
    expect(user).toContain('fast fill');
  });
});

describe('buildTalentShowVariationPrompt', () => {
  const axis = VARIATION_AXES.find((a) => a.id === 'polyrhythmic')!;

  it('appends the TALENT SHOW STAGE suffix to the system prompt', () => {
    const { system } = buildTalentShowVariationPrompt('s("bd*4")', { axis });
    expect(system).toContain(SYSTEM_PROMPT);
    expect(system).toContain('TALENT SHOW STAGE');
    expect(system).toContain(TALENT_SHOW_SYSTEM_PROMPT_SUFFIX);
  });

  it('injects the axis-specific exemplar into the system prompt', () => {
    const { system } = buildTalentShowVariationPrompt('s("bd*4")', { axis });
    expect(system).toContain(`AXIS EXAMPLE — ${axis.id}`);
    expect(system).toContain(axis.exemplar);
  });

  it('injects the axis directive and techniques into the user prompt', () => {
    const { user } = buildTalentShowVariationPrompt('s("bd*4")', { axis });
    expect(user).toContain(`AXIS DIRECTIVE: ${axis.directive}`);
    expect(user).toContain(`Favoured techniques: ${axis.techniques.join(', ')}`);
    expect(user).toContain('ONE layered, musically substantial variation');
    expect(user).toContain('Seed: s("bd*4")');
  });

  it('omits the redundancy block when previousLabels is empty', () => {
    const { user } = buildTalentShowVariationPrompt('s("bd*4")', { axis });
    expect(user).not.toContain('Other contestants in this round');
  });

  it('omits the redundancy block when previousLabels has only empty strings', () => {
    const { user } = buildTalentShowVariationPrompt('s("bd*4")', {
      axis,
      previousLabels: ['', '  ', ''],
    });
    expect(user).not.toContain('Other contestants in this round');
  });

  it('renders the redundancy block listing prior labels when present', () => {
    const { user } = buildTalentShowVariationPrompt('s("bd*4")', {
      axis,
      previousLabels: ['fast fill', 'filter sweep'],
    });
    expect(user).toContain(
      'Other contestants in this round have already produced: fast fill, filter sweep.',
    );
    expect(user).toContain('Your variation must explore a different musical territory');
  });

  it('renders the retry hint when present', () => {
    const { user } = buildTalentShowVariationPrompt('s("bd*4")', {
      axis,
      retryHint: 'unbalanced parens',
    });
    expect(user).toContain('Previous attempt was invalid because: unbalanced parens');
  });

  it('renders taste exemplars when present', () => {
    const exemplars = [
      {
        seed_code: 's("bd*4")',
        variation_code: 's("bd*4").every(4, x => x.fast(2))',
        transformation_label: 'fast fill',
      },
    ];
    const { user } = buildTalentShowVariationPrompt('s("bd*4")', { axis, exemplars });
    expect(user).toContain('This user has previously liked');
    expect(user).toContain('fast fill');
  });

  it('drops the "same sound family" directive that suppressed diversity', () => {
    const { user } = buildTalentShowVariationPrompt('s("bd*4")', { axis });
    expect(user).not.toContain('Keep the same sound family');
  });

  it.each(VARIATION_AXES)('builds a coherent prompt for axis $id', (a) => {
    const { system, user } = buildTalentShowVariationPrompt('s("bd hh sd hh")', {
      axis: a,
    });
    expect(system).toContain(a.exemplar);
    expect(user).toContain(a.directive);
    expect(user).toContain(a.techniques[0]);
  });
});
