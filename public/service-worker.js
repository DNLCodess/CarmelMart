// CarmelMart Service Worker
// Bump VERSION when you need to flush all caches on next deploy.
const VERSION     = "v4";
const SHELL_CACHE = `cm-shell-${VERSION}`;
const API_CACHE   = `cm-api-${VERSION}`;
const IMG_CACHE   = `cm-img-${VERSION}`;
const ALL_CACHES  = [SHELL_CACHE, API_CACHE, IMG_CACHE];

const OFFLINE_URL = "/offline";

// ── Install ───────────────────────────────────────────────────────────────────
// Pre-cache the offline fallback page so it's always available.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll([OFFLINE_URL]).catch(() => {})
    )
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
// Delete caches from previous versions.
self.addEventListener("activate", (event) => {
  const keep = new Set(ALL_CACHES);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Message ───────────────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests to this origin.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // ── Next.js immutable static assets: cache-first, no expiry ──────────────
  // These filenames include a content hash, so it's safe to cache forever.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // ── Images: cache-first, 7-day soft TTL ──────────────────────────────────
  if (request.destination === "image") {
    event.respondWith(cacheFirstWithTTL(request, IMG_CACHE, 7 * 24 * 60 * 60));
    return;
  }

  // ── Rider API: network-first, serve stale if offline ────────────────────
  // Riders need to see their last-known orders when signal drops.
  if (url.pathname.startsWith("/api/rider/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // ── All other API routes: network-only ───────────────────────────────────
  // Never cache auth, payment, or mutation endpoints.
  if (url.pathname.startsWith("/api/")) return;

  // ── Rider navigation: network-first, offline page as fallback ────────────
  if (request.mode === "navigate" && url.pathname.startsWith("/rider/")) {
    event.respondWith(navigateWithOfflineFallback(request));
    return;
  }

  // Everything else passes through to the network untouched.
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached ?? Response.error();
  }
}

async function cacheFirstWithTTL(request, cacheName, ttlSeconds) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    const dateHeader = cached.headers.get("date");
    if (!dateHeader) return cached;
    const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
    if (age < ttlSeconds) return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached ?? Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? Response.error();
  }
}

async function navigateWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    // Try to return the exact page if it was previously cached
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fall back to the offline page
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
