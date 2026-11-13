"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileSpreadsheet,
  ShieldAlert,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

/**
 * Advanced SaaS Bento Grid for FinSight Core Capabilities:
 * - FinAI Assistant (Interactive scenario questions & contextual streaming)
 * - Statement Ingestion (Laser-scanned OCR + human-reviewed queue)
 * - FinScore Health (Multi-metric radial gauge with interactive component drill-down)
 * - Investments & Drift (Target vs Current asset allocation with rebalance preview)
 */

/* ── Interactive Feature Visual 1: FinAI Scenario Engine ──────────── */
function FinAIVisual() {
  const [activeIdx, setActiveIdx] = useState(0);

  const scenarios = [
    {
      tab: "Cash Flow",
      q: "Where did my cash go this month?",
      a: "₹42,300 across 32 transactions. Largest outflow was Rent (₹24k) followed by Dining (₹8.3k).",
      metric: "Savings rate: 38%",
    },
    {
      tab: "Affordability",
      q: "Can I buy a ₹65,000 MacBook without touching emergency funds?",
      a: "Yes. Post-purchase buffer remains ₹84,200 (4.2 months runway). Discretionary fund absorbs this cleanly.",
      metric: "Safe to purchase ✓",
    },
    {
      tab: "SIP Goal",
      q: "How much monthly SIP for my ₹1.2L Goa trip in 8 months?",
      a: "₹14,500/mo in liquid debt fund @ 6.8% CAGR will reach ₹1.21L by November.",
      metric: "Target on track",
    },
  ];

  const current = scenarios[activeIdx];

  return (
    <div
      className="relative rounded-2xl p-4 flex flex-col justify-between border min-h-[175px]"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-line)",
      }}
    >
      {/* Scenario Pill Switcher */}
      <div className="flex items-center gap-1.5 pb-2 border-b overflow-x-auto" style={{ borderColor: "var(--color-line)" }}>
        {scenarios.map((s, idx) => (
          <button
            key={s.tab}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className="px-2.5 py-1 rounded-full text-[10px] font-figure font-medium transition-all cursor-pointer whitespace-nowrap"
            style={{
              background:
                activeIdx === idx
                  ? "var(--color-horizon)"
                  : "color-mix(in srgb, var(--color-paper-raised) 80%, transparent)",
              color: activeIdx === idx ? "#05080f" : "var(--color-ink-soft)",
              border: `1px solid ${activeIdx === idx ? "var(--color-horizon)" : "var(--color-line)"}`,
              fontWeight: activeIdx === idx ? 600 : 500,
            }}
          >
            {s.tab}
          </button>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-1 text-[9px] font-figure text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Local Ollama</span>
        </div>
      </div>

      {/* Dynamic Animated Conversation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="my-2 space-y-2"
        >
          {/* User query bubble */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] rounded-2xl rounded-tr-xs px-3 py-1.5 text-xs font-editorial shadow-xs"
              style={{
                background: "var(--color-horizon)",
                color: "#05080f",
                fontWeight: 600,
              }}
            >
              {current.q}
            </div>
          </div>

          {/* AI Contextual ledger response */}
          <div className="flex justify-start">
            <div
              className="max-w-[92%] rounded-2xl rounded-tl-xs px-3 py-2 text-xs font-editorial border shadow-xs"
              style={{
                background: "var(--color-paper-raised)",
                borderColor: "var(--color-line)",
                color: "var(--color-ink)",
              }}
            >
              <p className="leading-snug">{current.a}</p>
              <div
                className="mt-1.5 inline-flex items-center gap-1 font-figure text-[10px] font-semibold"
                style={{ color: "var(--color-horizon)" }}
              >
                <span>⚡ {current.metric}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Interactive Feature Visual 2: Laser Ingestion Pipeline ───────── */
function StatementVisual() {
  return (
    <div
      className="relative rounded-2xl p-3.5 border min-h-[175px] overflow-hidden flex flex-col justify-between"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-figure font-semibold text-ink">
          <FileSpreadsheet className="h-3.5 w-3.5 text-horizon" />
          <span>HDFC_Bank_Aug2026.pdf</span>
        </div>
        <span
          className="text-[9px] font-figure px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border"
          style={{
            background: "color-mix(in srgb, var(--color-horizon) 15%, transparent)",
            color: "var(--color-horizon)",
            borderColor: "color-mix(in srgb, var(--color-horizon) 40%, transparent)",
          }}
        >
          OCR Scanning
        </span>
      </div>

      {/* Interactive Scan Preview Area */}
      <div className="relative rounded-xl border p-2.5 overflow-hidden" style={{ background: "var(--color-paper-raised)", borderColor: "var(--color-line)" }}>
        {/* Animated Laser Scanning Beam */}
        <motion.div
          animate={{ y: [0, 68, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-x-0 h-0.5 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent, var(--color-horizon), transparent)",
            boxShadow: "0 0 12px var(--color-horizon)",
          }}
        />

        {/* Mock Statement Rows */}
        <div className="space-y-1.5 font-figure text-[10px]">
          <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "var(--color-line)" }}>
            <span className="text-ink font-medium truncate max-w-[140px]">UPI / Swiggy Bangalore</span>
            <span className="font-semibold text-signal-neg">-₹640.00</span>
          </div>
          <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "var(--color-line)" }}>
            <span className="text-ink font-medium truncate max-w-[140px]">NEFT / Salary TechCorp</span>
            <span className="font-semibold text-signal-pos">+₹85,000.00</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink font-medium truncate max-w-[140px]">CHQ / Self Withdrawal</span>
            <span className="text-amber-500 font-semibold">Review Queue ⚠</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-figure" style={{ color: "var(--color-ink-soft)" }}>
        <span className="flex items-center gap-1 text-emerald-500 font-medium">
          <CheckCircle2 className="h-3 w-3" /> 94% rule-matched
        </span>
        <span className="font-semibold text-ink">Human confirmation ready</span>
      </div>
    </div>
  );
}

