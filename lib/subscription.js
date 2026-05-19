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

export const PLANS = {
  free: {
    tier: "free",
    name: "Basic",
    tagline: "Start selling for free",
    product_limit: 20,       // max active products; null = unlimited
    commission_rate: 6.5,
    features: [
      "Free registration",
      "Vendor profile & shop page",
      "Up to 20 products",
      "Basic order management",
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
    commission_rate: 4.5,
    features: [
      "Up to 50 products",
      "Better search ranking",
      "Promotions & deals access",
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
    product_limit: null,     // unlimited
    commission_rate: 3.5,
    features: [
      "Unlimited products",
      "Homepage & top search placement",
      "Dedicated account manager",
      "Lowest commission (3.5%)",
      "Exclusive marketing campaigns",
      "Sponsored listings",
      "Priority payouts",
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

/** Commission rate (%) for a given tier. */
export function getCommissionRate(tier) {
  return getPlan(tier).commission_rate;
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
