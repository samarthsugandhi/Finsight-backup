"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Smartphone, Monitor, Tablet, Download, Zap, WifiOff, Shield } from "lucide-react";
import InstallButton from "@/components/InstallButton";

/* ─── Animated mock device frames ─────────────────────────────────── */
function PhoneMockup({ delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -4 }}
      whileInView={{ opacity: 1, y: 0, rotate: -4 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-5%" }}
      whileHover={{ rotate: 0, y: -6, transition: { duration: 0.4 } }}
      className="relative"
      style={{ transformOrigin: "bottom center" }}
    >
      {/* Phone shell */}
      <div
        className="relative w-36 sm:w-44 rounded-[2.4rem] border-2 overflow-hidden shadow-2xl"
        style={{
          borderColor: "var(--color-line)",
          background: "var(--color-paper-raised)",
          aspectRatio: "9/19.5",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-20 rounded-b-2xl z-10"
          style={{ background: "var(--color-ink)" }}
        />
        {/* Screen content */}
        <div className="p-3 pt-8 space-y-2">
          <div className="rounded-xl p-2.5" style={{ background: "var(--color-horizon-dim)" }}>
            <div className="text-[8px] font-figure uppercase tracking-widest mb-1" style={{ color: "var(--color-horizon)" }}>
              FinScore
            </div>
            <div className="font-screamer text-2xl" style={{ color: "var(--color-ink)" }}>74/100</div>
            <div className="text-[7px]" style={{ color: "var(--color-ink-soft)" }}>Composite · Audit Grade</div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Cash Inflow", val: "₹1.24L", color: "#22c55e" },
              { label: "Expenses", val: "₹48.2K", color: "#f59e0b" },
              { label: "Savings", val: "₹75.8K", color: "var(--color-horizon)" },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg px-2 py-1.5"
                style={{ background: "var(--color-paper)" }}
              >
                <span className="text-[8px]" style={{ color: "var(--color-ink-soft)" }}>{label}</span>
                <span className="text-[9px] font-bold" style={{ color }}>{val}</span>
              </div>
            ))}
          </div>
          {/* Mini chart bars */}
          <div className="flex items-end gap-0.5 h-8 mt-2">
            {[0.5, 0.7, 0.4, 0.9, 0.6, 0.8, 1].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ background: "var(--color-horizon)", opacity: 0.3 + h * 0.5 }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: h }}
                transition={{ delay: delay + 0.5 + i * 0.05, duration: 0.4 }}
                viewport={{ once: true }}
              />
            ))}
          </div>
          {/* Micro Guide Indicator matching theme */}
          <div className="flex items-center justify-between pt-1">
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-horizon/40 text-[7px]"
              style={{ background: "var(--color-paper-raised)", color: "var(--color-horizon)" }}
            >
              <span className="font-screamer font-bold">?</span>
              <span className="font-editorial text-[6px]" style={{ color: "var(--color-ink)" }}>Guide</span>
            </div>
            <div className="text-[6px] font-mono opacity-60" style={{ color: "var(--color-ink-soft)" }}>FinSight App</div>
          </div>
        </div>
        {/* Home indicator */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-14 rounded-full"
          style={{ background: "var(--color-ink)", opacity: 0.3 }}
        />
      </div>
    </motion.div>
  );
}

