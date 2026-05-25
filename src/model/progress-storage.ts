/**
 * Persistent hint for "how far the last model-load attempt got".
 *
 * The actual model weights are cached per-file by `transformers.js` via the
 * browser's Cache Storage API - any ONNX shard that fully downloaded before
 * a refresh stays in cache, and the next call to `from_pretrained` reads it
 * directly with no network. What this module persists is a small UX hint
 * (last progress %, model id, timestamp) so the Load button can say
 * "Resume - last attempt reached 62%" instead of looking like a fresh start.
 *
 * Stored in `localStorage` under a single key. Cleared when status hits
 * `ready` (full load completed).
 */

const KEY = 'strudel-tutor.model-load.lastProgress';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SavedProgress = {
  pct: number;
  ts: number;
  modelId: string;
};

export function loadSavedProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (
      typeof parsed.pct !== 'number' ||
      parsed.pct <= 0 ||
      parsed.pct >= 100 ||
      typeof parsed.ts !== 'number' ||
      typeof parsed.modelId !== 'string'
    ) {
      return null;
    }
    // Drop very old hints - if the user hasn't loaded the model in a week,
    // odds are the browser quota has evicted the partial cache anyway.
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      clearSavedProgress();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveProgress(pct: number, modelId: string): void {
  if (pct <= 0 || pct >= 100) return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ pct, ts: Date.now(), modelId } satisfies SavedProgress),
    );
  } catch {
    // Quota or storage-disabled - best-effort, ignore.
  }
}

export function clearSavedProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
