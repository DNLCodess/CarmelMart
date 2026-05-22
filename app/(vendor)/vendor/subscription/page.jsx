"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Gem, Package, Check, X, AlertCircle,
  Calendar, RefreshCw, ArrowRight, TrendingDown,
  BadgeCheck, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { flutterwaveHelpers } from "@/lib/flutterwave";
import { PLANS, PLAN_ORDER, DEFAULT_PRICES } from "@/lib/subscription";
import SubscriptionBadge from "@/components/shared/vendor/SubscriptionBadge";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchSubscription() {
  const r = await fetch("/api/vendor/subscription");
  if (!r.ok) throw new Error("Failed to load subscription");
  return r.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function daysLeft(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getPrice(prices, tier, billingCycle) {
  if (tier === "free") return 0;
  const tierPrices = prices?.[tier] ?? DEFAULT_PRICES[tier] ?? {};
  if (billingCycle === "annual" && tierPrices.annual != null) return tierPrices.annual;
  return tierPrices.monthly ?? 0;
}

const TIER_ICONS = {
  free:    Package,
  premium: Gem,
  vip:     Crown,
};

const TIER_GRADIENT = {
  free:    "from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700",
  premium: "from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
  vip:     "from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40",
};

const TIER_BORDER = {
  free:    "border-gray-200 dark:border-gray-700",
  premium: "border-blue-300 dark:border-blue-700",
  vip:     "border-amber-300 dark:border-amber-600",
};

const TIER_ICON_COLOR = {
  free:    "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700",
  premium: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50",
  vip:     "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CurrentPlanCard({ subscription, tier, plan }) {
  const TierIcon = TIER_ICONS[tier] ?? Package;
  const days = daysLeft(subscription?.expires_at);
  const isCancelled = subscription?.status === "cancelled";
  const isExpiringSoon = days !== null && days <= 7 && days > 0;

  return (
    <div className={`rounded-2xl border-2 bg-linear-to-br p-6 ${TIER_GRADIENT[tier]} ${TIER_BORDER[tier]}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${TIER_ICON_COLOR[tier]}`}>
            <TierIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
                {plan.name} Plan
              </h2>
              <SubscriptionBadge tier={tier} size="md" />
              {isCancelled && (
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                  Cancelled
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {tier === "free"
                ? `Standard commission • ${plan.product_limit} product slots`
                : `${plan.commission_rate}% commission • ${plan.product_limit ?? "Unlimited"} products`}
            </p>
          </div>
        </div>

        <div className="text-right">
          {tier === "free" ? (
            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Free</p>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                ₦{(subscription?.amount ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {subscription?.billing_cycle === "annual" ? "per year" : "per month"}
              </p>
            </>
          )}
        </div>
      </div>

      {tier !== "free" && subscription && (
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            {isCancelled ? (
              <span>Active until <strong className="text-gray-800 dark:text-gray-200">{formatDate(subscription.expires_at)}</strong></span>
            ) : (
              <span>Renews <strong className="text-gray-800 dark:text-gray-200">{formatDate(subscription.expires_at)}</strong></span>
            )}
          </div>
          {days !== null && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isExpiringSoon
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            }`}>
              {days === 0 ? "Expires today" : `${days} day${days === 1 ? "" : "s"} left`}
            </span>
          )}
        </div>
      )}

      {isExpiringSoon && !isCancelled && (
        <div className="mt-4 flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Your subscription expires soon. Renew to keep your {plan.name} features.
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="mt-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">
            Cancellation requested. Your {plan.name} benefits continue until{" "}
            <strong>{formatDate(subscription.expires_at)}</strong>, then your account reverts to Free.
          </p>
        </div>
      )}
    </div>
  );
}

function PlanCard({ planKey, currentTier, prices, onUpgrade, isProcessing }) {
  const plan = PLANS[planKey];
  const TierIcon = TIER_ICONS[planKey] ?? Package;
  const isCurrentPlan = planKey === currentTier;
  const isDowngrade = PLAN_ORDER.indexOf(planKey) < PLAN_ORDER.indexOf(currentTier);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showFeatures, setShowFeatures] = useState(false);

  const isVip = planKey === "vip";
  const tierPrices = prices?.[planKey] ?? DEFAULT_PRICES[planKey];
  const hasAnnual = isVip && tierPrices?.annual != null;
  const price = getPrice(prices, planKey, billingCycle);
  const annualSavings = hasAnnual
    ? (tierPrices.monthly * 12) - tierPrices.annual
    : 0;

  return (
    <div className={`relative rounded-2xl border-2 flex flex-col bg-white dark:bg-gray-800 transition-shadow ${
      isCurrentPlan
        ? `${TIER_BORDER[planKey]} shadow-md`
        : "border-gray-200 dark:border-gray-700 hover:shadow-md"
    }`}>
      {planKey === "premium" && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-blue-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TIER_ICON_COLOR[planKey]}`}>
            <TierIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900 dark:text-gray-100">{plan.name}</h3>
              {isCurrentPlan && (
                <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-700 px-1.5 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{plan.tagline}</p>
          </div>
        </div>

        {/* Pricing */}
        {planKey === "free" ? (
          <div className="mb-4">
            <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Free</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Forever</p>
          </div>
        ) : (
          <div className="mb-4">
            {hasAnnual && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mb-3 w-fit">
                {["monthly", "annual"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setBillingCycle(c)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                      billingCycle === c
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {c === "monthly" ? "Monthly" : "Annual"}
                  </button>
                ))}
              </div>
            )}
            <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              ₦{price.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {hasAnnual && billingCycle === "annual" ? "per year" : "per month"}
            </p>
            {hasAnnual && billingCycle === "annual" && annualSavings > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                Save ₦{annualSavings.toLocaleString()} vs monthly
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 mb-4">
          <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {plan.commission_rate}% commission per sale
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Package className="w-4 h-4 shrink-0" />
          <span>
            {plan.product_limit === null ? "Unlimited products" : `Up to ${plan.product_limit} products`}
          </span>
        </div>

        {!isCurrentPlan && !isDowngrade && planKey !== "free" && (
          <button
            onClick={() => onUpgrade(planKey, billingCycle)}
            disabled={isProcessing}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
              planKey === "vip"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Upgrade to {plan.name}<ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        )}

        {isCurrentPlan && planKey !== "free" && (
          <button
            onClick={() => onUpgrade(planKey, billingCycle)}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-60"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><RefreshCw className="w-4 h-4" />Renew {plan.name}</>
            )}
          </button>
        )}

        {isCurrentPlan && planKey === "free" && (
          <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
            Your current plan
          </div>
        )}

        {isDowngrade && (
          <div className="w-full py-2.5 rounded-xl text-xs font-semibold text-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 border border-dashed border-gray-200 dark:border-gray-600">
            Downgrades apply next billing cycle
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => setShowFeatures((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <span>{showFeatures ? "Hide" : "See"} features</span>
          {showFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence initial={false}>
          {showFeatures && (
            <motion.ul
              key="features"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-5 pb-4 space-y-2"
            >
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BillingHistory({ history }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? history : history.slice(0, 3);

  if (!history.length) return null;

  const STATUS_STYLE = {
    active:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    expired:   "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">Billing History</h3>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {visible.map((entry) => (
          <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {entry.tier} Plan
                {entry.billing_cycle && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal"> · {entry.billing_cycle}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {formatDate(entry.started_at)}
                {entry.expires_at && ` → ${formatDate(entry.expires_at)}`}
              </p>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              ₦{(entry.amount ?? 0).toLocaleString()}
            </p>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[entry.status] ?? STATUS_STYLE.expired}`}>
              {entry.status}
            </span>
          </div>
        ))}
      </div>
      {history.length > 3 && (
        <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-700">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {expanded ? "Show less" : `Show all ${history.length} records`}
          </button>
        </div>
      )}
    </div>
  );
}

function CancelModal({ tier, expiresAt, onConfirm, onClose, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Cancel Subscription</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          You are about to cancel your <strong className="capitalize">{tier}</strong> plan.
        </p>
        <ul className="space-y-2 mb-5">
          {[
            `Your plan stays active until ${formatDate(expiresAt)}`,
            "After that, your account reverts to the Free plan",
            "Downgrades apply to the next billing cycle — no refunds",
          ].map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              {point}
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Keep Plan
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Cancel"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SuccessBanner({ tier, onDismiss }) {
  const plan = PLANS[tier];
  const TierIcon = TIER_ICONS[tier] ?? Package;
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 p-5 flex items-start gap-4 ${TIER_GRADIENT[tier]} ${TIER_BORDER[tier]}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TIER_ICON_COLOR[tier]}`}>
        <BadgeCheck className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-gray-900 dark:text-gray-100 text-lg">
          Welcome to {plan?.name}!
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Your subscription is active. Enjoy your upgraded features — including a{" "}
          <strong>{plan?.commission_rate}% commission rate</strong> and{" "}
          {plan?.product_limit === null ? "unlimited product slots" : `up to ${plan?.product_limit} products`}.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VendorSubscriptionPage() {
  const qc = useQueryClient();
  const [processingTier, setProcessingTier] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successTier, setSuccessTier] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["vendor-subscription"],
    queryFn: fetchSubscription,
    staleTime: 30_000,
    retry: false,
  });

  const currentTier   = data?.tier         ?? "free";
  const currentPlan   = data?.plan         ?? PLANS.free;
  const prices        = data?.prices       ?? DEFAULT_PRICES;
  const subscription  = data?.subscription ?? null;
  const history       = data?.history      ?? [];

  const cancelMutation = useMutation({
    mutationFn: () =>
      fetch("/api/vendor/subscription/cancel", { method: "POST" }).then((r) => r.json()),
    onSuccess: (res) => {
      setShowCancelModal(false);
      if (res.success) {
        toast.success(res.message ?? "Subscription cancelled.");
        qc.invalidateQueries({ queryKey: ["vendor-subscription"] });
      } else {
        toast.error(res.error ?? "Failed to cancel subscription.");
      }
    },
    onError: () => toast.error("An unexpected error occurred. Please try again."),
  });

  const handleUpgrade = async (tier, billingCycle) => {
    setProcessingTier(tier);
    try {
      const res = await fetch("/api/vendor/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billing_cycle: billingCycle }),
      });
      const initData = await res.json();

      if (!res.ok || !initData.success) {
        toast.error(initData.error ?? "Could not initiate payment. Please try again.");
        return;
      }

      await flutterwaveHelpers.initializePayment(
        initData.customer_email,
        initData.amount,
        initData.reference,
        initData.customer_name,
        `subscription_${tier}`,
        async (flwResponse) => {
          try {
            const verifyRes = await fetch("/api/vendor/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transaction_id: flwResponse.transaction_id,
                reference:      initData.reference,
                flw_ref:        flwResponse.flw_ref,
                tier,
                billing_cycle:  billingCycle,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setSuccessTier(tier);
              qc.invalidateQueries({ queryKey: ["vendor-subscription"] });
            } else {
              toast.error(verifyData.error ?? "Payment verification failed. Contact support.");
            }
          } catch {
            toast.error("Verification failed. Contact support with your payment reference.");
          } finally {
            setProcessingTier(null);
          }
        },
        () => setProcessingTier(null)
      );
    } catch (err) {
      toast.error(err.message ?? "An unexpected error occurred.");
      setProcessingTier(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-semibold">Failed to load subscription data. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Subscription</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your plan, unlock more products, and reduce your commission rate.
        </p>
      </div>

      <AnimatePresence>
        {successTier && (
          <SuccessBanner tier={successTier} onDismiss={() => setSuccessTier(null)} />
        )}
      </AnimatePresence>

      {data?.just_expired && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Subscription Expired</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Your paid plan has expired and your account has been moved to Free. Renew below to restore your features.
            </p>
          </div>
        </div>
      )}

      <CurrentPlanCard subscription={subscription} tier={currentTier} plan={currentPlan} />

      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">All Plans</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLAN_ORDER.map((key) => (
            <PlanCard
              key={key}
              planKey={key}
              currentTier={currentTier}
              prices={prices}
              onUpgrade={handleUpgrade}
              isProcessing={processingTier === key}
            />
          ))}
        </div>
      </div>

      {/* Commission rate comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Commission Rates</h3>
        <div className="space-y-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const isActive = key === currentTier;
            const barWidth = key === "free" ? 100 : key === "premium" ? 69 : 54;
            return (
              <div key={key} className="flex items-center gap-4">
                <div className="w-20 text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize shrink-0">
                  {plan.name}
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isActive
                        ? "bg-primary"
                        : key === "premium"
                        ? "bg-blue-400"
                        : key === "vip"
                        ? "bg-amber-400"
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="w-14 text-right">
                  <span className={`text-sm font-extrabold ${isActive ? "text-primary" : "text-gray-600 dark:text-gray-400"}`}>
                    {plan.commission_rate}%
                  </span>
                </div>
                {isActive && (
                  <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full shrink-0">
                    Yours
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          Lower commission = more earnings per sale. Upgrade to keep more of your revenue.
        </p>
      </div>

      {currentTier !== "free" && subscription?.status === "active" && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cancel Subscription</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Your plan stays active until {formatDate(subscription?.expires_at)}, then reverts to Free.
            </p>
          </div>
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            Cancel plan
          </button>
        </div>
      )}

      <BillingHistory history={history} />

      <AnimatePresence>
        {showCancelModal && (
          <CancelModal
            tier={currentTier}
            expiresAt={subscription?.expires_at}
            onConfirm={() => cancelMutation.mutate()}
            onClose={() => setShowCancelModal(false)}
            isLoading={cancelMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
