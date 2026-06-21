"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";

// Static fallback shown while loading or when DB is empty
const FALLBACK = [
  { name: "Adaeze",  city: "Lagos",         item: "Skincare Bundle",       ago: "2m ago"  },
  { name: "Emeka",   city: "Abuja",         item: "Gaming Laptop",         ago: "5m ago"  },
  { name: "Fatima",  city: "Kano",          item: "African Print Dress",   ago: "8m ago"  },
  { name: "Tunde",   city: "Port Harcourt", item: "Wireless Earbuds",      ago: "11m ago" },
  { name: "Chioma",  city: "Enugu",         item: "Perfume Gift Set",      ago: "14m ago" },
  { name: "Bello",   city: "Kaduna",        item: "Smart TV 43\"",         ago: "18m ago" },
  { name: "Ngozi",   city: "Anambra",       item: "Nike Sneakers",         ago: "22m ago" },
  { name: "Yusuf",   city: "Katsina",       item: "Infinix Hot 40 Pro",    ago: "27m ago" },
  { name: "Amara",   city: "Imo",           item: "Standing Desk",         ago: "31m ago" },
  { name: "Dele",    city: "Oyo",           item: "Protein Supplement",    ago: "35m ago" },
];

export default function LiveActivityTicker() {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const { data } = useQuery({
    queryKey: ["live-activity"],
    queryFn: () => fetch("/api/live-activity").then((r) => r.json()),
    staleTime: 30_000,
    retry: false,
  });

  const items = data?.activities?.length ? data.activities : FALLBACK;
  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <section className="py-3 bg-primary/5 border-y border-primary/10 overflow-hidden">
      <div className="flex items-center gap-4 max-w-screen-2xl mx-auto px-4">
        {/* Label */}
        <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full whitespace-nowrap">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>

        {/* Scrolling track */}
        <div
          className="flex-1 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={trackRef}
            className="flex gap-8 whitespace-nowrap"
            style={{
              animation: `ticker-scroll 40s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            {doubled.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs text-gray-700 shrink-0"
              >
                <ShoppingBag className="w-3 h-3 text-primary shrink-0" />
                <span className="font-semibold">{a.name}</span>
                <span className="text-gray-500">from {a.city} just bought</span>
                <span className="font-semibold text-gray-800">{a.item}</span>
                <span className="text-gray-400">· {a.ago}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