/* ── Interactive Feature Visual 3: Transparent FinScore ──────────── */
function FinScoreVisual() {
  const [activeMetric, setActiveMetric] = useState(0);

  const metrics = [
    { label: "Savings Rate", score: 25, max: 25, desc: "38% of post-tax income retained" },
    { label: "Runway", score: 23, max: 25, desc: "4.8 months emergency fund liquid" },
    { label: "Debt Ratio", score: 18, max: 20, desc: "Zero high-interest revolving credit" },
    { label: "Investments", score: 14, max: 15, desc: "Target asset allocation balanced" },
  ];

  const totalScore = 74;
  const r = 38;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className="relative rounded-2xl p-3.5 border min-h-[175px] flex flex-col justify-between"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Radial Gauge SVG */}
        <div className="relative shrink-0 w-24 h-24 flex items-center justify-center">
          <svg width="96" height="96" viewBox="0 0 96 96" aria-label="FinScore 74 of 100">
            <circle
              cx="48"
              cy="48"
              r={r}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="7"
              opacity="0.6"
            />
            <motion.circle
              cx="48"
              cy="48"
              r={r}
              fill="none"
              stroke="var(--color-horizon)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              whileInView={{ strokeDashoffset: circ * (1 - totalScore / 100) }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              transform="rotate(-90 48 48)"
            />
            <text
              x="48"
              y="44"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontSize="20"
              fontWeight="bold"
              fill="var(--color-ink)"
            >
              {totalScore}
            </text>
            <text
              x="48"
              y="57"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="8"
              fill="var(--color-ink-soft)"
              letterSpacing="0.5"
            >
              / 100
            </text>
            <text
              x="48"
              y="69"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="6.5"
              fill="var(--color-horizon)"
              letterSpacing="1"
              fontWeight="700"
            >
              HEALTHY
            </text>
          </svg>
        </div>

        {/* Sub-Metric Selector */}
        <div className="flex-1 space-y-1">
          {metrics.map((m, idx) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setActiveMetric(idx)}
              className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-figure transition-all cursor-pointer text-left"
              style={{
                background:
                  activeMetric === idx
                    ? "color-mix(in srgb, var(--color-horizon) 14%, var(--color-paper-raised))"
                    : "transparent",
                border: `1px solid ${activeMetric === idx ? "var(--color-horizon)" : "transparent"}`,
              }}
            >
              <span className="font-medium text-ink truncate">{m.label}</span>
              <span className="font-semibold text-horizon">
                {m.score}/{m.max}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="mt-1 text-[10px] font-figure px-2 py-1 rounded-md border"
        style={{
          background: "var(--color-paper-raised)",
          borderColor: "var(--color-line)",
          color: "var(--color-ink-soft)",
        }}
      >
        <span className="font-semibold text-ink">{metrics[activeMetric].label}: </span>
        {metrics[activeMetric].desc}
      </div>
    </div>
  );
}

