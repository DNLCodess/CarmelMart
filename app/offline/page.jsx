"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, Bike } from "lucide-react";

export default function OfflinePage() {
  const [isRider,  setIsRider]  = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // The SW serves this page in-place, so window.location.pathname is still
    // the original URL the user was trying to reach.
    setIsRider(window.location.pathname.startsWith("/rider"));
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Lightweight connectivity probe — if this resolves we're back online.
      await fetch("/favicon.ico", { cache: "no-store" });
      window.location.reload();
    } catch {
      setRetrying(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-xs w-full">
        {isRider ? (
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <Bike className="w-10 h-10 text-emerald-500" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10 text-gray-400" />
          </div>
        )}

        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">You&apos;re offline</h1>

        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          {isRider
            ? "You need a connection to see deliveries and update order status. Your last-loaded orders may still be visible — try going back."
            : "No internet connection. Your cart is saved and will be ready when you're back online."}
        </p>

        <button
          onClick={handleRetry}
          disabled={retrying}
          className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-extrabold text-base transition-colors disabled:opacity-60 active:scale-[0.98] ${
            isRider
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-primary hover:opacity-90 text-white"
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Checking connection…" : "Try Again"}
        </button>

        {isRider ? (
          <button
            onClick={() => window.history.back()}
            className="mt-3 w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Go Back
          </button>
        ) : (
          <Link
            href="/"
            className="mt-3 block text-sm text-primary font-semibold hover:underline"
          >
            Go to Homepage
          </Link>
        )}
      </div>
    </main>
  );
}
