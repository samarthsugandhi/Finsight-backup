"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui";

export default function LandingNav({ scrolled = false }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  // Determine styling based on scroll position and theme
  const navBackground = scrolled
    ? isLight
      ? "border-b border-[#dfd9cc] bg-[#f6f4ef]/85 backdrop-blur-xl shadow-xs"
      : "border-b border-white/10 bg-[#080b12]/85 backdrop-blur-xl shadow-2xl"
    : "bg-transparent";

  const brandColor = isLight ? "#0f1b33" : "var(--color-accent-hero, #d6ff62)";

  const toggleBtnClass = isLight
    ? "border-[#dfd9cc] text-[#0f1b33] hover:border-black/30 hover:bg-black/5"
    : "border-white/20 text-white/80 hover:border-white/40 hover:bg-white/10 hover:text-white";

  const loginBtnClass = isLight
    ? "border-[#dfd9cc] text-[#0f1b33] hover:bg-black/5"
    : "border-white/25 text-white hover:bg-white/10";

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 ${navBackground}`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="FinSight home">
          <Logo className="h-8 w-8 transition-transform group-hover:scale-105" />
          <span
            className="font-screamer text-lg tracking-widest transition-colors"
            style={{ color: brandColor }}
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
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${toggleBtnClass}`}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -35, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-300" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-900" />
              )}
            </motion.div>
          </button>

          <Link href="/login">
            <Button
              variant="ghost"
              className={`text-xs sm:text-sm px-3.5 py-1.5 font-medium transition-colors ${loginBtnClass}`}
            >
              Log in
            </Button>
          </Link>

          <Link href="/signup">
            <Button
              variant="accent"
              className="btn-horizon-hero text-xs sm:text-sm px-4 py-1.5 font-screamer uppercase tracking-wider"
            >
              Start free
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