/* ── Interactive Feature Visual 4: Target Allocation & Drift ──────── */
function InvestmentVisual() {
  const [showTarget, setShowTarget] = useState(false);

  const holdings = [
    { label: "Equities", current: 67, target: 60, color: "var(--color-horizon)" },
    { label: "Mutual Funds", current: 20, target: 25, color: "#e2a33d" },
    { label: "Gold / SGB", current: 8, target: 10, color: "#d97706" },
    { label: "Fixed Deposit", current: 5, target: 5, color: "#10d98a" },
  ];

  return (
    <div
      className="relative rounded-2xl p-4 border min-h-[175px] flex flex-col justify-between"
      style={{
        background: "var(--color-paper)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5 text-xs font-figure font-semibold text-ink">
          <BarChart3 className="h-3.5 w-3.5 text-horizon" />
          <span>Allocation Balance</span>
        </div>
        <button
          type="button"
          onClick={() => setShowTarget(!showTarget)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-figure font-medium border transition-all cursor-pointer hover:scale-105 active:scale-95"
          style={{
            background: showTarget ? "var(--color-horizon)" : "var(--color-paper-raised)",
            color: showTarget ? "#05080f" : "var(--color-ink)",
            borderColor: showTarget ? "var(--color-horizon)" : "var(--color-line)",
          }}
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>{showTarget ? "Showing: Target" : "Show: Target (Sim)"}</span>
        </button>
      </div>

      {/* Dynamic Animated Bars */}
      <div className="flex items-end gap-3 px-2 pt-2">
        {holdings.map((h, i) => {
          const val = showTarget ? h.target : h.current;
          const drift = h.current - h.target;
          return (
            <div key={h.label} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] font-figure font-bold" style={{ color: h.color }}>
                {val}%
              </span>
              <motion.div
                className="w-full rounded-t-md relative"
                style={{ background: h.color, minHeight: 8 }}
                animate={{ height: val * 1.05 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
              />
              <span className="text-[9px] font-figure truncate max-w-[55px] text-ink-soft text-center">
                {h.label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-2 text-[10px] font-figure flex items-center justify-between pt-1 border-t"
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
      >
        <span>Equities +7% overweight vs model</span>
        <span className="text-horizon font-semibold">FDs & SGB +7% rebalance</span>
      </div>
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
    body: "Natural questions across spending, goals, and investments. FinAI replies with mathematical context from your own ledger — zero generic estimates or cloud telemetry.",
    visual: <FinAIVisual />,
    wide: true,
  },
  {
    id: "statements",
    icon: FileSpreadsheet,
    eyebrow: "Statement Ingestion",
    headline: "From raw bank statement to clean ledger.",
    body: "Upload Indian bank statements, review every transaction row with auto-categorisation rules, and approve before it posts. Human review is never bypassed.",
    visual: <StatementVisual />,
    wide: false,
  },
  {
    id: "finscore",
    icon: ShieldAlert,
    eyebrow: "FinScore Health",
    headline: "A transparent financial health score.",
    body: "Weighted components — savings rate, debt load, emergency reserve — show you exactly which metrics need attention, with zero opaque algorithms.",
    visual: <FinScoreVisual />,
    wide: false,
  },
  {
    id: "investments",
    icon: BarChart3,
    eyebrow: "Investments Tracker",
    headline: "Stocks, MFs, Gold, and FDs — in one place.",
    body: "Track holdings, record buy/sell transactions, and monitor allocation drift against your personal targets with precision paise reconciliation.",
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
      transition={{ delay: (index % 2) * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
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
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, color-mix(in srgb, var(--color-horizon) 12%, transparent), transparent 80%)`,
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
          <IconComponent className="h-4 w-4" style={{ color: "var(--color-horizon)" }} />
          <p
            className="font-figure text-[11px] uppercase tracking-[0.2em] font-semibold"
            style={{ color: "var(--color-horizon)" }}
          >
            {feature.eyebrow}
          </p>
        </div>
        <h3
          className="font-screamer text-2xl uppercase tracking-wide mb-2 transition-colors group-hover:text-horizon"
          style={{ color: "var(--color-ink)" }}
        >
          {feature.headline}
        </h3>
        <p className="font-editorial text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {feature.body}
        </p>
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
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 mb-3 text-[11px] font-figure uppercase tracking-widest font-semibold"
          style={{
            background: "color-mix(in srgb, var(--color-horizon) 14%, transparent)",
            color: "var(--color-horizon)",
            borderColor: "color-mix(in srgb, var(--color-horizon) 30%, transparent)",
          }}
        >
          <Sparkles className="h-3 w-3" />
          <span>Architected for India</span>
        </div>
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
