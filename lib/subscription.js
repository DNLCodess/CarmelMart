// lib/subscription.js
// Single source of truth for vendor subscription plan metadata, feature gates,
// and commission rates. Safe to import on both server and client.
//
// Prices are NOT stored here — they live in platform_settings so the admin
// can update them without a deployment. DEFAULT_PRICES is a fallback used
// when the DB read fails.

export const DEFAULT_PRICES = {
  premium: { monthly: 10000, annual: null },
  vip:     { monthly: 25000, annual: null },
};

const MB = 1024 * 1024;
const GB = 1024 * MB;

// MIME types grouped by media category for tier-based upload gating
export const UPLOAD_TYPE_GROUPS = {
  documents: [
    "application/pdf",
    "application/epub+zip",
    "application/x-mobipocket-ebook",
    "application/zip",
  ],
  audio: [
    "audio/mpeg",       // MP3
    "audio/mp4",        // M4A / AAC
    "audio/ogg",        // OGG
    "audio/wav",        // WAV
  ],
  video: [
    "video/mp4",                 // MP4
    "video/x-matroska",          // MKV
    "application/octet-stream",  // generic binary (e.g. course bundles)
  ],
};

export const PLANS = {
  free: {
    tier: "free",
    name: "Basic",
    tagline: "Start selling for free",
    product_limit: 20,                          // max total products (physical + digital); null = unlimited
    digital_product_limit: 5,                   // max digital products; null = unlimited
    storage_limit_bytes: 512 * MB,              // 512 MB total digital storage
    max_file_size_bytes: 50 * MB,               // 50 MB per file
    allowed_upload_types: UPLOAD_TYPE_GROUPS.documents,  // documents & ebooks only
    commission_rate: 6.5,
    features: [
      "Free registration",
      "Vendor profile & shop page",
      "Up to 20 products (5 digital)",
      "Digital: documents & ebooks only (PDF, EPUB, MOBI, ZIP)",
      "Digital: 50 MB per file, 512 MB total storage",
      "Basic order management",
      "Promotions & deals (sale prices)",
      "Standard search visibility",
      "In-app wallet & payouts",
      "Basic support",
    ],
    color: "gray",
  },
  premium: {
    tier: "premium",
    name: "Premium",
    tagline: "Grow your business faster",
    product_limit: 50,
    digital_product_limit: 20,
    storage_limit_bytes: 5 * GB,                // 5 GB total
    max_file_size_bytes: 200 * MB,              // 200 MB per file
    allowed_upload_types: [
      ...UPLOAD_TYPE_GROUPS.documents,
      ...UPLOAD_TYPE_GROUPS.audio,
    ],
    commission_rate: 4.5,
    features: [
      "Up to 50 products (20 digital)",
      "Digital: documents, ebooks & audio (MP3, WAV, OGG, M4A)",
      "Digital: 200 MB per file, 5 GB total storage",
      "Better search ranking",
      "Promotions & deals (sale prices)",
      "Featured vendor badge",
      "Reduced commission (4.5%)",
      "Sales analytics dashboard",
      "Priority support",
    ],
    color: "blue",
  },
  vip: {
    tier: "vip",
    name: "VIP",
    tagline: "Maximum reach, minimum commission",
    product_limit: null,
    digital_product_limit: null,
    storage_limit_bytes: null,                  // unlimited
    max_file_size_bytes: 500 * MB,              // 500 MB per file
    allowed_upload_types: [
      ...UPLOAD_TYPE_GROUPS.documents,
      ...UPLOAD_TYPE_GROUPS.audio,
      ...UPLOAD_TYPE_GROUPS.video,
    ],
    commission_rate: 3.5,
    features: [
      "Unlimited products & digital products",
      "Digital: all formats including video (MP4, MKV) & course bundles",
      "Digital: 500 MB per file, unlimited total storage",
      "Homepage & top search placement",
      "Dedicated account manager",
      "Lowest commission (3.5%)",
      "Exclusive marketing campaigns",
      "Sponsored listings",
      "Priority withdrawal support",
    ],
    color: "gold",
  },
};

