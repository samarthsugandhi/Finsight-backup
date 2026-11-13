"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui";
import SahariarSphere from "./SahariarSphere";
import { useTheme } from "@/context/ThemeContext";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

/* ─── Dashboard Preview Card (Inspired by SAHARIAR's "Your Wealth at a Glance") ─── */
function WealthPreviewCard({ isLight }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto rounded-3xl border p-5 sm:p-7 shadow-2xl transition-all relative overflow-hidden backdrop-blur-xl"
      style={{
        background: isLight
          ? "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 246, 240, 0.92) 100%)"
          : "linear-gradient(180deg, rgba(13, 17, 23, 0.88) 0%, rgba(8, 11, 18, 0.94) 100%)",
        borderColor: isLight ? "#dfd9cc" : "rgba(255, 255, 255, 0.12)",
        boxShadow: isLight
          ? "0 25px 60px -15px rgba(15, 27, 51, 0.08), 0 0 1px rgba(0,0,0,0.1)"
          : "0 25px 70px -15px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.15)",
      }}
    >
      {/* Subtle top ambient accent highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: isLight
            ? "linear-gradient(90deg, transparent, rgba(201, 162, 39, 0.5), transparent)"
            : "linear-gradient(90deg, transparent, rgba(214, 255, 98, 0.5), transparent)",
        }}
      />

      {/* Header bar of preview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b gap-3"
        style={{ borderColor: isLight ? "#dfd9cc" : "rgba(255, 255, 255, 0.08)" }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-screamer text-base uppercase tracking-wider font-bold"
              style={{ color: isLight ? "#0f1b33" : "#ffffff" }}>
              Your Wealth at a Glance
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-figure font-semibold uppercase tracking-wider"
              style={{
                background: isLight ? "rgba(201, 162, 39, 0.12)" : "rgba(214, 255, 98, 0.14)",
                color: isLight ? "#8a660a" : "#d6ff62",
              }}
            >
              Live Overview
            </span>
          </div>
          <p className="text-xs font-editorial mt-0.5" style={{ color: isLight ? "#435066" : "#a0aec0" }}>
            See real-time cash flow, AI ledger insights, and portfolio performance in one place.
          </p>
        </div>

        <div className="flex items-center gap-3 font-figure text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
            style={{
              borderColor: isLight ? "#dfd9cc" : "rgba(255, 255, 255, 0.1)",
              background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)",
              color: isLight ? "#0f1b33" : "#ffffff",
            }}>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>FinScore: <strong style={{ color: isLight ? "#8a660a" : "#d6ff62" }}>74</strong>/100</span>
          </div>
        </div>
      </div>

      {/* Metrics Row (Income, Outcome, and Card/Portfolio Preview) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-5 items-stretch">
        {/* Total Inflow */}
        <div className="sm:col-span-4 rounded-2xl border p-4 flex flex-col justify-between"
          style={{
            borderColor: isLight ? "#dfd9cc" : "rgba(255, 255, 255, 0.08)",
            background: isLight ? "#ffffff" : "rgba(255, 255, 255, 0.02)",
          }}>
          <div className="flex items-center justify-between text-xs font-figure text-ink-soft">
            <span style={{ color: isLight ? "#435066" : "#94a3b8" }}>Total Inflow (Oct)</span>
            <span className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
              <ArrowDownRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="font-figure text-2xl font-bold" style={{ color: isLight ? "#0f1b33" : "#ffffff" }}>
              ₹1,24,000
            </h3>
            <div className="flex items-center gap-1.5 mt-1 font-figure text-[11px] text-emerald-500 font-medium">
              <TrendingUp className="h-3 w-3" />
              <span>+12% vs last month</span>
            </div>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="sm:col-span-4 rounded-2xl border p-4 flex flex-col justify-between"
          style={{
            borderColor: isLight ? "#dfd9cc" : "rgba(255, 255, 255, 0.08)",
            background: isLight ? "#ffffff" : "rgba(255, 255, 255, 0.02)",
          }}>
          <div className="flex items-center justify-between text-xs font-figure text-ink-soft">
            <span style={{ color: isLight ? "#435066" : "#94a3b8" }}>Total Expenses (Oct)</span>
            <span className="p-1.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="font-figure text-2xl font-bold" style={{ color: isLight ? "#0f1b33" : "#ffffff" }}>
              ₹48,200
            </h3>
            <div className="flex items-center gap-1.5 mt-1 font-figure text-[11px] font-medium" style={{ color: isLight ? "#b45309" : "#fbbf24" }}>
              <span>38% Savings Rate retained</span>
            </div>
          </div>
        </div>

        {/* Portfolio & Assets Quick Summary */}
        <div className="sm:col-span-4 rounded-2xl border p-4 flex flex-col justify-between relative overflow-hidden"
          style={{
            borderColor: isLight ? "rgba(180, 120, 24, 0.35)" : "rgba(214, 255, 98, 0.25)",
            background: isLight
              ? "linear-gradient(135deg, rgba(217, 146, 27, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)"
              : "linear-gradient(135deg, rgba(214, 255, 98, 0.06) 0%, rgba(13, 17, 23, 0.4) 100%)",
          }}>
          <div className="flex items-center justify-between text-xs font-figure">
            <span style={{ color: isLight ? "#0f1b33" : "#ffffff" }}>Investments & Assets</span>
            <CreditCard className="h-3.5 w-3.5" style={{ color: isLight ? "#b47818" : "#d6ff62" }} />
          </div>
          <div className="mt-2">
            <h3 className="font-figure text-2xl font-bold" style={{ color: isLight ? "#0f1b33" : "#ffffff" }}>
              ₹2,40,450
            </h3>
            <p className="font-figure text-[10px] mt-1 text-ink-soft" style={{ color: isLight ? "#435066" : "#94a3b8" }}>
              Stocks · Mutual Funds · Gold · FDs
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Hero Section Component ────────────────────────────────────────── */
export default function HeroSection() {
  const ref = useRef(null);
  const { theme } = useTheme();
  const isLight = theme === "light";

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rawOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const rawY       = useTransform(scrollYProgress, [0, 0.65], [0, -60]);
  const sphereY    = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const heroOpacity = useSpring(rawOpacity, { stiffness: 90, damping: 28 });
  const heroY       = useSpring(rawY,       { stiffness: 90, damping: 28 });

  return (
    <section
      ref={ref}
      className="hero-section relative min-h-0 sm:min-h-[92svh] overflow-hidden flex flex-col justify-start items-center transition-colors duration-300"
      style={{
        backgroundColor: isLight ? "#f6f4ef" : "#080b12",
        color: isLight ? "#0f1b33" : "#ffffff",
      }}
    >
      {/* ── Signature Large 3D Sculptural Half Sphere Dome (Full Desktop & Mobile Span) ── */}
      <motion.div
        className="absolute top-0 inset-x-0 w-full pointer-events-none z-0 flex justify-center items-center overflow-hidden h-[560px] sm:h-[650px] lg:h-[720px]"
        style={{ y: sphereY }}
        aria-hidden="true"
      >
        <SahariarSphere className="w-full h-full" />
      </motion.div>

      {/* ── Atmospheric Radial Backlight across full viewport width ── */}
      <div
        className="absolute top-0 inset-x-0 pointer-events-none z-[1] w-full h-[520px] sm:h-[600px] lg:h-[680px] opacity-60 blur-3xl transition-opacity duration-500 overflow-hidden"
        style={{
          background: isLight
            ? "radial-gradient(ellipse 100% 70% at 50% 20%, rgba(201, 162, 39, 0.28) 0%, rgba(214, 255, 98, 0.14) 45%, transparent 75%)"
            : "radial-gradient(ellipse 100% 70% at 50% 20%, rgba(214, 255, 98, 0.35) 0%, rgba(201, 162, 39, 0.16) 45%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      {/* ── Hero Foreground Content ── */}
      <motion.div
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 w-full max-w-5xl px-6 pt-24 sm:pt-28 lg:pt-32 pb-8 sm:pb-12 flex flex-col items-center text-center"
      >
        {/* Eyebrow Pill */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 mb-5 backdrop-blur-md shadow-xs transition-colors"
          style={{
            borderColor: isLight ? "#dfd9cc" : "rgba(255, 255, 255, 0.14)",
            background: isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(13, 17, 23, 0.6)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: isLight ? "#b47818" : "#d6ff62" }} />
          <span
            className="font-figure text-[11px] uppercase tracking-[0.2em] font-semibold"
            style={{ color: isLight ? "#0f1b33" : "rgba(255, 255, 255, 0.9)" }}
          >
            Indian Personal Finance · Reimagined
          </span>
        </motion.div>

        {/* Central Display Headline (SAHARIAR Reference Proportions) */}
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="font-screamer text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.96] max-w-4xl"
          style={{
            fontFamily: "var(--font-display)",
            color: isLight ? "#0f1b33" : "#ffffff",
          }}
        >
          Your Money.
          <br />
          Your Complete Financial Picture.
        </motion.h1>

        {/* Supporting Editorial Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="font-editorial text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mt-4 mb-7"
          style={{
            color: isLight ? "#435066" : "rgba(255, 255, 255, 0.75)",
          }}
        >
          Understand your spending, track your investments, manage your goals, and make smarter
          financial decisions — all in one place.
        </motion.p>

        {/* Primary and Secondary Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.46, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-4 mb-9 sm:mb-11"
        >
          <Link href="/signup">
            <Button
              variant="accent"
              className="btn-horizon-hero px-8 py-4 font-screamer uppercase tracking-widest text-sm rounded-full shadow-xl hover:scale-105 transition-transform"
              style={{
                boxShadow: isLight
                  ? "0 10px 25px -5px rgba(201, 162, 39, 0.3)"
                  : "0 10px 30px -5px rgba(214, 255, 98, 0.35)",
              }}
            >
              Get Started
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="border px-7 py-4 text-sm font-medium rounded-full flex items-center gap-2 transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                borderColor: isLight ? "#dfd9cc" : "rgba(255, 255, 255, 0.2)",
                color: isLight ? "#0f1b33" : "#ffffff",
                background: isLight ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.03)",
              }}
            >
              <span>Explore FinSight</span>
              <ArrowRight className="h-4 w-4 opacity-70" />
            </Button>
          </Link>
        </motion.div>

        {/* Wealth at a Glance Preview Card (Bottom Anchor of Hero) */}
        <WealthPreviewCard isLight={isLight} />
      </motion.div>

      {/* ── Smooth Bottom Gradient Fade into Page ── */}
      <div
        className="absolute inset-x-0 bottom-0 z-[2] h-14 pointer-events-none transition-colors duration-300"
        style={{
          background: isLight
            ? "linear-gradient(to bottom, transparent, var(--color-paper))"
            : "linear-gradient(to bottom, transparent, var(--color-paper))",
        }}
      />
    </section>
  );
}
