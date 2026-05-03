"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const PWAInstallContext = createContext(null);

export function PWAInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled,    setIsInstalled]    = useState(false);
  // Start false on both server and client to avoid hydration mismatch.
  // Real values are set after mount in useEffect.
  const [isIOS,        setIsIOS]        = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      window.navigator?.standalone === true;

    setIsIOS(ios);
    setIsStandalone(standalone);

    if (standalone) { setIsInstalled(true); return; }

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
  }, []);

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
