/**
 * Diagnostics for "is the Gemma model actually cached on this device?".
 *
 * transformers.js writes each ONNX/tokenizer/config file into the browser's
 * Cache Storage API under a `transformers-cache` (or similar) bucket. When a
 * model file is requested again, the library matches against this cache and
 * serves the bytes without going to the network — that's why a refresh after
 * a complete download should be instant.
 *
 * If the cache *isn't* working (Devtools "Disable cache" checked, incognito,
 * a service-worker conflict, browser eviction), the UI looks identical from
 * the user's side: another full ~1.5 GB download. This module surfaces the
 * truth so the Load panel can show "🧊 1.2 GB cached" before the click and
 * the user can spot a misconfiguration immediately.
 */

export type CacheInfo = {
  /** Best-effort sum of cached model-file bytes (read from content-length when available). */
  modelBytes: number;
  /** Count of entries in matching cache buckets. */
  modelEntryCount: number;
  /** Names of cache buckets that looked transformers/HF-related. */
  cacheNames: string[];
  /** Total origin storage usage (Cache Storage + IndexedDB + …). Null if unavailable. */
  totalOriginBytes: number | null;
  /** Storage quota the origin is allowed to use. Null if unavailable. */
  quotaBytes: number | null;
};

const MATCH_TOKENS = [
  'transformers',
  'huggingface',
  'onnx-community',
  'hf-internal',
];

function matchesModelCache(name: string): boolean {
  const lower = name.toLowerCase();
  return MATCH_TOKENS.some((t) => lower.includes(t));
}

export async function getCacheInfo(): Promise<CacheInfo> {
  let totalOriginBytes: number | null = null;
  let quotaBytes: number | null = null;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      totalOriginBytes = est.usage ?? null;
      quotaBytes = est.quota ?? null;
    } catch {
      // ignore — some browsers gate this behind permissions
    }
  }

  let modelBytes = 0;
  let modelEntryCount = 0;
  const cacheNames: string[] = [];

  if (typeof caches !== 'undefined') {
    try {
      const allNames = await caches.keys();
      for (const name of allNames) {
        if (!matchesModelCache(name)) continue;
        cacheNames.push(name);
        try {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          for (const req of requests) {
            modelEntryCount++;
            try {
              const res = await cache.match(req);
              if (!res) continue;
              const len = res.headers.get('content-length');
              if (len) {
                const n = Number(len);
                if (!Number.isNaN(n)) modelBytes += n;
              }
              // Skip blob fallback — reading 1.5 GB of cached blobs into
              // memory just to measure size would be a disaster.
            } catch {
              // ignore single-entry errors
            }
          }
        } catch {
          // ignore single-bucket errors
        }
      }
    } catch {
      // ignore caches.keys() failure
    }
  }

  return { modelBytes, modelEntryCount, cacheNames, totalOriginBytes, quotaBytes };
}

export function formatBytes(n: number): string {
  if (n === 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Are we in a context where Cache Storage even works? Returns a human-
 * readable reason when caching can't be expected (incognito, missing
 * `caches` global, http context, etc.) so the UI can warn early.
 */
export function diagnoseCachingContext(): string | null {
  if (typeof caches === 'undefined') return 'Cache Storage API unavailable';
  if (typeof navigator !== 'undefined' && !navigator.storage) {
    return 'navigator.storage unavailable';
  }
  return null;
}
