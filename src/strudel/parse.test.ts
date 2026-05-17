import { describe, expect, it } from 'vitest';
import { parse } from './parse';

// Phase 1 verification: parser firewall should ship valid Strudel through and
// reject anything that isn't even syntactically a JS-with-mini-notation
// expression. Only JS-AST-level errors are guaranteed to fail here — semantic
// errors (unknown ops, wrong arg counts) surface later in the Strudel
// evaluator. This test pins the firewall's contract at that boundary.

const VALID: string[] = [
  's("bd*4")',
  's("bd hh sd hh")',
  'note("c e g c5").s("sawtooth").slow(2)',
  's("bd(3,8), hh(5,8)")',
  'note("<c eb g bb>*2").s("sawtooth").slow(4).room(0.5)',
  's("bd*4").every(4, x => x.fast(2))',
  'stack(s("bd*2"), s("~ sd"), s("hh*8"))',
  's("bd ~ sd cp, hh*8")',
  'note("c e g").s("piano").gain(0.7)',
  's("bd*4").jux(rev)',
];

const INVALID: string[] = [
  '',                              // empty
  '   ',                           // whitespace only
  's("bd"',                        // unclosed paren
  's("bd hh)',                     // unclosed string
  's("bd").',                      // trailing dot
  'note((((',                      // broken parens
  's("bd")) )',                    // extra closers
  's("bd").every(4,',              // unterminated args
  '@@@ not js @@@',                // garbage
  'function () { s("bd")',         // incomplete function literal
];

describe('parser firewall — valid', () => {
  it.each(VALID)('accepts %j', async (code) => {
    const r = await parse(code);
    expect(r.valid, `expected valid for: ${code}\nerror: ${(r as { error?: string }).error ?? ''}`).toBe(true);
  });
});

describe('parser firewall — invalid', () => {
  it.each(INVALID)('rejects %j', async (code) => {
    const r = await parse(code);
    expect(r.valid, `expected invalid for: ${JSON.stringify(code)}`).toBe(false);
    if (!r.valid) expect(r.error).toBeTruthy();
  });
});
