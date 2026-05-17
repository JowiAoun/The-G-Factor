import { parse as acornParse } from 'acorn';

export type ParseResult = { valid: true } | { valid: false; error: string };

/**
 * Parser firewall (Layer 3 of the pedagogy). Verifies that an LLM output is
 * at least syntactically a JS expression with Strudel-style mini-notation
 * strings — i.e., the kind of thing the Strudel transpiler will then be
 * willing to look at.
 *
 * We use `acorn` directly here, which is exactly the first thing
 * `@strudel/transpiler` does internally. This catches the overwhelming
 * majority of LLM failure modes: unbalanced parens, broken string literals,
 * trailing dots, stray syntax. Mini-notation-level errors (e.g. `bd(3,` is
 * unbalanced inside a string) sail past acorn and surface later when the
 * Strudel evaluator runs the pattern — those are caught by the engine's
 * `try/catch` around `evaluate()` and reported via `getLastError()`.
 *
 * Two-layer ground truth keeps this module pure and easily testable in Node
 * (acorn has no native deps), while the engine carries the mini-notation
 * verdict in the live browser environment.
 */
export async function parse(code: string): Promise<ParseResult> {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, error: 'empty code' };
  try {
    acornParse(trimmed, {
      ecmaVersion: 2022,
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}
