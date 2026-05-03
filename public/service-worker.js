// Service Worker for CarmelMart PWA
// Page caching is disabled — all requests go straight to the network.

self.addEventListener("install", () => {
  self.skipWaiting();
});

// Clear any previously cached pages on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