/** Ordered plan list for UI rendering (Free → Premium → VIP). */
export const PLAN_ORDER = ["free", "premium", "vip"];

/**
 * Return a plan config by tier string.
 * Falls back to free if an unknown tier is given.
 */
export function getPlan(tier) {
  return PLANS[tier] ?? PLANS.free;
}

/**
 * Compute the subscription expiry Date from a start date.
 * @param {'monthly'|'annual'} billingCycle
 * @param {Date|string} from  Defaults to now.
 * @returns {Date}
 */
export function computeExpiryDate(billingCycle, from = new Date()) {
  const start = new Date(from);
  if (billingCycle === "annual") {
    start.setFullYear(start.getFullYear() + 1);
  } else {
    start.setMonth(start.getMonth() + 1);
  }
  return start;
}

/**
 * Check whether a vendor can add another product given their tier and current
 * product count (non-rejected products only).
 */
export function checkProductLimit(tier, currentCount) {
  const { product_limit } = getPlan(tier);
  return {
    allowed: product_limit === null || currentCount < product_limit,
    limit: product_limit,
    current: currentCount,
  };
}

/**
 * Check whether a vendor can add another digital product given their tier
 * and current digital product count.
 */
export function checkDigitalProductLimit(tier, currentCount) {
  const { digital_product_limit } = getPlan(tier);
  return {
    allowed: digital_product_limit === null || currentCount < digital_product_limit,
    limit: digital_product_limit,
    current: currentCount,
  };
}

/**
 * Check whether a file type is permitted for upload on a given tier.
 * Returns { allowed, allowedTypes }.
 */
export function checkUploadType(tier, mimeType) {
  const { allowed_upload_types } = getPlan(tier);
  return {
    allowed: allowed_upload_types.includes(mimeType),
    allowedTypes: allowed_upload_types,
  };
}

/**
 * Check whether a file size is within the per-file limit for a given tier.
 * Returns { allowed, limit }.
 */
export function checkFileSize(tier, fileSizeBytes) {
  const { max_file_size_bytes: limit } = getPlan(tier);
  return {
    allowed: fileSizeBytes <= limit,
    limit,
  };
}

/** Commission rate (%) for a given tier. */
export function getCommissionRate(tier) {
  return getPlan(tier).commission_rate;
}

/**
 * Check whether a vendor can upload a file of `fileSizeBytes` given their tier
 * and current total usage.
 * Returns { allowed, limit, used, remaining } where limit/remaining are null for unlimited plans.
 */
export function checkStorageLimit(tier, usedBytes, fileSizeBytes) {
  const { storage_limit_bytes: limit } = getPlan(tier);
  if (limit === null) return { allowed: true, limit: null, used: usedBytes, remaining: null };
  const remaining = Math.max(0, limit - usedBytes);
  return {
    allowed: usedBytes + fileSizeBytes <= limit,
    limit,
    used: usedBytes,
    remaining,
  };
}

/**
 * Format a byte count into a human-readable string (e.g. "4.7 MB", "2.1 GB").
 */
export function formatStorageBytes(bytes) {
  if (bytes === null || bytes === undefined) return "Unlimited";
  if (bytes === 0) return "0 MB";
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * Resolve the NGN price for a tier + billing cycle from a prices map.
 * Falls back to DEFAULT_PRICES when the map is missing an entry.
 *
 * @param {'premium'|'vip'} tier
 * @param {'monthly'|'annual'} billingCycle
 * @param {object} [prices]  Shape: { premium: { monthly }, vip: { monthly, annual } }
 */
export function resolvePrice(tier, billingCycle = "monthly", prices = {}) {
  if (tier === "free") return 0;
  const tierPrices = prices[tier] ?? DEFAULT_PRICES[tier] ?? {};
  if (billingCycle === "annual" && tierPrices.annual != null) {
    return tierPrices.annual;
  }
  return tierPrices.monthly ?? 0;
}
