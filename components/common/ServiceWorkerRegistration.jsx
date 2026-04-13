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

        // Check for updates when the tab regains focus
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") registration.update();
        });

        registration.addEventListener("updatefound", () => {
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
        });
      } catch (error) {
        console.error("[SW] Registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
