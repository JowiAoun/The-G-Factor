import { describe, expect, it } from 'vitest';
import { safeParseTurn } from './schema';

describe('safeParseTurn', () => {
  it('parses a well-formed turn JSON', () => {
    const raw = '{"new_mix_code":"s(\\"bd*4\\")","assistant_message":"locked in.","action_label":"added kick"}';
    const r = safeParseTurn(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.new_mix_code).toBe('s("bd*4")');
      expect(r.value.action_label).toBe('added kick');
    }
  });

  it('strips markdown ```json fences', () => {
    const raw = '```json\n{"new_mix_code":"s(\\"bd*4\\")","assistant_message":"ok","action_label":"added kick"}\n```';
    const r = safeParseTurn(raw);
    expect(r.ok).toBe(true);
  });

  it('strips bare ``` fences', () => {
    const raw = '```\n{"new_mix_code":"s(\\"bd*4\\")","assistant_message":"ok","action_label":"added kick"}\n```';
    const r = safeParseTurn(raw);
    expect(r.ok).toBe(true);
  });

  it('reports no_json on output without an object', () => {
    const r = safeParseTurn('just some chatter');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_json');
  });

  it('reports bad_json on syntactically invalid JSON between braces', () => {
    // extractJson grabs the first { through last } — give it both so we
    // fall through to JSON.parse, then fail there.
    const r = safeParseTurn('{"new_mix_code": "s(", oops trailing junk}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_json');
  });

  it('reports bad_shape when fields are missing', () => {
    const r = safeParseTurn('{"new_mix_code":"s(\\"bd\\")"}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_shape');
  });

  it('rejects empty assistant_message and action_label', () => {
    const raw = '{"new_mix_code":"s(\\"bd\\")","assistant_message":"","action_label":""}';
    const r = safeParseTurn(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_shape');
  });
});
