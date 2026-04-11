/**
 * lib/rateLimit.js — Sliding-window in-memory rate limiter
 *
 * Suitable for single-process Node.js (including Next.js dev server).
 * In a distributed/serverless deployment (multiple instances), replace
 * the Map store with Upstash Redis or a similar shared store.
 *
 * Usage:
 *   import { rateLimit } from "@/lib/rateLimit";
 *
 *   const result = rateLimit(`withdraw:${userId}`, { limit: 3, windowMs: 60 * 60 * 1000 });
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
 *   }
 */

/** @type {Map<string, { count: number; resetAt: number }>} */
const store = new Map();

/**
 * Check whether a keyed action is within its allowed rate.
 *
 * @param {string} key       - Unique key, e.g. `"withdraw:${userId}"`
 * @param {{ limit: number; windowMs: number }} options
 * @returns {{ allowed: boolean; remaining: number; resetAt: number }}
 */
export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    // First request in this window (or window expired)
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Returns the Retry-After value in seconds for a blocked request.
 * @param {number} resetAt - Unix ms timestamp when the window resets
 */
export function retryAfterSeconds(resetAt) {
  return Math.ceil((resetAt - Date.now()) / 1000);
}

// ── Background cleanup ────────────────────────────────────────────────────────
// Purge expired windows every 5 minutes so the Map doesn't grow unbounded
// in long-running processes.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}
