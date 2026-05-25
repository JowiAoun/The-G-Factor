// Service worker - offline support without the cache-first trap.
//
// Strategy:
//   - HTML / navigation requests: network-first. If the network is
//     reachable we always serve fresh, then update the cache as a side
//     effect. Only when the network actually fails do we fall back to
//     cache. This is what makes the SW resilient to "production bundle
//     cached on the dev port" scenarios - a fresh dev/prod server will
//     always win over stale cache.
//   - Hashed assets under /assets/: cache-first. Content-hashed file
//     names are immutable, so a cache hit is always correct and avoids
//     re-downloading the JS/CSS/wasm chunks on every load.
//   - Everything else (sw.js itself, /favicon, /sw.js?v=…): passes
//     through to the browser default. We don't want to cache the SW
//     script - the browser already manages its update lifecycle.
//
// The cache name carries a build-time-injected version string
// (replaced by the `swVersion` Vite plugin in vite.config.ts). Each
// production build gets a fresh cache name; the activate handler
// deletes any cache that doesn't match, so old deploys' bytes are
// purged the first time the new SW activates.

const VERSION = '__SW_VERSION__';
const HTML_CACHE = `strudel-tutor-html-${VERSION}`;
const ASSET_CACHE = `strudel-tutor-assets-${VERSION}`;
const KEEP = new Set([HTML_CACHE, ASSET_CACHE]);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  const isNavigation =
    req.mode === 'navigate' || req.destination === 'document';

  if (isNavigation) {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }

  // The favicon/wordmark lives at a stable URL (/assets/images/logo.png), not
  // a content-hashed one, so cache-first would pin a stale copy. Let it fall
  // through to the browser default, which honors the revalidating
  // Cache-Control header from vercel.json.
  if (url.pathname === '/assets/images/logo.png') return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
});

async function networkFirst(req, cacheName) {
  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(req);
    if (cached) return cached;
    const root = await cache.match('/');
    if (root) return root;
    throw new Error('offline and no cached fallback');
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
  return fresh;
}
