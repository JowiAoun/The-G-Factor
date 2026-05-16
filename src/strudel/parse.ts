export type ParseResult = { valid: true } | { valid: false; error: string };

let transpilerFn: ((code: string, opts?: unknown) => unknown) | null = null;

async function loadTranspiler(): Promise<typeof transpilerFn> {
  if (transpilerFn) return transpilerFn;
  try {
    const mod = (await import('@strudel/transpiler')) as unknown as {
      transpiler?: (code: string, opts?: unknown) => unknown;
    };
    if (typeof mod.transpiler === 'function') {
      transpilerFn = mod.transpiler;
      return transpilerFn;
    }
  } catch {
    // fall through
  }
  try {
    const mod = (await import('@strudel/core')) as unknown as {
      transpiler?: (code: string, opts?: unknown) => unknown;
    };
    if (typeof mod.transpiler === 'function') {
      transpilerFn = mod.transpiler;
      return transpilerFn;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Parser firewall. Returns valid=false if the snippet won't even transpile.
 *
 * Caveat: a "valid" verdict here only means the code parses as JS-with-Strudel-
 * mini-notation; semantic errors (unknown operators, malformed chains) surface
 * later when the Strudel evaluator actually runs the pattern. Those failures
 * are caught by the engine's try/catch and surfaced via getLastError().
 */
export async function parse(code: string): Promise<ParseResult> {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, error: 'empty code' };

  const fn = await loadTranspiler();
  if (!fn) {
    return { valid: false, error: 'strudel transpiler not available' };
  }
  try {
    fn(trimmed, { wrapAsync: false, addReturn: false, simpleLocs: true });
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}
