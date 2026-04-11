"use client";

// Tier badge displayed in the sidebar user card and anywhere a plan label is needed.
// Renders nothing for the free tier (free is the baseline, no badge needed).

const TIER_STYLES = {
  premium: {
    label: "Premium",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700",
    dot: "bg-blue-500",
  },
  vip: {
    label: "VIP",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700",
    dot: "bg-amber-500",
  },
};

/**
 * @param {{ tier: string, size?: 'sm'|'md' }} props
 */
export default function SubscriptionBadge({ tier, size = "sm" }) {
  const cfg = TIER_STYLES[tier];
  if (!cfg) return null; // free tier — no badge

  const textSize = size === "md" ? "text-xs" : "text-[10px]";
  const px = size === "md" ? "px-2 py-0.5" : "px-1.5 py-0.5";
  const dotSize = size === "md" ? "w-1.5 h-1.5" : "w-1 h-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold leading-none ${textSize} ${px} ${cfg.className}`}
    >
      <span className={`rounded-full shrink-0 ${dotSize} ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
