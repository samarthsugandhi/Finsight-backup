"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, Share, Smartphone, Monitor, Tablet } from "lucide-react";

/* ─── Platform detection ───────────────────────────────────────────── */
function detectPlatform() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isChrome = /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
  const isEdge = /Edg\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua);
  const isFirefox = /Firefox\//.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  return { isIOS, isAndroid, isMobile, isChrome, isEdge, isSafari, isFirefox, isStandalone };
}

/* ─── Step bubble ──────────────────────────────────────────────────── */
function Step({ n, icon, children, delay = 0 }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-4"
    >
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ background: "var(--color-horizon)", color: "#0f1b33" }}
      >
        {icon || n}
      </div>
      <span className="text-sm leading-relaxed pt-1" style={{ color: "var(--color-ink)" }}>
        {children}
      </span>
    </motion.li>
  );
}

/* ─── Platform-specific guide content ─────────────────────────────── */
function GuideContent({ platform, hasNativePrompt, onNativeInstall }) {
  const { isIOS, isAndroid, isMobile, isChrome, isEdge, isSafari, isFirefox } = platform;

  // Android Chrome / Edge — has native prompt, but user clicked "Learn How"
  if ((isAndroid && (isChrome || isEdge)) || hasNativePrompt) {
    return (
      <ol className="space-y-4">
        <Step n={1} delay={0.05}>
          Tap the <b>⋮</b> menu at the top-right of your browser.
        </Step>
        <Step n={2} delay={0.1}>
          Select <b>Install app</b> or <b>Add to Home screen</b>.
        </Step>
        <Step n={3} delay={0.15}>
          Tap <b>Install</b>. FinSight launches like a native app — no browser chrome.
        </Step>
      </ol>
    );
  }

  // iOS Safari
  if (isIOS && isSafari) {
    return (
      <ol className="space-y-4">
        <Step n={1} icon={<Share className="h-3.5 w-3.5" />} delay={0.05}>
          Tap the <b>Share</b> button (box with arrow) at the bottom of Safari.
        </Step>
        <Step n={2} delay={0.1}>
          Scroll down in the share sheet and tap{" "}
          <b>Add to Home Screen</b>.
        </Step>
        <Step n={3} delay={0.15}>
          Tap <b>Add</b> in the top-right. FinSight appears on your Home Screen like a real app.
        </Step>
      </ol>
    );
  }

  // iOS but not Safari (Chrome/Firefox on iOS)
  if (isIOS && !isSafari) {
    return (
      <div className="space-y-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
        <p>
          iOS only supports Home Screen installation via <b style={{ color: "var(--color-ink)" }}>Safari</b>.
        </p>
        <ol className="space-y-4">
          <Step n={1} delay={0.05}>
            Copy this URL and open it in <b>Safari</b>.
          </Step>
          <Step n={2} icon={<Share className="h-3.5 w-3.5" />} delay={0.1}>
            Tap the <b>Share</b> icon → <b>Add to Home Screen</b>.
          </Step>
          <Step n={3} delay={0.15}>
            Tap <b>Add</b>. Done — FinSight is on your Home Screen.
          </Step>
        </ol>
      </div>
    );
  }

  // Desktop Chrome / Edge
  if (!isMobile && (isChrome || isEdge)) {
    return (
      <ol className="space-y-4">
        <Step n={1} delay={0.05}>
          Look for the <b>install icon ⊕</b> in the address bar (right side).
        </Step>
        <Step n={2} delay={0.1}>
          Click it, then click <b>Install</b> in the popup.
        </Step>
        <Step n={3} delay={0.15}>
          FinSight opens in its own window — pinned to your taskbar or dock.
        </Step>
      </ol>
    );
  }

  // Desktop Safari (macOS Sonoma+)
  if (!isMobile && isSafari) {
    return (
      <ol className="space-y-4">
        <Step n={1} delay={0.05}>
          In Safari, open the <b>File</b> menu.
        </Step>
        <Step n={2} delay={0.1}>
          Click <b>Add to Dock…</b> (available on macOS Sonoma 14+ / Safari 17+).
        </Step>
        <Step n={3} delay={0.15}>
          Click <b>Add</b>. FinSight appears in your Dock as a standalone app.
        </Step>
      </ol>
    );
  }

  // Firefox or other
  if (isFirefox) {
    return (
      <div className="text-sm space-y-3" style={{ color: "var(--color-ink-soft)" }}>
        <p>
          Firefox does not natively support PWA installation.
          For the best experience, open FinSight in{" "}
          <b style={{ color: "var(--color-ink)" }}>Chrome</b> or{" "}
          <b style={{ color: "var(--color-ink)" }}>Edge</b> and use their install prompt.
        </p>
        <div
          className="rounded-xl p-3 text-xs"
          style={{ background: "var(--color-horizon-dim)", color: "var(--color-ink)" }}
        >
          💡 Alternatively, install the{" "}
          <a
            href="https://addons.mozilla.org/en-US/firefox/addon/pwas-for-firefox/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            Progressive Web Apps for Firefox
          </a>{" "}
          extension.
        </div>
      </div>
    );
  }

  // Generic fallback
  return (
    <ol className="space-y-4">
      <Step n={1} delay={0.05}>
        Open FinSight in <b>Chrome</b> or <b>Edge</b> for the best install experience.
      </Step>
      <Step n={2} delay={0.1}>
        Tap <b>⋮</b> → <b>Install app</b> or <b>Add to Home Screen</b>.
      </Step>
      <Step n={3} delay={0.15}>
        Confirm and FinSight launches like a native app.
      </Step>
    </ol>
  );
}

