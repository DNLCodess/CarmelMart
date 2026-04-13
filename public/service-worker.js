// Service Worker for CarmelMart PWA
const CACHE_NAME = "carmelmart-v1";
const OFFLINE_URL = "/offline";

// Shell pages to pre-cache on install
const STATIC_CACHE_URLS = [
  "/",
  "/offline",
  "/shop",
];

// Install — pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(STATIC_CACHE_URLS);
      } catch (error) {
        console.error("[SW] Pre-cache failed:", error);
      }
    })()
  );
  self.skipWaiting();
});

// Activate — remove stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      );
    })()
  );
  self.clients.claim();
});

// Fetch — network-first for dynamic routes, cache-first for shell pages
self.addEventListener("fetch", (event) => {
  // Only handle same-origin GET requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Always go straight to network for these — never cache
  const skipCache =
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/checkout") ||
    url.pathname.startsWith("/cart") ||
    url.pathname.startsWith("/vendor") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/orders") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("supabase");

  if (skipCache) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static shell pages
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response && response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        // Network failed — serve offline page
        const cache = await caches.open(CACHE_NAME);
        const offlinePage = await cache.match(OFFLINE_URL);
        return offlinePage || new Response("You are offline", { status: 503 });
      }
    })()
  );
});

// Handle messages from the client
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(caches.delete(CACHE_NAME));
  }
});
