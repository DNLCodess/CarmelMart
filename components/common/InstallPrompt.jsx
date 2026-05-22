"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Rocket, BellRing, WifiOff, ChevronRight } from "lucide-react";
import { usePWAInstall } from "@/lib/pwa-install-context";

const BENEFITS = [
  { icon: Rocket,    text: "Faster checkout — 1-tap ordering" },
  { icon: BellRing,  text: "Real-time order & delivery alerts" },
  { icon: WifiOff,   text: "Browse & wishlist even offline"    },
];

function shouldShowBanner() {
  const dismissedTime  = localStorage.getItem("cm_installDismissed");
  const dismissedCount = parseInt(localStorage.getItem("cm_installDismissCount") || "0");
  if (!dismissedTime) return true;
  const hours = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
  return dismissedCount < 3 ? hours >= 24 : hours >= 168;
}

export default function InstallPrompt() {
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePWAInstall() ?? {};

  const [showBanner,   setShowBanner]   = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (!canInstall || isStandalone) return;
    const t = setTimeout(() => {
      if (shouldShowBanner()) setShowBanner(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [canInstall, isStandalone]);

  const dismiss = () => {
    setShowBanner(false);
    setShowIOSModal(false);
    const count = parseInt(localStorage.getItem("cm_installDismissCount") || "0");
    localStorage.setItem("cm_installDismissed",     Date.now().toString());
    localStorage.setItem("cm_installDismissCount",  (count + 1).toString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowBanner(false);
      setShowIOSModal(true);
      return;
    }
    const outcome = await triggerInstall?.();
    if (outcome === "dismissed") dismiss();
    else setShowBanner(false);
  };

  if (isStandalone) return null;

  return (
    <>
      {/* ── Bottom install sheet ────────────────────────────────────── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            key="install-banner"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0,      opacity: 1 }}
            exit={{   y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280, mass: 0.9 }}
            className="fixed bottom-0 left-0 right-0 z-55 safe-bottom"
          >
            {/* Card */}
            <div className="mx-auto max-w-lg sm:max-w-xl sm:mb-4 sm:mx-4 lg:mx-auto bg-white sm:rounded-2xl shadow-2xl overflow-hidden border-t-4 border-primary">

              {/* Header band — maroon gradient */}
              <div className="bg-linear-to-r from-primary to-primary-dark px-5 pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/15 ring-2 ring-white/30 shrink-0 flex items-center justify-center">
                      <Image
                        src="/android-chrome-192x192.png"
                        alt="CarmelMart"
                        width={48}
                        height={48}
                        className="w-11 h-11 object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-base leading-tight">
                        Get the CarmelMart App
                      </p>
                      <p className="text-white/70 text-xs mt-0.5">
                        Free • Works offline • Instant access
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={dismiss}
                    aria-label="Dismiss install prompt"
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0 ml-2"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Benefits */}
              <div className="px-5 py-3 space-y-2">
                {BENEFITS.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5 pt-1 flex items-center gap-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Install App — It&apos;s Free
                </button>
                <button
                  onClick={dismiss}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium whitespace-nowrap transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS step-by-step modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            key="ios-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{   opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-60 flex items-end md:items-center justify-center bg-black/55 p-4"
          >
            <motion.div
              initial={{ y: 60,  opacity: 0 }}
              animate={{ y: 0,   opacity: 1 }}
              exit={{   y: 60,  opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Modal header */}
              <div className="bg-linear-to-r from-primary to-primary-dark px-5 pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/15 ring-2 ring-white/30 flex items-center justify-center">
                      <Image
                        src="/android-chrome-192x192.png"
                        alt="CarmelMart"
                        width={44}
                        height={44}
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-base">Install CarmelMart</p>
                      <p className="text-white/70 text-xs">Add to your Home Screen</p>
                    </div>
                  </div>
                  <button
                    onClick={dismiss}
                    aria-label="Close"
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="px-5 py-5 space-y-3">
                {[
                  {
                    n: 1,
                    text: (
                      <>
                        Tap the <strong>Share</strong>{" "}
                        <svg className="inline w-4 h-4 mx-0.5 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" />
                        </svg>{" "}
                        button in Safari
                      </>
                    ),
                  },
                  { n: 2, text: <>Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong></> },
                  { n: 3, text: <>Tap <strong>&quot;Add&quot;</strong> in the top-right corner</> },
                ].map(({ n, text }) => (
                  <div key={n} className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {n}
                    </span>
                    <p className="text-sm text-gray-700 pt-1">{text}</p>
                  </div>
                ))}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-1">
                  <p className="text-xs text-amber-800">
                    <strong>Safari only.</strong> Open this page in Safari if you&apos;re using a different browser.
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={dismiss}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  Got it, thanks! <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
