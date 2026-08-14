// Minimal service worker — installable PWA, but never serves stale content.
// Bump SW_VERSION to force every client to update + reload on next visit.
const SW_VERSION = '__BUILD_ID__';

self.addEventListener('install', (event) => {
  // Activate the new SW immediately, replacing any older one.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Nuke any caches left behind by previous SW versions.
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
    // Tell every open page to reload so they pick up the new build.
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // For HTML navigations, always go to the network and bypass HTTP cache.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => fetch(req)));
  }
  // Everything else (API calls, images, scripts, etc.): don't intercept at
  // all — this SW does no caching, so re-fetching through respondWith()
  // added no benefit and was a pure failure surface. Requests that go
  // through it can throw "Failed to fetch" (seen for Supabase API calls,
  // breaking pages that depend on their result), where the same request
  // succeeds fine when left to the browser's normal network stack.
});
