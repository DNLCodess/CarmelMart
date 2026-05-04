"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      (process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_ENABLE_SW !== "true")
    ) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          { scope: "/", updateViaCache: "none" }
        );

        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") registration.update();
        };

        // Check for updates when the tab regains focus
        document.addEventListener("visibilitychange", handleVisibilityChange);

        const handleUpdateFound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version ready — prompt user to reload
              if (window.confirm("CarmelMart has been updated. Reload now?")) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            }
          });
        };

        registration.addEventListener("updatefound", handleUpdateFound);

        return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          registration.removeEventListener("updatefound", handleUpdateFound);
        };
      } catch (error) {
        console.error("[SW] Registration failed:", error);
        return undefined;
      }
    };

    let cleanupRegistration;
    const registerAndStoreCleanup = () => {
      register().then((cleanup) => {
        cleanupRegistration = cleanup;
      });
    };

    if (document.readyState === "complete") {
      registerAndStoreCleanup();
    } else {
      window.addEventListener("load", registerAndStoreCleanup);
    }

    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      window.removeEventListener("load", registerAndStoreCleanup);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      cleanupRegistration?.();
    };
  }, []);

  return null;
}
