// Promise-based Turnstile token helper.
// Returns null when the site key isn't configured (local dev without key)
// so callers can proceed without a token. Rejects on captcha error so the
// caller can surface a meaningful message.

const _widgetIds = new Map();

export function getTurnstileToken(containerId) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return new Promise((resolve, reject) => {
    if (!siteKey || typeof window?.turnstile === "undefined") {
      resolve(null);
      return;
    }

    // Remove stale widget before re-rendering (one token per call)
    if (_widgetIds.has(containerId)) {
      try { window.turnstile.remove(_widgetIds.get(containerId)); } catch {}
      _widgetIds.delete(containerId);
    }

    const widgetId = window.turnstile.render(`#${containerId}`, {
      sitekey: siteKey,
      size: "invisible",
      callback: (token) => resolve(token),
      "error-callback": (code) => reject(new Error(`Security check failed (${code}). Please try again.`)),
      "expired-callback": () => reject(new Error("Security token expired. Please try again.")),
    });

    _widgetIds.set(containerId, widgetId);
    // reset() clears any in-progress execution state before starting fresh —
    // without this, re-triggering on the same container throws "already executing"
    try { window.turnstile.reset(widgetId); } catch {}
    window.turnstile.execute(widgetId);
  });
}
