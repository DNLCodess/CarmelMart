// lib/subscription.js
// Single source of truth for vendor subscription plans, pricing, and feature gates.
// Safe to import in both server (API routes, actions) and client components.

export const PLANS = {
  free: {
    tier: "free",
    name: "Free",
    tagline: "Start selling for free",
    monthly_price: 0,
    annual_price: null,
    product_limit: 20,       // max non-rejected products; null = unlimited
    commission_rate: 6.5,    // percentage taken per sale
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
    monthly_price: 5200,
    annual_price: null,      // monthly only
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
    monthly_price: 8200,
    annual_price: 95000,     // ~₦1,917 savings vs 12× monthly
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
 * Return the NGN price for a tier + billing cycle combination.
 * Annual is only valid for VIP.
 */
export function getPlanPrice(tier, billingCycle = "monthly") {
  const plan = getPlan(tier);
  if (billingCycle === "annual" && plan.annual_price != null) {
    return plan.annual_price;
  }
  return plan.monthly_price;
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
 *
 * @param {string} tier            - Vendor's active subscription tier
 * @param {number} currentCount    - Count of non-rejected products
 * @returns {{ allowed: boolean, limit: number|null, current: number }}
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
 * Commission rate (%) for a given tier.
 * Used when calculating vendor payouts.
 */
export function getCommissionRate(tier) {
  return getPlan(tier).commission_rate;
}

/**
 * Return human-readable annual savings for VIP annual billing vs monthly × 12.
 */
export function vipAnnualSavings() {
  const monthly12 = PLANS.vip.monthly_price * 12;
  return monthly12 - PLANS.vip.annual_price;
}
