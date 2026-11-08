"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Button } from "@/components/ui";
import Logo from "@/components/Logo";
import CoinLoader from "@/components/landing/CoinLoader";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import ScrollStory from "@/components/landing/ScrollStory";
import FeatureBento from "@/components/landing/FeatureBento";

/* ─────────────────────────────────────────────────────────────────── */
/* Closing CTA Section                                                 */
/* ─────────────────────────────────────────────────────────────────── */
function ClosingCTA() {
  const ctaRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 85, damping: 25 });
  const auraScale = useTransform(smooth, [0.1, 0.6], [0.75, 1.25]);
  const auraOpacity = useTransform(smooth, [0.1, 0.45], [0.2, 0.65]);

  return (
    <section ref={ctaRef} className="relative overflow-hidden py-16 sm:py-20 border-t" style={{ borderColor: "var(--color-line)" }}>
      {/* Background dynamic expanding glow portal */}
      <motion.div
        style={{ scale: auraScale, opacity: auraOpacity }}
        className="absolute inset-0 pointer-events-none"
      >
        <div
          className="w-full h-full"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, var(--color-horizon-dim) 0%, rgba(201, 162, 39, 0.12) 40%, transparent 75%)",
          }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-10% 0px" }}
        >
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="font-figure text-xs uppercase tracking-[0.3em] mb-3 sm:mb-4 font-semibold"
            style={{ color: "var(--color-horizon)" }}
          >
            Start your financial journey
          </motion.p>
          <h2
            className="font-screamer text-5xl leading-none sm:text-6xl lg:text-7xl mb-4 sm:mb-5 tracking-tight"
            style={{ color: "var(--color-ink)" }}
          >
            TAKE CONTROL.
            <br />
            SEE THE WHOLE PICTURE.
          </h2>
          <p
            className="font-editorial text-base sm:text-lg leading-relaxed mx-auto max-w-xl mb-8"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Start with statement-backed data, connect your goals and investments,
            and let FinAI explain what changed and why.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                variant="accent"
                className="btn-horizon-hero px-8 py-4 font-screamer uppercase tracking-widest text-base shadow-xl hover:scale-105 transition-transform"
              >
                Create your FinSight account
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="ghost"
                className="border px-8 py-4 text-sm font-medium rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
              >
                Sign in to existing account →
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Clean Institutional Footer                                          */
/* ─────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t px-6 py-8 sm:py-10 font-editorial" style={{ borderColor: "var(--color-line)", background: "var(--color-paper)" }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo className="h-7 w-7" />
          <span className="font-screamer text-lg tracking-widest" style={{ color: "var(--color-horizon)" }}>
            FinSight
          </span>
          <span className="text-xs font-figure text-ink-soft opacity-60">| INR-Native Financial Intelligence</span>
        </div>
        <div className="flex gap-6 text-sm" style={{ color: "var(--color-ink-soft)" }}>
          <Link href="/login" className="hover:underline transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="hover:underline transition-colors">
            Sign up
          </Link>
          <Link href="/dashboard" className="hover:underline transition-colors">
            Dashboard
          </Link>
          <Link href="/dashboard/bank-statements" className="hover:underline transition-colors">
            Statement Parser
          </Link>
        </div>
        <p className="text-xs font-figure" style={{ color: "var(--color-ink-soft)", opacity: 0.6 }}>
          © {new Date().getFullYear()} FinSight Technologies. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Thin Horizontal Accent Divider                                      */
/* ─────────────────────────────────────────────────────────────────── */
function HorizonRule() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="horizon-rule" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main Landing Page                                                   */
/* ─────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [showLoader, setShowLoader] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /* Show coin loader on first visit this browser session */
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setLoaderDone(true);
      return;
    }
    const seen = sessionStorage.getItem("finsight-intro-seen");
    if (!seen) {
      setShowLoader(true);
      sessionStorage.setItem("finsight-intro-seen", "1");
    } else {
      setLoaderDone(true);
    }
  }, []);

  /* Track scroll position for sticky nav styling */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLoaderComplete() {
    setShowLoader(false);
    setLoaderDone(true);
  }

  return (
    <>
      {/* 3D Golden Medallion Loader (first visit) */}
      {showLoader && <CoinLoader onComplete={handleLoaderComplete} />}

      {/* Main Page Content */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        {/* Floating Top Navigation */}
        <LandingNav scrolled={scrolled} />

        {/* Hero Section with Converging Canvas & Clip Typography */}
        <HeroSection />

        {/* Cinematic Scroll Story (Scenes 1 - 4) */}
        <ScrollStory />

        <HorizonRule />

        {/* Asymmetric Capabilities Bento */}
        <FeatureBento />

        {/* Closing CTA */}
        <ClosingCTA />

        {/* Footer */}
        <Footer />
      </main>
    </>
  );
}
