import { parse as acornParse } from 'acorn';
import { simple as walk } from 'acorn-walk';

export type ParseResult =
  | { valid: true }
  | { valid: false; reason: 'syntax' | 'unsafe'; error: string };

/**
 * Identifiers that, when referenced bare in a Strudel snippet, signal an
 * attempt to reach beyond the Strudel sandbox - network, storage, DOM,
 * workers, dynamic eval, timing primitives. Legitimate Strudel idioms
 * never touch any of these.
 */
export const BANNED_IDENTIFIERS: ReadonlySet<string> = new Set([
  // network
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'BroadcastChannel',
  'navigator',
  // window / document
  'document',
  'window',
  'globalThis',
  'self',
  'top',
  'parent',
  'frames',
  'opener',
  'location',
  'history',
  'screen',
  // storage
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'cookieStore',
  'Storage',
  // workers / IPC
  'Worker',
  'SharedWorker',
  'ServiceWorker',
  'postMessage',
  'importScripts',
  'MessageChannel',
  'Notification',
  'Atomics',
  'SharedArrayBuffer',
  // dynamic eval
  'eval',
  'Function',
  // timing - user Strudel idioms don't need these
  'setTimeout',
  'setInterval',
  'setImmediate',
  'requestAnimationFrame',
  'queueMicrotask',
  // sensitive
  'crypto',
  'clipboard',
]);

/**
 * Property names that are dangerous to read off any object - primarily
 * sandbox-escape routes (`(0).constructor.constructor('evil')()`) and
 * DOM-injection sinks. Augmented with every banned identifier so things
 * like `window.fetch` or `({})['localStorage']` are caught too.
 */
const SANDBOX_ESCAPE_MEMBERS: ReadonlySet<string> = new Set([
  'constructor',
  '__proto__',
  'prototype',
  'cookie',
  'innerHTML',
  'outerHTML',
]);

export const BANNED_MEMBER_NAMES: ReadonlySet<string> = new Set([
  ...SANDBOX_ESCAPE_MEMBERS,
  ...BANNED_IDENTIFIERS,
]);

/**
 * Parser firewall (Layer 3 of the pedagogy). Two-stage:
 *
 *   1. `acorn.parse` rejects code that isn't even syntactically a JS
 *      expression with Strudel-style mini-notation strings. This catches
 *      the overwhelming majority of LLM failure modes (unbalanced parens,
 *      broken string literals, trailing dots, stray syntax).
 *
 *   2. A single-pass AST walker rejects code that *would* parse but
 *      references dangerous globals (fetch, localStorage, eval), reads
 *      sandbox-escape properties (.constructor, .__proto__), or uses
 *      `import()` / `import.meta`. This is a deny-list defense - not a
 *      full sandbox (iframe with the `sandbox` attribute would be that)
 *      but a meaningful hurdle against prompt-injection exfiltration and
 *      casually hostile copy-pasted mixes.
 *
 * Both checks run before any user-typed or LLM-emitted code reaches the
 * Strudel evaluator: the engine's `play()` calls this first, and the
 * remix / studio retry loops drop attempts that fail here.
 */
export async function parse(code: string): Promise<ParseResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { valid: false, reason: 'syntax', error: 'empty code' };
  }

  let ast: ReturnType<typeof acornParse>;
  try {
    ast = acornParse(trimmed, {
      ecmaVersion: 2022,
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
  } catch (err) {
    return {
      valid: false,
      reason: 'syntax',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let unsafe: string | null = null;
  const flag = (msg: string): void => {
    if (unsafe === null) unsafe = msg;
  };

  // acorn-walk's typings are loose around Node shapes; cast through any
  // at the visitor boundary so callers don't need to depend on @types/estree.
  walk(ast as never, {
    Identifier(node: { name?: string }) {
      if (typeof node.name === 'string' && BANNED_IDENTIFIERS.has(node.name)) {
        flag(`disallowed reference: ${node.name}`);
      }
    },
    MemberExpression(node: {
      computed?: boolean;
      property?: { type?: string; name?: string; value?: unknown };
    }) {
      const prop = node.property;
      if (!prop) return;
      if (!node.computed && prop.type === 'Identifier' && typeof prop.name === 'string') {
        if (BANNED_MEMBER_NAMES.has(prop.name)) {
          flag(`disallowed property access: .${prop.name}`);
        }
      } else if (
        node.computed &&
        prop.type === 'Literal' &&
        typeof prop.value === 'string'
      ) {
        if (BANNED_MEMBER_NAMES.has(prop.value)) {
          flag(`disallowed property access: [${JSON.stringify(prop.value)}]`);
        }
      }
    },
    ImportExpression() {
      flag('disallowed dynamic import()');
    },
    MetaProperty(node: { meta?: { name?: string } }) {
      if (node.meta?.name === 'import') {
        flag('disallowed import.meta reference');
      }
    },
  });

  if (unsafe !== null) {
    return { valid: false, reason: 'unsafe', error: unsafe };
  }
  return { valid: true };
}
