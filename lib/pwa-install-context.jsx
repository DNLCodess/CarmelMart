"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const PWAInstallContext = createContext(null);

export function PWAInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled,    setIsInstalled]    = useState(false);

  // Computed once — safe to derive outside state
  const isIOS = typeof window !== "undefined"
    ? /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    : false;

  const isStandalone = typeof window !== "undefined"
    ? window.matchMedia?.("(display-mode: standalone)").matches === true ||
      window.navigator?.standalone === true
    : false;

  useEffect(() => {
    if (isStandalone) { setIsInstalled(true); return; }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.removeItem("cm_installDismissed");
      localStorage.removeItem("cm_installDismissCount");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled",         handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled",         handleAppInstalled);
    };
  }, [isStandalone]);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      localStorage.removeItem("cm_installDismissed");
      localStorage.removeItem("cm_installDismissCount");
    }
    return outcome; // "accepted" | "dismissed"
  }, [deferredPrompt]);

  // true when it makes sense to show an install entry point
  const canInstall = !isInstalled && !isStandalone && (!!deferredPrompt || isIOS);

  return (
    <PWAInstallContext.Provider value={{ canInstall, isIOS, isStandalone, isInstalled, deferredPrompt, triggerInstall }}>
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  return useContext(PWAInstallContext);
}
