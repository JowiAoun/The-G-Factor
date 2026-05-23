/**
 * Backend mode + API key configuration for the inference path.
 *
 * Two backends are wired into the `generate()` dispatcher in `./gemma.ts`:
 *   - `'local'`  → Gemma 4 E2B in-browser via `@huggingface/transformers`
 *   - `'remote'` → Gemma 4 31B free tier on OpenRouter
 *
 * State lives in `localStorage` with the project's standard key convention
 * (`strudel-tutor.<domain>.<key>`). The OpenRouter API key is supplied
 * exclusively at runtime by the user via the chooser modal — there is no
 * build-time fallback, so the key never lands in the deployed bundle.
 *
 * A simple subscriber registry lets the App shell re-render when the
 * mode or key changes, without pulling in a context provider.
 */

export type BackendMode = 'local' | 'remote';

export const REMOTE_MODEL_ID = 'google/gemma-4-31b-it:free';

const LS_MODE = 'strudel-tutor.model.backend-mode';
const LS_KEY = 'strudel-tutor.model.openrouter-key';
const LS_CHOSEN = 'strudel-tutor.model.has-chosen';
const LS_THROTTLE = 'strudel-tutor.model.throttle-ms';

// Min delay between sequential contestant generations, applied by
// `remixSeed` in `src/remix/orchestrate.ts`. The default is tuned to keep
// the free OpenRouter tier under its per-minute cap on a 4-bracket even
// when each contestant retries once. Local mode users can drop it to 0
// via Settings since WebGPU already serialises on the adapter.
const THROTTLE_DEFAULT_MS = 1500;
const THROTTLE_MAX_MS = 30_000;

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota / etc. — swallow */
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* swallow */
  }
}

export function getStoredApiKey(): string | null {
  return safeGetItem(LS_KEY);
}

export function getMode(): BackendMode {
  return safeGetItem(LS_MODE) === 'remote' ? 'remote' : 'local';
}

export function setMode(mode: BackendMode): void {
  safeSetItem(LS_MODE, mode);
  safeSetItem(LS_CHOSEN, '1');
  emit();
}

export function setStoredApiKey(key: string | null): void {
  if (key && key.trim().length > 0) {
    safeSetItem(LS_KEY, key.trim());
  } else {
    safeRemoveItem(LS_KEY);
  }
  emit();
}

export function hasMadeBackendChoice(): boolean {
  return safeGetItem(LS_CHOSEN) === '1';
}

export function getThrottleMs(): number {
  const raw = safeGetItem(LS_THROTTLE);
  if (raw === null) return THROTTLE_DEFAULT_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return THROTTLE_DEFAULT_MS;
  return Math.min(n, THROTTLE_MAX_MS);
}

export function setThrottleMs(ms: number): void {
  const clamped = Math.max(0, Math.min(Math.round(ms), THROTTLE_MAX_MS));
  safeSetItem(LS_THROTTLE, String(clamped));
  emit();
}

export const THROTTLE_DEFAULTS = {
  default: THROTTLE_DEFAULT_MS,
  max: THROTTLE_MAX_MS,
} as const;

/**
 * Lightweight client-side sanity check. OpenRouter keys start with
 * `sk-or-` followed by a version segment and a long opaque body. The
 * regex stays lenient — runtime 401 catches any deeper mismatch.
 */
export function looksLikeApiKey(s: string): boolean {
  return /^sk-or-[A-Za-z0-9_-]{10,}$/.test(s.trim());
}

const subs = new Set<() => void>();

function emit(): void {
  for (const cb of subs) {
    try {
      cb();
    } catch {
      /* one bad subscriber shouldn't take down the rest */
    }
  }
}

export function subscribeBackendChange(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}