function TabletMockup({ delay = 0.1 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-5%" }}
      whileHover={{ y: -4, transition: { duration: 0.4 } }}
    >
      <div
        className="relative w-56 sm:w-72 rounded-[1.6rem] border-2 overflow-hidden shadow-2xl"
        style={{
          borderColor: "var(--color-line)",
          background: "var(--color-paper-raised)",
          aspectRatio: "4/3",
        }}
      >
        {/* Camera dot */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-ink)", opacity: 0.4 }}
        />
        {/* Screen */}
        <div className="p-3 pt-5 grid grid-cols-2 gap-2">
          {[
            { title: "Portfolio", value: "₹2.4L", sub: "+12.3%" },
            { title: "Goals", value: "3/5", sub: "On track" },
            { title: "SIP", value: "₹8K/mo", sub: "Active" },
            { title: "FD", value: "₹60K", sub: "7.2% p.a." },
          ].map(({ title, value, sub }) => (
            <div
              key={title}
              className="rounded-xl p-2.5 border border-line shadow-xs"
              style={{ background: "var(--color-paper-raised)" }}
            >
              <div className="text-[8px] font-figure uppercase tracking-wider mb-0.5" style={{ color: "var(--color-ink-soft)" }}>
                {title}
              </div>
              <div className="text-sm font-screamer" style={{ color: "var(--color-ink)" }}>{value}</div>
              <div className="text-[8px] font-medium" style={{ color: "var(--color-horizon)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function DesktopMockup({ delay = 0.2 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: 3 }}
      whileInView={{ opacity: 1, y: 0, rotate: 3 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-5%" }}
      whileHover={{ rotate: 0, y: -6, transition: { duration: 0.4 } }}
      className="relative hidden sm:block"
      style={{ transformOrigin: "bottom center" }}
    >
      {/* Monitor */}
      <div
        className="relative w-44 rounded-t-xl border-2 overflow-hidden shadow-2xl"
        style={{
          borderColor: "var(--color-line)",
          background: "var(--color-paper-raised)",
          aspectRatio: "16/10",
        }}
      >
        {/* Menu bar */}
        <div
          className="flex items-center gap-1 px-2 py-1"
          style={{ background: "var(--color-ink)", opacity: 0.95 }}
        >
          {["#ff5f57","#febc2e","#28c840"].map((c) => (
            <div key={c} className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        {/* Content */}
        <div className="p-2 space-y-1.5">
          <div
            className="rounded-lg p-1.5"
            style={{ background: "var(--color-horizon-dim)" }}
          >
            <div className="text-[6px] font-figure uppercase tracking-widest" style={{ color: "var(--color-horizon)" }}>
              Net Worth · Live
            </div>
            <div className="font-screamer text-sm" style={{ color: "var(--color-ink)" }}>₹4.84L</div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {["Stocks","MF","Gold"].map((l) => (
              <div key={l} className="rounded px-1 py-0.5 text-center" style={{ background: "var(--color-paper)" }}>
                <div className="text-[6px]" style={{ color: "var(--color-ink-soft)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Stand */}
      <div className="flex justify-center">
        <div className="h-3 w-10 rounded-b-sm" style={{ background: "var(--color-line)" }} />
      </div>
      <div className="h-1.5 w-24 mx-auto rounded-full" style={{ background: "var(--color-line)" }} />
    </motion.div>
  );
}

/* ─── Feature pill ─────────────────────────────────────────────────── */
function FeaturePill({ icon: Icon, text, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
      style={{
        background: "var(--color-paper-raised)",
        border: "1px solid var(--color-line)",
        color: "var(--color-ink)",
      }}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-horizon)" }} />
      {text}
    </motion.div>
  );
}

/* ─── Platform tab ─────────────────────────────────────────────────── */
const platforms = [
  { id: "mobile", icon: Smartphone, label: "Mobile", desc: "Android · iOS" },
  { id: "tablet", icon: Tablet, label: "Tablet", desc: "iPad · Android" },
  { id: "desktop", icon: Monitor, label: "Desktop", desc: "Mac · Windows · Linux" },
];

/* ─── Main section ─────────────────────────────────────────────────── */
export default function InstallSection() {
  const ref = useRef(null);
  const [activeTab, setActiveTab] = useState("mobile");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 25 });
  const bgY = useTransform(smooth, [0, 1], ["0%", "-15%"]);
  const glowOpacity = useTransform(smooth, [0.1, 0.5], [0.0, 0.7]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-20 sm:py-28 border-t"
      style={{ borderColor: "var(--color-line)" }}
    >
      {/* Parallax background glow */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y: bgY, opacity: glowOpacity }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 60%, var(--color-horizon-dim) 0%, transparent 70%)",
          }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="font-figure text-xs uppercase tracking-[0.3em] mb-3 font-semibold text-center"
          style={{ color: "var(--color-horizon)" }}
        >
          Get the App
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="font-screamer text-4xl sm:text-5xl lg:text-6xl text-center leading-none mb-4 tracking-tight"
          style={{ color: "var(--color-ink)" }}
        >
          YOUR MONEY.
          <br />
          <span style={{ color: "var(--color-horizon)" }}>EVERY DEVICE.</span>
        </motion.h2>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="font-editorial text-base sm:text-lg text-center leading-relaxed mx-auto max-w-xl mb-10"
          style={{ color: "var(--color-ink-soft)" }}
        >
          Install FinSight on any device — phone, tablet, or computer. No app store.
          No download wait. Just tap and it&apos;s there.
        </motion.p>

        {/* Platform tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          viewport={{ once: true }}
          className="flex justify-center mb-12"
        >
          <div
            className="inline-flex rounded-2xl p-1 gap-1"
            style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-line)" }}
          >
            {platforms.map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: activeTab === id ? "#0f1b33" : "var(--color-ink-soft)",
                }}
              >
                {activeTab === id && (
                  <motion.div
                    layoutId="platform-tab-bg"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "var(--color-horizon)" }}
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label}</span>
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Device mockup trio */}
        <div className="flex items-end justify-center gap-4 sm:gap-8 mb-14">
          <AnimatePresence mode="popLayout">
            {activeTab === "mobile" && (
              <motion.div
                key="mobile-devices"
                className="flex items-end justify-center gap-4 sm:gap-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
              >
                <PhoneMockup delay={0} />
                <PhoneMockup delay={0.1} />
              </motion.div>
            )}
            {activeTab === "tablet" && (
              <motion.div
                key="tablet-devices"
                className="flex items-end justify-center gap-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
              >
                <TabletMockup delay={0} />
              </motion.div>
            )}
            {activeTab === "desktop" && (
              <motion.div
                key="desktop-devices"
                className="flex items-end justify-center gap-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
              >
                <PhoneMockup delay={0.05} />
                <TabletMockup delay={0} />
                <DesktopMockup delay={0.1} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-3 mb-10"
        >
          <FeaturePill icon={Zap} text="Instant load — no spinner" delay={0.0} />
          <FeaturePill icon={WifiOff} text="Works offline" delay={0.05} />
          <FeaturePill icon={Shield} text="Data stays on your device" delay={0.1} />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <InstallButton variant="cta" />
          <p className="text-xs font-figure" style={{ color: "var(--color-ink-soft)" }}>
            Free · No app store · Instant · Cross-platform
          </p>
        </motion.div>
      </div>
    </section>
  );
}

