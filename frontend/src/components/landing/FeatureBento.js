"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, FileSpreadsheet, ShieldAlert, BarChart3, ArrowRight } from "lucide-react";

/**
 * Editorial asymmetric bento grid for the 4 core features.
 * Features strictly limited to implemented capabilities in FinSight:
 * - FinAI Assistant
 * - Statement Processing (OCR + Review Queue)
 * - FinScore (Transparent Weighted Metric)
 * - Investments & Target Allocation Drift
 */

/* ── Interactive Feature Visuals ──────────────────────────────────── */

function FinAIVisual() {
  return (
    <div className="relative h-36 overflow-hidden rounded-xl p-4 flex flex-col justify-between" style={{ background: "var(--color-paper)" }}>
      {/* User query bubble */}
      <div
        className="self-end max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs font-editorial shadow-xs"
        style={{
          background: "var(--color-horizon)",
          color: "#05080f",
          fontWeight: 500,
        }}
      >
        Where did my cash go this month?
      </div>

      {/* AI Contextual ledger response */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        viewport={{ once: true }}
        className="self-start max-w-[90%] rounded-2xl rounded-tl-sm px-3.5 py-2 text-xs font-editorial border shadow-xs"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
          color: "var(--color-ink-soft)",
        }}
      >
        <span className="text-ink font-semibold">₹42,300 across 32 transactions.</span> Largest outflow was Rent (₹24k) followed by Dining (₹8.3k).
      </motion.div>
    </div>
  );
}

function StatementVisual() {
  return (
    <div className="relative h-36 overflow-hidden rounded-xl p-3" style={{ background: "var(--color-paper)" }}>
      <svg viewBox="0 0 280 120" className="w-full h-full overflow-visible" aria-hidden="true">
        {/* Bank statement document mockup */}
        <rect x="8" y="8" width="94" height="104" rx="8" fill="var(--color-paper-raised)" stroke="var(--color-line)" strokeWidth="1.2" />
        <rect x="18" y="18" width="40" height="5" rx="2" fill="var(--color-horizon)" opacity="0.8" />
        {["32", "46", "60", "74", "88"].map((y, i) => (
          <rect key={i} x="18" y={y} width={i % 2 === 0 ? 70 : 55} height="5" rx="2" fill="var(--color-line)" />
        ))}

        {/* Guided flow dashed path */}
        <path d="M106 60 Q 130 60, 148 35" fill="none" stroke="var(--color-horizon)" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M106 60 Q 130 60, 148 85" fill="none" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Result 1: Approved ledger pill */}
        <rect x="150" y="22" width="122" height="26" rx="6" fill="var(--color-paper-raised)" stroke="var(--color-line)" strokeWidth="1" />
        <circle cx="162" cy="35" r="3" fill="#10d98a" />
        <text x="172" y="38" fontSize="8" fill="var(--color-ink)" fontFamily="monospace" fontWeight="600">3 Verified · Ledger</text>

        {/* Result 2: Review queue pill */}
        <rect x="150" y="72" width="122" height="26" rx="6" fill="rgba(201,162,39,0.12)" stroke="rgba(201,162,39,0.4)" strokeWidth="1" />
        <circle cx="162" cy="85" r="3" fill="#c9a227" />
        <text x="172" y="88" fontSize="8" fill="#e5c76b" fontFamily="monospace" fontWeight="600">2 Review Queue ⚠</text>
      </svg>
    </div>
  );
}

function FinScoreVisual() {
  const r = 36;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-36 flex items-center justify-center rounded-xl" style={{ background: "var(--color-paper)" }}>
      <svg width="130" height="130" viewBox="0 0 130 130" aria-label="Illustrative FinScore">
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--color-line)" strokeWidth="8" opacity="0.6" />
        <motion.circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke="var(--color-horizon)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ * 0.26 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
          transform="rotate(-90 65 65)"
        />
        <text x="65" y="59" textAnchor="middle" fontFamily="var(--font-display)" fontSize="24" fill="var(--color-ink)">74</text>
        <text x="65" y="73" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-ink-soft)" letterSpacing="1">/ 100</text>
        <text x="65" y="86" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="var(--color-horizon)" letterSpacing="2">HEALTHY</text>
      </svg>
    </div>
  );
}

