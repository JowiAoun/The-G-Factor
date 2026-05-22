/**
 * Backend mode + API key configuration for the inference path.
 *
 * Two backends are wired into the `generate()` dispatcher in `./gemma.ts`:
 *   - `'local'`  → Gemma 4 E2B in-browser via `@huggingface/transformers`
 *   - `'remote'` → Gemma 4 31B free tier on OpenRouter
 *
 * State lives in `localStorage` with the project's standard key convention
 * (`strudel-tutor.<domain>.<key>`). The API key has a build-time fallback
 * via `import.meta.env.VITE_OPENROUTER_API_KEY` so a self-deployed demo
 * can ship pre-configured without exposing a key-input modal step.
 *
 * Resolution precedence for the active key:
 *   localStorage (user-pasted) > .env (deploy-bundled) > null (none)
 *
 * A simple subscriber registry lets the App shell re-render when the
 * mode or key changes, without pulling in a context provider.
 */

export type BackendMode = 'local' | 'remote';

export const REMOTE_MODEL_ID = 'google/gemma-4-31b-it:free';

const LS_MODE = 'strudel-tutor.model.backend-mode';
const LS_KEY = 'strudel-tutor.model.openrouter-key';
const LS_CHOSEN = 'strudel-tutor.model.has-chosen';

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

export function getEnvApiKey(): string | undefined {
  const v = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getStoredApiKey(): string | null {
  return safeGetItem(LS_KEY);
}

export function getResolvedApiKey(): string | null {
  return getStoredApiKey() ?? getEnvApiKey() ?? null;
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