/* ─── Device icon strip ────────────────────────────────────────────── */
function DeviceStrip({ platform }) {
  const { isIOS, isAndroid, isMobile } = platform;
  const devices = isMobile
    ? [
        { Icon: Smartphone, label: isIOS ? "iPhone / iPad" : "Android" },
      ]
    : [
        { Icon: Monitor, label: "Desktop" },
        { Icon: Tablet, label: "Tablet" },
        { Icon: Smartphone, label: "Mobile" },
      ];

  return (
    <div className="flex items-center gap-3 mb-5">
      {devices.map(({ Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            background: "var(--color-horizon-dim)",
            color: "var(--color-ink)",
          }}
        >
          <Icon className="h-3 w-3" />
          {label}
        </div>
      ))}
    </div>
  );
}

/* ─── Main sheet / modal ───────────────────────────────────────────── */
function InstallSheet({ open, onClose, platform, hasNativePrompt, onNativeInstall }) {
  const isMobile = platform.isMobile;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Install FinSight"
            onClick={(e) => e.stopPropagation()}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 32, stiffness: 350 }}
            className="w-full sm:max-w-md"
            style={{
              background: "var(--color-paper-raised)",
              borderRadius: isMobile ? "24px 24px 0 0" : "24px",
              padding: "28px 24px",
              paddingBottom: isMobile ? "calc(28px + env(safe-area-inset-bottom))" : "28px",
              boxShadow: "0 -4px 48px rgba(0,0,0,0.3)",
            }}
          >
            {/* Drag handle on mobile */}
            {isMobile && (
              <div className="flex justify-center mb-5">
                <div
                  className="h-1 w-10 rounded-full"
                  style={{ background: "var(--color-line)" }}
                />
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {/* App icon */}
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center font-screamer font-bold text-lg"
                    style={{ background: "var(--color-horizon)", color: "#0f1b33" }}
                  >
                    F
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight" style={{ color: "var(--color-ink)" }}>
                      Install FinSight
                    </h3>
                    <p className="text-xs" style={{ color: "var(--color-ink-soft)" }}>
                      Free · Works offline · No app store needed
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close"
                style={{ color: "var(--color-ink-soft)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Device tags */}
            <DeviceStrip platform={platform} />

            {/* One-tap native install (Chrome/Edge + beforeinstallprompt available) */}
            {hasNativePrompt && (
              <motion.button
                type="button"
                onClick={onNativeInstall}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 mb-5 font-semibold text-sm"
                style={{
                  background: "var(--color-horizon)",
                  color: "#0f1b33",
                }}
              >
                <Download className="h-4 w-4" />
                Install Now — One tap
              </motion.button>
            )}

            {/* Divider if native prompt exists */}
            {hasNativePrompt && (
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: "var(--color-line)" }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs" style={{ background: "var(--color-paper-raised)", color: "var(--color-ink-soft)" }}>
                    or install manually
                  </span>
                </div>
              </div>
            )}

            {/* Platform-specific guide */}
            <GuideContent
              platform={platform}
              hasNativePrompt={hasNativePrompt}
              onNativeInstall={onNativeInstall}
            />

            {/* Benefits row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 grid grid-cols-3 gap-2"
            >
              {[
                { emoji: "⚡", label: "Instant load" },
                { emoji: "📴", label: "Works offline" },
                { emoji: "🔒", label: "Data stays local" },
              ].map(({ emoji, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 rounded-xl py-2.5 text-center"
                  style={{ background: "var(--color-horizon-dim)" }}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-ink)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Exported component ───────────────────────────────────────────── */
/**
 * Smart PWA install button for FinSight.
 * - Android/Chrome/Edge: one-tap native prompt
 * - iOS Safari: animated Add to Home Screen guide
 * - Desktop Chrome/Edge: address bar install guide
 * - Desktop Safari: File → Add to Dock guide
 * - Firefox: redirect suggestion
 * Hidden when already running as standalone PWA.
 */
export default function InstallButton({ variant = "cta", className = "" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const p = detectPlatform();
      setInstalled(p.isStandalone);
      setPlatform(p);
    }, 0);

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleNativeInstall = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    setOpen(false);
  }, [deferred]);

  const handleClick = useCallback(() => {
    if (deferred) {
      // Has native install prompt → trigger it directly
      handleNativeInstall();
    } else {
      // Show platform-specific guide
      setOpen(true);
    }
  }, [deferred, handleNativeInstall]);

  if (installed) return null;

  /* ── Button styles ── */
  const isNav = variant === "nav";
  const btnStyle = isNav
    ? "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all hover:bg-ink/5 active:scale-95 focus-visible:outline-none"
    : "inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-all hover:bg-ink/5 active:scale-95 focus-visible:outline-none hover:scale-105";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`${btnStyle} ${className}`}
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        aria-label="Install FinSight app"
      >
        <Download className={isNav ? "h-3.5 w-3.5" : "h-4 w-4"} style={{ color: "var(--color-ink)" }} />
        {isNav ? (
          <>
            <span className="hidden sm:inline">Install app</span>
            <span className="sm:hidden">App</span>
          </>
        ) : (
          <span>Install app</span>
        )}
      </button>

      <InstallSheet
        open={open}
        onClose={() => setOpen(false)}
        platform={platform}
        hasNativePrompt={!!deferred}
        onNativeInstall={handleNativeInstall}
      />
    </>
  );
}
