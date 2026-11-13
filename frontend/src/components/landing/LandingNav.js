"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import Logo from "@/components/Logo";
import InstallButton from "@/components/InstallButton";

export default function LandingNav({ scrolled = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const winY =
        typeof window !== "undefined"
          ? window.scrollY ||
            window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0
          : 0;
      const mainEl = document.querySelector("main");
      const mainY = mainEl ? mainEl.scrollTop : 0;
      const y = Math.max(winY, mainY);
      setHasScrolled(y > 30);
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true, capture: true });
    document.addEventListener("scroll", checkScroll, { passive: true, capture: true });

    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.addEventListener("scroll", checkScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", checkScroll, { capture: true });
      document.removeEventListener("scroll", checkScroll, { capture: true });
      if (mainEl) {
        mainEl.removeEventListener("scroll", checkScroll);
      }
    };
  }, []);

  const isScrolled = scrolled || hasScrolled;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? isDark
            ? "bg-[#080b12] text-white border-b border-white/15 shadow-2xl"
            : "bg-white text-[#0f1b33] border-b border-[#dfd9cc] shadow-md"
          : "bg-transparent text-current border-b border-transparent shadow-none"
      }`}
      style={{
        backgroundColor: isScrolled ? (isDark ? "#080b12" : "#ffffff") : "transparent",
        borderBottomColor: isScrolled
          ? isDark
            ? "rgba(255, 255, 255, 0.15)"
            : "#dfd9cc"
          : "transparent",
        boxShadow: isScrolled
          ? isDark
            ? "0 4px 25px -2px rgba(0, 0, 0, 0.85)"
            : "0 4px 20px -2px rgba(15, 27, 51, 0.08)"
          : "none",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="FinSight home">
          <Logo className="h-8 w-8 transition-transform group-hover:scale-105 shrink-0" />
          <span
            className="font-screamer text-lg tracking-widest font-bold transition-colors group-hover:text-horizon"
            style={{ color: "var(--color-ink)" }}
          >
            FinSight
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* Light/Dark Mode Toggle with accessible aria and animated icons */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-ink/5 transition-all focus-visible:outline-none cursor-pointer"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -35, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-300" />
              ) : (
                <Moon className="h-4 w-4" style={{ color: "var(--color-ink)" }} />
              )}
            </motion.div>
          </button>

          {/* PWA Install Button */}
          <InstallButton variant="nav" />

          {/* Log in */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors hover:bg-ink/5"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          >
            Log in
          </Link>

          {/* Start free button */}
          <Link
            href="/signup"
            className="btn-horizon-hero inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs sm:text-sm font-screamer uppercase tracking-wider font-semibold shadow-sm hover:scale-105 active:scale-95 transition-transform"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
