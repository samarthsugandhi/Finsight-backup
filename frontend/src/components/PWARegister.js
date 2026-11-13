"use client";

import { useEffect } from "react";

/** Registers the service worker so FinSight can be installed as an app. */
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Only in production builds, so dev hot-reload is never served from a cache.
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
