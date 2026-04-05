"use client";

import { Shield, Truck, RotateCcw, BadgeCheck, CreditCard } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: BadgeCheck,
    label: "Verified Vendors",
    sub: "KYC-checked sellers only",
  },
  {
    icon: Truck,
    label: "Fast Delivery",
    sub: "Standard & express options",
  },
  {
    icon: RotateCcw,
    label: "7-Day Returns",
    sub: "Hassle-free refunds",
  },
  {
    icon: Shield,
    label: "Buyer Protection",
    sub: "100% secure checkout",
  },
  {
    icon: CreditCard,
    label: "Safe Payments",
    sub: "Visa · Mastercard · Verve",
  },
];

export default function TrustStrip() {
  return (
    <div className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none -mx-1 px-1">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 shrink-0 px-3 py-1"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{label}</p>
                <p className="text-xs text-gray-500 whitespace-nowrap">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
