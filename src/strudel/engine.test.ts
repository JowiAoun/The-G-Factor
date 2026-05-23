import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { play } from './engine';

// Mock @strudel/web at module-load time. We never actually want a real
// WebAudio context in unit tests — we just want to assert that play()
// refuses unsafe code BEFORE it would hand off to Strudel, and that safe
// code reaches the evaluate boundary.
const initStrudel = vi.fn(async () => undefined);
const evaluate = vi.fn(async () => undefined);
const hush = vi.fn();

vi.mock('@strudel/web', () => ({
  initStrudel: () => initStrudel(),
  getAudioContext: () => null,
}));

beforeEach(() => {
  initStrudel.mockClear();
  evaluate.mockClear();
  hush.mockClear();
  // The play() path looks up evaluate / hush on globalThis after init.
  (globalThis as unknown as { evaluate?: unknown; hush?: unknown }).evaluate =
    evaluate;
  (globalThis as unknown as { evaluate?: unknown; hush?: unknown }).hush = hush;
});

afterEach(() => {
  delete (globalThis as unknown as { evaluate?: unknown }).evaluate;
  delete (globalThis as unknown as { hush?: unknown }).hush;
});

describe('engine.play() — firewall', () => {
  it('refuses code that references banned globals', async () => {
    await expect(play('fetch("https://evil.example")')).rejects.toThrow(
      /Refused to play: disallowed reference: fetch/,
    );
    expect(evaluate).not.toHaveBeenCalled();
    expect(initStrudel).not.toHaveBeenCalled();
  });

  it('refuses sandbox-escape via .constructor', async () => {
    await expect(
      play('(0).constructor.constructor("alert(1)")()'),
    ).rejects.toThrow(/Refused to play: disallowed property access: \.constructor/);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('refuses bracket-notation banned property access', async () => {
    await expect(play('({})["constructor"]')).rejects.toThrow(
      /Refused to play: disallowed property access: \["constructor"\]/,
    );
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('refuses syntactically broken code with an Invalid Strudel error', async () => {
    await expect(play('s("bd"')).rejects.toThrow(/Invalid Strudel:/);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('refuses empty code without booting Strudel', async () => {
    await expect(play('')).rejects.toThrow(/Invalid Strudel: empty code/);
    expect(initStrudel).not.toHaveBeenCalled();
  });
});
