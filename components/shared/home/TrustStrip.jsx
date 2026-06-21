"use client";

import { BadgeCheck, CreditCard, RotateCcw, Shield, Truck } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: BadgeCheck,
    label: "Verified vendors",
    sub: "KYC-checked sellers",
  },
  {
    icon: CreditCard,
    label: "Secure payments",
    sub: "Card, transfer, USSD",
  },
  {
    icon: Truck,
    label: "Nationwide delivery",
    sub: "Standard and express",
  },
  {
    icon: RotateCcw,
    label: "7-day returns",
    sub: "Simple buyer support",
  },
  {
    icon: Shield,
    label: "Buyer protection",
    sub: "Safer checkout",
  },
];

export default function TrustStrip() {
  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-950 truncate">{label}</p>
                <p className="text-xs text-gray-500 truncate">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
