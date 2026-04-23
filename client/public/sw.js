/**
 * LCARS Mission Control — Service Worker
 * 
 * Strategy:
 *   - HTML documents (/):          network-first → stale HTML was causing white screens
 *   - Vite hashed assets (/assets/): cache-first → content-hashed, safe to cache forever
 *   - API + SSE:                   network-only (passthrough)
 *   - Everything else:             network-first with cache fallback
 *
 * Bump CACHE_NAME whenever you need to force a full cache clear on all clients.
 */

const CACHE_NAME = 'lcars-mc-v3';
const IMMUTABLE_ASSETS = '/assets/'; // Vite content-hashes these — safe to cache forever

self.addEventListener('install', (event) => {
  // Skip waiting immediately — don't let old SW linger
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Nuke all old caches (catches v1, v2, any prior version)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API and SSE — always network, no caching
  if (url.pathname.startsWith('/api') || url.pathname === '/events') {
    return; // fall through to network
  }

  // Vite hashed assets (/assets/*.js, /assets/*.css) — cache-first (they're immutable)
  if (url.pathname.startsWith(IMMUTABLE_ASSETS)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML and everything else — network-first, cache as fallback only
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline fallback
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache if we have it
        return caches.match(event.request);
      })
  );
});
