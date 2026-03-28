/**
 * Simple in-memory sliding-window rate limiter.
 * Resets on server restart — good enough for QoreID credit protection.
 * For production scale, replace the store with Upstash Redis.
 *
 * Usage:
 *   const { allowed, retryAfter } = rateLimit(userId, { limit: 5, windowMs: 60 * 60 * 1000 });
 *   if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": retryAfter } });
 */

// Map<key, number[]>  (timestamps of each request within the window)
const store = new Map();

/**
 * @param {string} key        - Unique key (e.g. userId or IP)
 * @param {object} options
 * @param {number} options.limit      - Max requests per window
 * @param {number} options.windowMs   - Window size in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
export function rateLimit(key, { limit = 5, windowMs = 60 * 60 * 1000 } = {}) {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    // Oldest request in window — client can retry after it falls off
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    store.set(key, timestamps);
    return { allowed: false, remaining: 0, retryAfter };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  return { allowed: true, remaining: limit - timestamps.length, retryAfter: 0 };
}
