/**
 * LCARS Mission Control — Service Worker
 * Basic PWA registration. Enables "Add to Home Screen" on iPad.
 * Phase 2 will add offline caching strategy.
 */

const CACHE_NAME = 'lcars-mc-v1';

// Install: pre-cache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/manifest.json']).catch(() => {
        // Non-fatal: cache what we can
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always network-first for API and SSE
  if (url.pathname.startsWith('/api') || url.pathname === '/events') {
    return; // Let it fall through to network
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});