function InvestmentVisual() {
  const holdings = [
    { label: "Equities", current: 67, target: 60, color: "var(--color-horizon)" },
    { label: "MF", current: 25, target: 25, color: "#c9a227" },
    { label: "Gold", current: 15, target: 15, color: "#e5c76b" },
    { label: "Fixed Dep", current: 8, target: 15, color: "#10d98a" },
  ];
  return (
    <div className="relative h-36 overflow-hidden rounded-xl flex items-end gap-3 px-6 pb-4 pt-4" style={{ background: "var(--color-paper)" }}>
      {holdings.map((h, i) => (
        <div key={h.label} className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-[9px] font-figure font-semibold" style={{ color: h.color }}>
            {h.current}%
          </span>
          <motion.div
            className="w-full rounded-t-md relative"
            style={{ background: h.color, minHeight: 6 }}
            initial={{ height: 0 }}
            whileInView={{ height: h.current * 0.85 }}
            transition={{ delay: i * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
          />
          <span className="text-[9px] font-figure truncate max-w-[50px]" style={{ color: "var(--color-ink-soft)" }}>
            {h.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Feature Specifications ────────────────────────────────────────── */
const FEATURES = [
  {
    id: "finai",
    icon: Sparkles,
    eyebrow: "FinAI Assistant",
    headline: "Ask anything. Get answers from your ledger.",
    body: "Natural questions across spending, goals, and investments. FinAI replies with context from your own ledger — zero generic estimates.",
    visual: <FinAIVisual />,
    wide: true,
  },
  {
    id: "statements",
    icon: FileSpreadsheet,
    eyebrow: "Statement Ingestion",
    headline: "From bank statement to clean ledger.",
    body: "Upload Indian bank statements, review every transaction row, and approve before it posts. Human review is never bypassed.",
    visual: <StatementVisual />,
    wide: false,
  },
  {
    id: "finscore",
    icon: ShieldAlert,
    eyebrow: "FinScore Health",
    headline: "A transparent financial health score.",
    body: "Weighted components — savings rate, debt load, emergency reserve — show you exactly which metrics need attention.",
    visual: <FinScoreVisual />,
    wide: false,
  },
  {
    id: "investments",
    icon: BarChart3,
    eyebrow: "Investments Tracker",
    headline: "Stocks, MFs, Gold, and FDs — in one place.",
    body: "Manually track holdings, record buy/sell transactions, and monitor allocation drift against your personal targets.",
    visual: <InvestmentVisual />,
    wide: true,
  },
];

function BentoCard({ feature, index }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, active: false });
  const IconComponent = feature.icon;

  function handleMouseMove(e) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  }

  function handleMouseLeave() {
    setMousePos((prev) => ({ ...prev, active: false }));
  }

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 35, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: (index % 2) * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-6% 0px" }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={`rounded-3xl border p-6 sm:p-7 flex flex-col justify-between gap-6 transition-all relative overflow-hidden group shadow-lg ${
        feature.wide ? "lg:col-span-7" : "lg:col-span-5"
      }`}
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-paper-raised)",
      }}
    >
      {/* Interactive Cursor Spotlight Glow */}
      {mousePos.active && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(214, 255, 98, 0.08), transparent 80%)`,
          }}
        />
      )}

      {/* Top ambient highlight on hover */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, var(--color-horizon), transparent)" }}
      />

      {/* Visual preview */}
      <div className="relative z-10">{feature.visual}</div>

      {/* Text content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2.5">
          <IconComponent className="h-4 w-4 text-horizon" />
          <p className="font-figure text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--color-horizon)" }}>
            {feature.eyebrow}
          </p>
        </div>
        <h3 className="font-screamer text-2xl uppercase tracking-wide mb-2 text-ink group-hover:text-horizon transition-colors">
          {feature.headline}
        </h3>
        <p className="font-editorial text-sm leading-relaxed text-ink-soft">
          {feature.body}
        </p>

        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs font-figure text-ink-soft opacity-70 group-hover:opacity-100 transition-opacity" style={{ borderColor: "var(--color-line)" }}>
          <span>Explore architecture</span>
          <ArrowRight className="h-3.5 w-3.5 text-horizon transform group-hover:translate-x-1.5 transition-transform" />
        </div>
      </div>
    </motion.article>
  );
}

export default function FeatureBento() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true, margin: "-8% 0px" }}
        className="mb-8 sm:mb-10 text-center sm:text-left"
      >
        <p className="font-figure text-xs uppercase tracking-[0.25em] mb-2.5" style={{ color: "var(--color-horizon)" }}>
          Core capabilities
        </p>
        <h2 className="font-screamer text-4xl sm:text-5xl lg:text-6xl" style={{ color: "var(--color-ink)" }}>
          Built for how Indian
          <br />
          finance actually works.
        </h2>
      </motion.div>

      {/* Asymmetric bento grid with scroll trigger animations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {FEATURES.map((f, i) => (
          <BentoCard key={f.id} feature={f} index={i} />
        ))}
      </div>
    </section>
  );
}
