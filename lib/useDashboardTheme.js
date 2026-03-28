"use client";

import { useState, useEffect } from "react";

/**
 * useDashboardTheme
 * Persists dark/light preference per dashboard in localStorage.
 * Returns { dark, toggle } — apply `dark` class to shell root div.
 */
export function useDashboardTheme(storageKey = "cm-dash-theme") {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(storageKey);
    if (stored === "dark") {
      setDark(true);
    } else if (stored === "light") {
      setDark(false);
    } else {
      // Fall back to OS preference
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, [storageKey]);

  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, next ? "dark" : "light");
      return next;
    });
  };

  return { dark, toggle, mounted };
}
