import { describe, expect, it } from 'vitest';
import { parse, BANNED_IDENTIFIERS } from './parse';
import { VARIATION_AXES } from '../remix/axes';

// Phase 1 verification: parser firewall should ship valid Strudel through and
// reject anything that isn't even syntactically a JS-with-mini-notation
// expression. Only JS-AST-level errors are guaranteed to fail here - semantic
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

const INVALID_SYNTAX: string[] = [
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

describe('parser firewall - valid', () => {
  it.each(VALID)('accepts %j', async (code) => {
    const r = await parse(code);
    expect(
      r.valid,
      `expected valid for: ${code}\nerror: ${(r as { error?: string }).error ?? ''}`,
    ).toBe(true);
  });
});

describe('parser firewall - invalid syntax', () => {
  it.each(INVALID_SYNTAX)('rejects %j with reason=syntax', async (code) => {
    const r = await parse(code);
    expect(r.valid, `expected invalid for: ${JSON.stringify(code)}`).toBe(false);
    if (!r.valid) {
      expect(r.reason).toBe('syntax');
      expect(r.error).toBeTruthy();
    }
  });
});

// Deny-list: code that parses cleanly as JS but references dangerous globals
// or sandbox-escape primitives. The walker should refuse before Strudel ever
// sees it. These are the patterns a prompt-injection or hostile mix would
// realistically try; the goal is to make exfiltration meaningfully harder
// than "Gemma emits one line of fetch()".
const UNSAFE: Array<[string, RegExp]> = [
  // Bare identifier references to dangerous globals.
  ['fetch("https://evil.example")', /disallowed reference: fetch/],
  ['XMLHttpRequest', /disallowed reference: XMLHttpRequest/],
  ['eval("alert(1)")', /disallowed reference: eval/],
  ['new Function("alert(1)")()', /disallowed reference: Function/],
  ['setTimeout(() => 1, 0)', /disallowed reference: setTimeout/],
  ['navigator.userAgent', /disallowed reference: navigator/],

  // Member access (dot notation) to banned properties or globals.
  ['window.fetch("x")', /disallowed reference: window|disallowed property access/],
  ['globalThis.localStorage', /disallowed reference: globalThis|disallowed property access/],
  ['document.cookie', /disallowed reference: document|disallowed property access/],
  ['something.innerHTML = "x"', /disallowed property access: \.innerHTML/],
  ['(0).constructor', /disallowed property access: \.constructor/],
  ['(0).constructor.constructor("alert(1)")()', /disallowed property access: \.constructor/],
  ['[].constructor', /disallowed property access: \.constructor/],
  ['obj.__proto__', /disallowed property access: \.__proto__/],

  // Bracket notation with a string literal key.
  ['({})["constructor"]', /disallowed property access: \["constructor"\]/],
  ['x["fetch"]("https://evil")', /disallowed property access: \["fetch"\]/],

  // Dynamic import. (`import.meta` would only parse in module mode and is
  // a syntax error here - kept in the walker as defense if `sourceType`
  // ever changes, but not testable today.)
  ['import("./evil.js")', /disallowed dynamic import/],

  // Storage / sensitive primitives.
  ['localStorage.getItem("k")', /disallowed reference: localStorage|disallowed property access/],
  ['indexedDB.open("foo")', /disallowed reference: indexedDB/],
  ['crypto.subtle', /disallowed reference: crypto/],
];

describe('parser firewall - unsafe patterns', () => {
  it.each(UNSAFE)('rejects %j as unsafe', async (code, expectedError) => {
    const r = await parse(code);
    expect(r.valid, `expected unsafe for: ${code}`).toBe(false);
    if (!r.valid) {
      expect(r.reason, `reason should be 'unsafe' for: ${code}`).toBe('unsafe');
      expect(r.error).toMatch(expectedError);
    }
  });

  it('exports the BANNED_IDENTIFIERS set with at least the core globals', () => {
    for (const id of ['fetch', 'localStorage', 'eval', 'Function', 'document', 'window']) {
      expect(BANNED_IDENTIFIERS.has(id), `${id} should be banned`).toBe(true);
    }
  });
});

// Regression guard: the deny-list must not block any axis exemplar shipped to
// the Talent Show. If a future exemplar names a banned identifier, this test
// catches it before users do.
describe('parser firewall - talent show axis exemplars stay valid', () => {
  it.each(VARIATION_AXES)('axis $id exemplar passes the firewall', async (axis) => {
    const r = await parse(axis.exemplar);
    const detail = r.valid
      ? ''
      : `\nreason: ${r.reason}\nerror: ${r.error}`;
    expect(r.valid, `exemplar for ${axis.id} should be valid${detail}`).toBe(true);
  });
});
