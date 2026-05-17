// Minimal cache-first / stale-while-revalidate worker.
//
// Goal: after the first load, the user can flip airplane mode and the whole
// remix → like → remix loop still works. Same-origin assets (index.html,
// hashed JS/CSS/wasm chunks) get cached on first hit. Cross-origin fetches
// (huggingface.co for model weights, samples CDN) are left alone —
// transformers.js manages its own HTTP-cache strategy for the model files
// and the browser's disk cache holds the rest.

const CACHE = 'strudel-tutor-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(event.request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })(),
  );
});
