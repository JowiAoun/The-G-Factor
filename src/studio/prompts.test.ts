import { describe, expect, it } from 'vitest';
import { buildTurnPrompt, HISTORY_DEPTH, type ChatTurn } from './prompts';

describe('buildTurnPrompt - shape', () => {
  it('emits one system + one user message when called with no history', () => {
    const { messages } = buildTurnPrompt('', [], 'hello');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('hello');
  });

  it('threads chat history between system and the new user message', () => {
    const history: ChatTurn[] = [
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
    ];
    const { messages } = buildTurnPrompt('', history, 'C');
    expect(messages).toHaveLength(4);
    expect(messages[1]).toEqual({ role: 'user', content: 'A' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'B' });
    expect(messages[3].content).toBe('C');
  });

  it('trims chat history to the last HISTORY_DEPTH turns', () => {
    const history: ChatTurn[] = Array.from({ length: HISTORY_DEPTH * 2 }, (_, i) => ({
      role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant',
      content: `turn-${i}`,
    }));
    const { messages } = buildTurnPrompt('', history, 'new');
    // 1 system + HISTORY_DEPTH history + 1 new user
    expect(messages).toHaveLength(HISTORY_DEPTH + 2);
    expect(messages[1].content).toBe(`turn-${HISTORY_DEPTH}`);
  });
});

describe('buildTurnPrompt - system content', () => {
  it('inlines the current mix code', () => {
    const { messages } = buildTurnPrompt('s("bd*4")', [], 'add hats');
    expect(messages[0].content).toContain('s("bd*4")');
    expect(messages[0].content).toMatch(/CURRENT MIX/);
  });

  it('marks the mix as empty when none is set yet', () => {
    const { messages } = buildTurnPrompt('', [], 'kick please');
    expect(messages[0].content).toMatch(/<empty/);
  });

  it('includes Bleep persona + JSON rule unconditionally', () => {
    const { messages } = buildTurnPrompt('', [], 'hi');
    expect(messages[0].content).toMatch(/Bleep/);
    expect(messages[0].content).toMatch(/new_mix_code/);
    expect(messages[0].content).toMatch(/action_label/);
  });
});

describe('buildTurnPrompt - taste exemplars', () => {
  it('omits the exemplar block when none are provided', () => {
    const { messages } = buildTurnPrompt('', [], 'hi');
    expect(messages[0].content).not.toMatch(/previously liked/i);
  });

  it('inlines exemplars into the system message when provided', () => {
    const exemplars = [
      {
        seed_code: 's("bd")',
        variation_code: 's("bd hh sd hh")',
        transformation_label: 'added groove',
      },
      {
        seed_code: 's("c e g")',
        variation_code: 'note("c e g").s("sawtooth").slow(2)',
        transformation_label: 'slow melodic',
      },
    ];
    const { messages } = buildTurnPrompt('', [], 'something', undefined, exemplars);
    expect(messages[0].content).toMatch(/previously liked/i);
    expect(messages[0].content).toContain('added groove');
    expect(messages[0].content).toContain('s("bd hh sd hh")');
    expect(messages[0].content).toContain('slow melodic');
  });
});

describe('buildTurnPrompt - retry hint', () => {
  it('appends the retry hint to the user message when provided', () => {
    const { messages } = buildTurnPrompt('', [], 'hi', 'invalid_strudel: bad token');
    const last = messages[messages.length - 1];
    expect(last.content).toMatch(/Previous attempt was rejected/);
    expect(last.content).toContain('bad token');
  });

  it('leaves the user message untouched when no hint is set', () => {
    const { messages } = buildTurnPrompt('', [], 'hi');
    expect(messages[messages.length - 1].content).toBe('hi');
  });
});
