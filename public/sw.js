// Kill-switch service worker.
//
// The previous version was cache-first on same-origin GETs, which made
// any user who had ever loaded a prod build on this origin (e.g. via
// `pnpm preview` on the dev port) end up with the SW intercepting all
// subsequent dev-server requests and serving stale prod HTML/JS — blank
// page until they manually unregistered via DevTools.
//
// This replacement does nothing on `fetch` (so the browser handles every
// request normally) and unregisters itself + purges every cache on
// activation, so legacy clients heal themselves on the first reload
// after this script is fetched. With registration removed from
// main.tsx, no new SW takes its place.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url).catch(() => {});
      }
    })(),
  );
});
