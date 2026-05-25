/**
 * Backend mode + API key configuration for the inference path.
 *
 * Two backends are wired into the `generate()` dispatcher in `./gemma.ts`:
 *   - `'local'`  → Gemma 4 E2B in-browser via `@huggingface/transformers`
 *   - `'remote'` → Gemma 4 31B free tier on OpenRouter
 *
 * State lives in `localStorage` with the project's standard key convention
 * (`strudel-tutor.<domain>.<key>`). The OpenRouter API key is supplied
 * exclusively at runtime by the user via the chooser modal - there is no
 * build-time fallback, so the key never lands in the deployed bundle.
 *
 * A simple subscriber registry lets the App shell re-render when the
 * mode or key changes, without pulling in a context provider.
 */

export type BackendMode = 'local' | 'remote';

export const REMOTE_MODEL_ID = 'google/gemma-4-31b-it';

const LS_MODE = 'strudel-tutor.model.backend-mode';
const LS_KEY = 'strudel-tutor.model.openrouter-key';
const LS_CHOSEN = 'strudel-tutor.model.has-chosen';
const LS_THROTTLE = 'strudel-tutor.model.throttle-ms';

// Min delay between sequential contestant generations, applied by
// `remixSeed` in `src/remix/orchestrate.ts`. The default is per backend:
//   - remote (OpenRouter): 0ms, so launches fan out at full speed. This
//     assumes a paid / higher-limit key; on the free tier a non-zero
//     stagger is what keeps requests under the per-minute cap (see the
//     429 note in orchestrate.ts), so raise it via Settings if needed.
//   - local: 1500ms, purely to pace the on-stage show. WebGPU already
//     serialises on the adapter, so this is about rhythm, not throughput.
// A user override set in Settings is shared across both modes.
const THROTTLE_REMOTE_DEFAULT_MS = 0;
const THROTTLE_LOCAL_DEFAULT_MS = 1500;
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
    /* private mode / quota / etc. - swallow */
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

/** Per-backend default delay, used when the user has set no override. */
export function defaultThrottleMs(mode: BackendMode): number {
  return mode === 'remote'
    ? THROTTLE_REMOTE_DEFAULT_MS
    : THROTTLE_LOCAL_DEFAULT_MS;
}

export function getThrottleMs(mode: BackendMode = getMode()): number {
  const fallback = defaultThrottleMs(mode);
  const raw = safeGetItem(LS_THROTTLE);
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, THROTTLE_MAX_MS);
}

export function setThrottleMs(ms: number): void {
  const clamped = Math.max(0, Math.min(Math.round(ms), THROTTLE_MAX_MS));
  safeSetItem(LS_THROTTLE, String(clamped));
  emit();
}

export const THROTTLE_DEFAULTS = {
  local: THROTTLE_LOCAL_DEFAULT_MS,
  remote: THROTTLE_REMOTE_DEFAULT_MS,
  max: THROTTLE_MAX_MS,
} as const;

/**
 * Lightweight client-side sanity check. OpenRouter keys start with
 * `sk-or-` followed by a version segment and a long opaque body. The
 * regex stays lenient - runtime 401 catches any deeper mismatch.
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
