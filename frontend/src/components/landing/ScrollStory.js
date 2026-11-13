"use client";

import { useRef, useState } from "react";
import {
  motion,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Cpu,
  Layers,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Check,
  Zap,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

/* ═══════════════════════════════════════════════════════════════════ */
/* Scene A — Financial Clarity & Three Pillars                         */
/* ═══════════════════════════════════════════════════════════════════ */
function SceneIntro() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [activePillar, setActivePillar] = useState(null);

  const pillars = [
    {
      id: "inr",
      title: "INR-native by default",
      tag: "Currency & Context",
      badge: "₹ INR Native",
      body: "Rupee-first formatting, Indian financial year awareness, and first-class handling of UPI, NEFT, and IMPS transaction flows.",
      accent: isLight ? "#b47818" : "#d6ff62",
      stat: "100% Indian Banking Native",
      detail: "Handles Lakhs & Crores notation (₹12,40,000), IFSC resolution, and UPI VPA vendor parsing with zero Americanization.",
      icon: Receipt,
    },
    {
      id: "dual",
      title: "Statement-first onboarding",
      tag: "Verification First",
      badge: "Dual-Pass Engine",
      body: "Upload Indian bank statements, inspect every row with auto-categorisation, and review before permanent posting to the ledger.",
      accent: isLight ? "#92400e" : "#c9a227",
      stat: "Zero Auto-Posting Errors",
      detail: "Rule-based deterministic tokenizer matches 94% of recurring merchants; ambiguous transfers await your explicit one-click approval.",
      icon: Layers,
    },
    {
      id: "transparent",
      title: "Transparent FinScore",
      tag: "Zero Black Boxes",
      badge: "Audit Grade",
      body: "Every metric, ratio, and advisor recommendation is mathematically traceable back to verified rows in your personal ledger.",
      accent: isLight ? "#15803d" : "#d6ff62",
      stat: "74 / 100 Live Composite",
      detail: "Weighted formula balancing Savings Rate (25%), Emergency Runway (25%), Debt DTI (20%), Asset Mix (15%), and Cash-flow Stability (15%).",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16 relative">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true, margin: "-8% 0px" }}
        className="text-center mb-10 sm:mb-12"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 mb-3 text-[11px] font-figure uppercase tracking-widest font-semibold" style={{ background: "var(--color-horizon-dim)", color: isLight ? "#92400e" : "var(--color-horizon)" }}>
          <Sparkles className="h-3 w-3" />
          <span>Scene 1 — Financial Clarity</span>
        </div>
        <h2
          className="font-screamer text-4xl sm:text-5xl lg:text-6xl leading-tight"
          style={{ color: "var(--color-ink)" }}
        >
          Everything connected,
          <br />
          nothing black-boxed.
        </h2>
        <p
          className="font-editorial mt-4 text-base sm:text-lg leading-relaxed mx-auto max-w-2xl"
          style={{ color: "var(--color-ink-soft)" }}
        >
          FinSight bridges raw bank statement files, transparent financial health scoring,
          and intelligent portfolio tracking into a single unified workspace.
        </p>
      </motion.div>

      {/* Dynamic Animated Connector Beam between Pillars */}
      <div className="relative mb-8 hidden sm:block">
        <div className="h-px w-full relative overflow-hidden" style={{ background: "var(--color-line)" }}>
          <motion.div
            initial={{ width: "0%" }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="h-full"
            style={{
              background: isLight
                ? "linear-gradient(90deg, transparent, #b47818, #d9921b, transparent)"
                : "linear-gradient(90deg, transparent, var(--color-horizon), #c9a227, transparent)",
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {pillars.map((p, i) => {
          const Icon = p.icon;
          const isSelected = activePillar === p.id;
          return (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-6% 0px" }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => setActivePillar(isSelected ? null : p.id)}
              className="rounded-2xl border p-6 flex flex-col justify-between group transition-all relative overflow-hidden backdrop-blur-xs shadow-xs hover:shadow-md cursor-pointer"
              style={{
                borderColor: isSelected ? "var(--color-horizon)" : "var(--color-line)",
                background: "var(--color-paper-raised)",
              }}
            >
              {/* Top ambient highlight on hover */}
              <div
                className="absolute inset-x-0 top-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)` }}
              />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="font-figure text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-semibold"
                    style={{
                      background: "var(--color-horizon-dim)",
                      color: isLight ? "#92400e" : "var(--color-horizon)",
                    }}
                  >
                    {p.tag}
                  </span>
                  <div className="flex items-center gap-1.5 font-figure text-xs font-semibold" style={{ color: "var(--color-ink-soft)" }}>
                    <Icon className="h-3.5 w-3.5 text-horizon" />
                    <span>0{i + 1}</span>
                  </div>
                </div>

                <h3 className="font-screamer text-xl uppercase tracking-wide mb-2 group-hover:text-horizon transition-colors" style={{ color: "var(--color-ink)" }}>
                  {p.title}
                </h3>
                <p className="font-editorial text-sm leading-6" style={{ color: "var(--color-ink-soft)" }}>
                  {p.body}
                </p>

                {/* Expanded Micro-architecture disclosure */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t text-xs font-editorial leading-relaxed rounded-lg p-2.5"
                      style={{
                        background: "var(--color-paper)",
                        borderColor: "var(--color-line)",
                        color: "var(--color-ink)",
                      }}
                    >
                      <span className="font-figure text-[10px] uppercase tracking-wider block font-semibold mb-1" style={{ color: "var(--color-horizon)" }}>
                        Architectural Guarantee
                      </span>
                      {p.detail}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Micro-visual flow preview */}
                <div className="mt-4 pt-3.5 border-t flex items-center justify-between text-[11px] font-figure" style={{ borderColor: "var(--color-line)" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.accent }} />
                    <span className="text-ink font-medium">{p.stat}</span>
                  </div>
                  <span className="text-ink-soft text-[10px] opacity-75 truncate max-w-[120px]">{p.badge}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Scene B — Statement Transformation (Compact & Rich Interactive)     */
/* ═══════════════════════════════════════════════════════════════════ */

const SAMPLE_TXNS = [
  { id: 1, date: "02 Oct", desc: "Starbucks Coffee BKC", amount: "₹340", cat: "Food & Dining", type: "approved" },
  { id: 2, date: "05 Oct", desc: "UPI / 9820192819 / Rent", amount: "₹24,000", cat: "Review Needed", type: "review" },
  { id: 3, date: "08 Oct", desc: "Swiggy Online Food", amount: "₹480", cat: "Food & Dining", type: "approved" },
  { id: 4, date: "12 Oct", desc: "Metro Card Recharge", amount: "₹200", cat: "Transportation", type: "approved" },
  { id: 5, date: "15 Oct", desc: "IMPS / Client Retainer", amount: "₹45,000", cat: "Review Needed", type: "review" },
];

function SceneStatement() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState("all");
  const [reviewedItems, setReviewedItems] = useState({ 2: false, 5: false });
  const [selectedTxn, setSelectedTxn] = useState(null);

  function toggleReview(id) {
    setReviewedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const pendingCount = 2 - (reviewedItems[2] ? 1 : 0) - (reviewedItems[5] ? 1 : 0);
  const approvedCount = 3 + (reviewedItems[2] ? 1 : 0) + (reviewedItems[5] ? 1 : 0);

  return (
    <section
      className="border-y relative overflow-hidden py-12 sm:py-16 transition-colors duration-300"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-paper-raised)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-6% 0px" }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 mb-2 text-[11px] font-figure uppercase tracking-widest font-semibold" style={{ background: "var(--color-horizon-dim)", color: isLight ? "#92400e" : "var(--color-horizon)" }}>
              <FileText className="h-3 w-3" />
              <span>Scene 2 — Statement Intelligence</span>
            </div>
            <h2
              className="font-screamer text-4xl sm:text-5xl lg:text-6xl"
              style={{ color: "var(--color-ink)" }}
            >
              From bank statement
              <br />
              to clean ledger.
            </h2>
          </div>
          <div className="max-w-md">
            <p className="font-editorial text-sm sm:text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              Upload your Indian bank statement. FinSight parses raw transaction strings, routes
              ambiguous transfers into a deliberate Review Queue, and posts only approved items.
            </p>
          </div>
        </motion.div>

        {/* Stage Filter Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--color-line)" }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--color-horizon)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--color-horizon)" }} />
            </span>
            <span className="font-figure text-xs tracking-wider uppercase font-semibold" style={{ color: "var(--color-horizon)" }}>
              {activeTab === "all" ? "Live Dual-Pass Ingestion" : activeTab === "scan" ? "Phase 1: OCR Extraction" : activeTab === "review" ? "Phase 2: Review Queue" : "Phase 3: Ledger Records"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "Full Flow" },
              { id: "scan", label: "1. Scan PDF" },
              { id: "review", label: `2. Review Queue (${pendingCount})` },
              { id: "ledger", label: `3. Clean Ledger (${approvedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-figure whitespace-nowrap transition-all border cursor-pointer font-medium ${
                  activeTab === tab.id
                    ? "border-horizon text-horizon font-semibold"
                    : "border-line text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                style={activeTab === tab.id ? { background: "var(--color-horizon-dim)" } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Bank Statement Document with Laser Scan */}
          {(activeTab === "all" || activeTab === "scan") && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className={`${activeTab === "scan" ? "lg:col-span-12 max-w-2xl mx-auto" : "lg:col-span-5"}`}
            >
              <div
                className="w-full rounded-2xl border p-4 shadow-sm relative overflow-hidden"
                style={{
                  borderColor: "var(--color-line)",
                  background: "var(--color-paper)",
                }}
              >
                {/* Laser Scan Line with dynamic glow */}
                <motion.div
                  className="absolute inset-x-0 h-0.5 pointer-events-none z-10"
                  animate={{ top: ["4%", "96%", "4%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    background: isLight
                      ? "linear-gradient(90deg, transparent, #b47818, #d9921b, transparent)"
                      : "linear-gradient(90deg, transparent, var(--color-horizon), #c9a227, transparent)",
                    boxShadow: isLight
                      ? "0 0 12px rgba(180, 120, 24, 0.45)"
                      : "0 0 16px rgba(214, 255, 98, 0.6)",
                  }}
                />

                {/* Document Header */}
                <div className="flex items-start justify-between border-b pb-3 mb-3" style={{ borderColor: "var(--color-line)" }}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-horizon" />
                    <div>
                      <p className="font-figure text-xs font-bold uppercase tracking-widest text-ink">HDFC Bank Ltd</p>
                      <p className="font-figure text-[10px] text-ink-soft">A/C: *******8291 · October Statement</p>
                    </div>
                  </div>
                  <span
                    className="rounded-md px-2 py-0.5 font-figure text-[9px] uppercase tracking-wide font-semibold"
                    style={{
                      background: "var(--color-horizon-dim)",
                      color: isLight ? "#92400e" : "var(--color-horizon)",
                    }}
                  >
                    PDF Verified
                  </span>
                </div>

                {/* Document Raw Rows */}
                <div className="space-y-1.5">
                  {SAMPLE_TXNS.map((t) => {
                    const isSelected = selectedTxn === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTxn(isSelected ? null : t.id)}
                        className={`flex items-center justify-between text-xs py-2 px-2 rounded cursor-pointer transition-all border font-figure ${
                          isSelected
                            ? "border-horizon bg-horizon/10 font-medium"
                            : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div>
                          <p className="text-ink text-[11px] font-medium truncate max-w-[180px]">{t.desc}</p>
                          <p className="text-[9px] text-ink-soft">{t.date}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink font-semibold">{t.amount}</span>
                          {t.type === "review" && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Review needed" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-2 border-t flex justify-between items-center text-[10px] font-figure text-ink-soft" style={{ borderColor: "var(--color-line)" }}>
                  <span>5 entries tokenized</span>
                  <span className="flex items-center gap-1 font-medium" style={{ color: "var(--color-horizon)" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-horizon animate-ping" />
                    OCR Dual-Pass Active
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Right Column: Split Outcome (Review Queue vs Verified Ledger) */}
          {(activeTab === "all" || activeTab === "review" || activeTab === "ledger") && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className={`flex flex-col gap-4 ${activeTab === "all" ? "lg:col-span-7" : "lg:col-span-12 max-w-3xl mx-auto"}`}
            >
              {/* Divergence 1: Review Queue (Amber Warning Card) */}
              {(activeTab === "all" || activeTab === "review") && (
                <div
                  className="rounded-2xl border p-4 shadow-xs relative overflow-hidden transition-all"
                  style={{
                    borderColor: isLight ? "rgba(217, 146, 27, 0.35)" : "rgba(214, 255, 98, 0.25)",
                    background: isLight ? "rgba(254, 243, 199, 0.45)" : "rgba(214, 255, 98, 0.04)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" style={{ color: isLight ? "#b45309" : "#fbbf24" }} />
                      <h4 className="font-screamer text-sm tracking-wider uppercase font-bold" style={{ color: isLight ? "#92400e" : "#e5c76b" }}>
                        Action Required · Review Queue ({pendingCount} Pending)
                      </h4>
                    </div>
                    <span
                      className="font-figure text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: isLight ? "rgba(217, 146, 27, 0.15)" : "rgba(214, 255, 98, 0.12)",
                        color: isLight ? "#92400e" : "#d6ff62",
                      }}
                    >
                      Click to Test Action
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {SAMPLE_TXNS.filter((x) => x.type === "review").map((r) => {
                      const isApproved = reviewedItems[r.id];
                      return (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl px-3.5 py-2.5 text-xs border gap-2 transition-all"
                          style={{
                            background: isApproved
                              ? isLight ? "rgba(240, 253, 244, 0.9)" : "rgba(16, 217, 138, 0.08)"
                              : "var(--color-paper-raised)",
                            borderColor: isApproved
                              ? isLight ? "rgba(22, 163, 74, 0.4)" : "rgba(16, 217, 138, 0.4)"
                              : "var(--color-line)",
                          }}
                        >
                          <div>
                            <p className="font-editorial text-ink font-medium flex items-center gap-1.5">
                              {r.desc}
                              {isApproved && (
                                <span className="font-figure font-semibold text-[10px]" style={{ color: isLight ? "#15803d" : "#10d98a" }}>
                                  ✓ Approved
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] font-figure mt-0.5" style={{ color: isApproved ? (isLight ? "#15803d" : "#10d98a") : (isLight ? "#b45309" : "#fbbf24") }}>
                              {isApproved ? "Committed to ledger" : "Ambiguous transfer — Needs category"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 font-figure">
                            <span className="text-ink font-semibold">{r.amount}</span>
                            <button
                              type="button"
                              onClick={() => toggleReview(r.id)}
                              className="rounded px-2.5 py-1 text-[10px] uppercase font-bold transition-all cursor-pointer flex items-center gap-1"
                              style={{
                                background: isApproved
                                  ? isLight ? "rgba(22, 163, 74, 0.15)" : "rgba(16, 217, 138, 0.2)"
                                  : isLight ? "rgba(217, 146, 27, 0.15)" : "rgba(251, 191, 36, 0.2)",
                                color: isApproved
                                  ? isLight ? "#15803d" : "#10d98a"
                                  : isLight ? "#92400e" : "#fbbf24",
                                border: `1px solid ${isApproved ? (isLight ? "rgba(22, 163, 74, 0.3)" : "rgba(16, 217, 138, 0.4)") : (isLight ? "rgba(217, 146, 27, 0.35)" : "rgba(251, 191, 36, 0.4)")}`,
                              }}
                            >
                              {isApproved ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Approved</span>
                                </>
                              ) : (
                                <span>Confirm Category</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divergence 2: Approved Ledger (Success Card) */}
              {(activeTab === "all" || activeTab === "ledger") && (
                <div
                  className="rounded-2xl border p-4 shadow-xs"
                  style={{
                    borderColor: "var(--color-line)",
                    background: "var(--color-paper)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" style={{ color: isLight ? "#15803d" : "#10d98a" }} />
                      <h4 className="font-screamer text-sm tracking-wider uppercase text-ink font-bold">
                        Verified Ledger Records ({approvedCount} Committed)
                      </h4>
                    </div>
                    <span className="font-figure text-[10px] font-semibold" style={{ color: "var(--color-horizon)" }}>
                      ✓ Auto-Categorised
                    </span>
                  </div>

                  <div className="space-y-2">
                    {SAMPLE_TXNS.filter((x) => x.type === "approved").map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs border"
                        style={{
                          background: "var(--color-paper-raised)",
                          borderColor: "var(--color-line)",
                        }}
                      >
                        <div>
                          <p className="font-editorial text-ink font-medium">{a.desc}</p>
                          <p className="text-[10px] font-figure text-ink-soft">{a.date}</p>
                        </div>
                        <div className="flex items-center gap-2 font-figure">
                          <span
                            className="rounded px-2 py-0.5 text-[9px] uppercase tracking-wide font-semibold"
                            style={{
                              background: "var(--color-horizon-dim)",
                              color: isLight ? "#92400e" : "var(--color-horizon)",
                            }}
                          >
                            {a.cat}
                          </span>
                          <span className="text-ink font-semibold">{a.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Scene C — FinScore Circular Radial Visualization (Interactive)      */
/* ═══════════════════════════════════════════════════════════════════ */

const FINSCORE_PILLARS = [
  {
    id: "savings",
    label: "Savings Rate",
    score: 68,
    status: "Healthy (31% saved)",
    colorLight: "#15803d",
    colorDark: "#d6ff62",
    formula: "Savings / Gross Inflows = 31.2% (Benchmark: >20%)",
  },
  {
    id: "emergency",
    label: "Emergency Fund",
    score: 54,
    status: "3.8 months runway",
    colorLight: "#b45309",
    colorDark: "#c9a227",
    formula: "Liquid Bank Cash / Monthly Expenses = 3.8 months (Target: 6 months)",
  },
  {
    id: "debt",
    label: "Debt Load",
    score: 85,
    status: "Low DTI (12%)",
    colorLight: "#15803d",
    colorDark: "#10d98a",
    formula: "Debt Servicing EMI / Total Income = 12% (Benchmark: <30%)",
  },
  {
    id: "investment",
    label: "Investment Mix",
    score: 72,
    status: "Balanced Equity/Gold",
    colorLight: "#b47818",
    colorDark: "#d6ff62",
    formula: "Asset Diversification Index: Equities 55%, MF 25%, Gold 15%, FD 5%",
  },
  {
    id: "stability",
    label: "Income Stability",
    score: 82,
    status: "Consistent salary",
    colorLight: "#b45309",
    colorDark: "#c9a227",
    formula: "Variance coefficient of verified monthly credits over trailing 6 months",
  },
];

function SceneFinScore() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [simMode, setSimMode] = useState("none"); // "none" | "emergency" | "debt"
  const gaugeRef = useRef(null);
  const isInView = useInView(gaugeRef, { once: true, margin: "-10% 0px" });

  const R = 95;
  const CIRC = 2 * Math.PI * R;
  const targetScore = selectedPillar
    ? selectedPillar.score
    : simMode === "emergency"
    ? 84
    : simMode === "debt"
    ? 81
    : 74;

  const strokeOffset = isInView ? CIRC - (targetScore / 100) * CIRC : CIRC;

  return (
    <section className="border-b relative py-12 sm:py-16 transition-colors duration-300" style={{ borderColor: "var(--color-line)" }}>
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-6% 0px" }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 mb-2 text-[11px] font-figure uppercase tracking-widest font-semibold" style={{ background: "var(--color-horizon-dim)", color: isLight ? "#92400e" : "var(--color-horizon)" }}>
            <TrendingUp className="h-3 w-3" />
            <span>Scene 3 — FinScore</span>
          </div>
          <h2
            className="font-screamer text-4xl sm:text-5xl lg:text-6xl"
            style={{ color: "var(--color-ink)" }}
          >
            Your financial health,
            <br />
            quantified.
          </h2>
          <p className="font-editorial mt-3 text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
            A transparent weighted composite computed directly from your savings rate, emergency reserve,
            debt coverage, and portfolio diversification. Click any metric to inspect its formula.
          </p>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-12 items-center">
          {/* Left: Animated Radial Gauge & Interactive Strategy Simulator */}
          <div ref={gaugeRef} className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Background Glow */}
              <div
                className="absolute rounded-full pointer-events-none transition-all duration-500"
                style={{
                  width: 240,
                  height: 240,
                  background: simMode !== "none"
                    ? (isLight ? "radial-gradient(circle, rgba(22, 163, 74, 0.18) 0%, transparent 70%)" : "radial-gradient(circle, rgba(16, 217, 138, 0.25) 0%, transparent 70%)")
                    : (isLight ? "radial-gradient(circle, rgba(217, 146, 27, 0.15) 0%, transparent 70%)" : "radial-gradient(circle, rgba(214, 255, 98, 0.18) 0%, transparent 70%)"),
                  filter: "blur(24px)",
                }}
              />

              <svg width="240" height="240" viewBox="0 0 240 240" aria-label="FinScore">
                <defs>
                  <linearGradient id="finScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isLight ? "#d9921b" : "#c9a227"} />
                    <stop offset="60%" stopColor={simMode !== "none" ? (isLight ? "#15803d" : "#10d98a") : (isLight ? "#b47818" : "#d6ff62")} />
                    <stop offset="100%" stopColor={simMode !== "none" ? (isLight ? "#15803d" : "#10d98a") : (isLight ? "#b47818" : "#d6ff62")} />
                  </linearGradient>
                </defs>

                {/* Circular gauge track */}
                <circle
                  cx="120"
                  cy="120"
                  r={R}
                  fill="none"
                  stroke="var(--color-line)"
                  strokeWidth="12"
                  opacity="0.6"
                />

                {/* Concentric tick marks */}
                {Array.from({ length: 32 }, (_, i) => {
                  const angle = (i / 32) * Math.PI * 2 - Math.PI / 2;
                  const inner = R - 10;
                  const outer = R - 2;
                  const x1 = Math.round((120 + inner * Math.cos(angle)) * 100) / 100;
                  const y1 = Math.round((120 + inner * Math.sin(angle)) * 100) / 100;
                  const x2 = Math.round((120 + outer * Math.cos(angle)) * 100) / 100;
                  const y2 = Math.round((120 + outer * Math.sin(angle)) * 100) / 100;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="var(--color-line)"
                      strokeWidth="1.2"
                      opacity="0.8"
                    />
                  );
                })}

                {/* Dynamic Arc Fill */}
                <motion.circle
                  cx="120"
                  cy="120"
                  r={R}
                  fill="none"
                  stroke="url(#finScoreGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: strokeOffset }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  transform="rotate(-90 120 120)"
                />

                {/* Center Numbers */}
                <text
                  x="120"
                  y="112"
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-display)",
                    fill: "var(--color-ink)",
                    fontSize: 50,
                    fontWeight: 700,
                  }}
                >
                  {targetScore}
                </text>
                <text
                  x="120"
                  y="134"
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fill: "var(--color-ink-soft)",
                    fontSize: 11,
                    letterSpacing: 2,
                  }}
                >
                  / 100
                </text>
                <text
                  x="120"
                  y="154"
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fill: simMode !== "none" ? (isLight ? "#15803d" : "#10d98a") : "var(--color-horizon)",
                    fontSize: 9,
                    letterSpacing: 2.5,
                    fontWeight: 700,
                  }}
                >
                  {selectedPillar
                    ? selectedPillar.label.toUpperCase()
                    : simMode === "emergency"
                    ? "EXCELLENT · +10 PTS"
                    : simMode === "debt"
                    ? "OPTIMIZED · +7 PTS"
                    : "GOOD · COMPOSITE"}
                </text>
              </svg>
            </div>

            {/* Interactive Strategy Simulators */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPillar(null);
                  setSimMode(simMode === "emergency" ? "none" : "emergency");
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-figure border flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer font-medium"
                style={{
                  borderColor: simMode === "emergency" ? (isLight ? "#15803d" : "#10d98a") : "var(--color-line)",
                  background: simMode === "emergency"
                    ? (isLight ? "rgba(22, 163, 74, 0.12)" : "rgba(16, 217, 138, 0.15)")
                    : "var(--color-paper-raised)",
                  color: simMode === "emergency"
                    ? (isLight ? "#15803d" : "#10d98a")
                    : "var(--color-ink)",
                }}
              >
                <Sparkles className="h-3 w-3" style={{ color: "var(--color-horizon)" }} />
                <span>{simMode === "emergency" ? "Active: +₹25k Reserve" : "+₹25k Reserve (+10)"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPillar(null);
                  setSimMode(simMode === "debt" ? "none" : "debt");
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-figure border flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer font-medium"
                style={{
                  borderColor: simMode === "debt" ? (isLight ? "#15803d" : "#10d98a") : "var(--color-line)",
                  background: simMode === "debt"
                    ? (isLight ? "rgba(22, 163, 74, 0.12)" : "rgba(16, 217, 138, 0.15)")
                    : "var(--color-paper-raised)",
                  color: simMode === "debt"
                    ? (isLight ? "#15803d" : "#10d98a")
                    : "var(--color-ink)",
                }}
              >
                <Zap className="h-3 w-3 text-amber-500" />
                <span>{simMode === "debt" ? "Active: Clear Debt" : "Clear Card Debt (+7)"}</span>
              </button>
            </div>

            {selectedPillar && (
              <button
                type="button"
                onClick={() => setSelectedPillar(null)}
                className="mt-2 text-[11px] font-figure text-horizon hover:underline cursor-pointer"
              >
                Reset to Composite View
              </button>
            )}
          </div>

          {/* Right: Detailed Component Progress Breakdown (Interactive) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <p
                className="font-figure text-[10px] uppercase tracking-[0.25em] font-semibold"
                style={{ color: "var(--color-horizon)" }}
              >
                Composite Sub-Scores (Click to inspect formula)
              </p>
              {simMode === "emergency" && (
                <span
                  className="font-figure text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: isLight ? "rgba(22, 163, 74, 0.12)" : "rgba(16, 217, 138, 0.12)",
                    color: isLight ? "#15803d" : "#10d98a",
                  }}
                >
                  Runway upgraded: 3.8 → 5.4 mos
                </span>
              )}
              {simMode === "debt" && (
                <span
                  className="font-figure text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: isLight ? "rgba(22, 163, 74, 0.12)" : "rgba(16, 217, 138, 0.12)",
                    color: isLight ? "#15803d" : "#10d98a",
                  }}
                >
                  DTI lowered: 12% → 3%
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {FINSCORE_PILLARS.map((p, i) => {
                const isSelected = selectedPillar?.id === p.id;
                let currentScore = p.score;
                let currentStatus = p.status;
                let currentColor = isLight ? p.colorLight : p.colorDark;

                if (simMode === "emergency" && p.id === "emergency") {
                  currentScore = 88;
                  currentStatus = "5.4 months runway (Boosted)";
                  currentColor = isLight ? "#15803d" : "#10d98a";
                } else if (simMode === "debt" && p.id === "debt") {
                  currentScore = 96;
                  currentStatus = "Minimal DTI (3% Debt)";
                  currentColor = isLight ? "#15803d" : "#10d98a";
                }

                return (
                  <motion.div
                    key={p.label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                    onClick={() => setSelectedPillar(isSelected ? null : p)}
                    className="rounded-xl border p-3 cursor-pointer transition-all shadow-xs"
                    style={{
                      background: isSelected
                        ? (isLight ? "rgba(217, 146, 27, 0.08)" : "rgba(214, 255, 98, 0.06)")
                        : "var(--color-paper-raised)",
                      borderColor: isSelected ? "var(--color-horizon)" : "var(--color-line)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-editorial text-ink font-medium text-sm flex items-center gap-1.5">
                        <span>{p.label}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-horizon)" }} />}
                      </span>
                      <div className="flex items-center gap-2 font-figure">
                        <span className="text-[11px] text-ink-soft">{currentStatus}</span>
                        <span className="text-sm font-bold" style={{ color: currentColor }}>
                          {currentScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="h-1.5 w-full rounded-full" style={{ background: "var(--color-line)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${currentScore}%` }}
                        transition={{ delay: i * 0.08 + 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        viewport={{ once: true }}
                        style={{ background: currentColor, width: `${currentScore}%` }}
                      />
                    </div>

                    {/* Explanatory Formula Card on Selection */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2.5 pt-2 border-t text-[11px] font-figure flex items-center gap-1.5 font-medium"
                        style={{ borderColor: "var(--color-line)", color: isLight ? "#92400e" : "var(--color-horizon)" }}
                      >
                        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{p.formula}</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <p className="text-[10px] font-editorial pt-2" style={{ color: "var(--color-ink-soft)" }}>
              Every component maps strictly to actual ledger rows. No fabricated benchmarks or black-box predictions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Scene D — FinAI (Layered Interface + Interactive Prompts)           */
/* ═══════════════════════════════════════════════════════════════════ */

const AI_SCENARIOS = [
  {
    id: "spending",
    chip: "Spending Spike",
    prompt: "Why did my discretionary spending jump in October?",
    responses: [
      "In October, your Discretionary Spending rose by 22% compared to September (₹8,340 vs ₹6,820).",
      "The spike originated from 14 dining & cafe transactions booked after the 15th.",
      "However, your Savings Rate remained resilient at 31%, above your 6-month median target.",
    ],
    telemetry: [
      { title: "October Food & Dining", val: "₹8,340", drift: "+22% MoM", bad: true },
      { title: "Restaurant Volume", val: "14 transactions", drift: "+8 trips", bad: true },
      { title: "Monthly Savings Rate", val: "31.2%", drift: "+4.2pp vs target", bad: false },
    ],
    citation: "14 receipts matched · 0 hallucinations",
  },
  {
    id: "affordability",
    chip: "Can I buy a ₹75k Laptop?",
    prompt: "Can I afford to purchase a ₹75,000 MacBook Air this month?",
    responses: [
      "Your available unallocated liquid savings is currently ₹1,42,000 across accounts.",
      "Withdrawing ₹75,000 would drop your Emergency Runway from 3.8 to 1.8 months (below the 3.0M safety threshold).",
      "Recommendation: Opt for a 6-month No-Cost EMI of ₹12,500/mo to preserve emergency reserves intact.",
    ],
    telemetry: [
      { title: "Available Savings", val: "₹1,42,000", drift: "3 Accounts", bad: false },
      { title: "Emergency Reserve", val: "₹1,12,500", drift: "Protected", bad: false },
      { title: "Safe Cash Outlay", val: "₹29,500", drift: "Discretionary", bad: true },
    ],
    citation: "Checked against live liquidity balance & active EMIs",
  },
  {
    id: "emergency",
    chip: "Emergency Runway",
    prompt: "How many months of emergency runway do I currently have?",
    responses: [
      "Based on trailing 3-month living expenses of ₹37,500/mo, your liquid cash of ₹1,42,000 gives 3.8 months of runway.",
      "Your recommended target is 6 months (₹2,25,000).",
      "FinAI suggests directing ₹15,000 from upcoming bonuses toward your liquid emergency fund.",
    ],
    telemetry: [
      { title: "Liquid Cash Reserve", val: "₹1,42,000", drift: "3 Accounts", bad: false },
      { title: "Monthly Living Burn", val: "₹37,500", drift: "Trailing 3M avg", bad: false },
      { title: "Runway Coverage", val: "3.8 Months", drift: "Target: 6.0M", bad: true },
    ],
    citation: "3 bank balances verified against statements",
  },
  {
    id: "portfolio",
    chip: "Portfolio Drift",
    prompt: "Is my portfolio asset allocation drifting from targets?",
    responses: [
      "Your target equity allocation is 60%, but current equities have grown to 67% due to Nifty momentum.",
      "Fixed Deposits are underweight at 8% against your 15% target.",
      "Consider routing your next ₹25,000 monthly SIP tranche into debt/FD to rebalance naturally.",
    ],
    telemetry: [
      { title: "Equity Weight", val: "67.0%", drift: "+7.0% Overweight", bad: true },
      { title: "Gold & SGBs", val: "15.0%", drift: "On Target (15%)", bad: false },
      { title: "Debt & FDs", val: "18.0%", drift: "-7.0% Underweight", bad: true },
    ],
    citation: "Portfolio holdings matched against manual ledger",
  },
];

function SceneFinAI() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [selectedScenarioId, setSelectedScenarioId] = useState("spending");
  const [terminalTilt, setTerminalTilt] = useState({ x: 0, y: 0 });
  const terminalRef = useRef(null);

  const activeScenario = AI_SCENARIOS.find((s) => s.id === selectedScenarioId) || AI_SCENARIOS[0];

  function handleTerminalMouseMove(e) {
    if (!terminalRef.current) return;
    const rect = terminalRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 6;
    setTerminalTilt({ x: y, y: x });
  }

  function handleTerminalMouseLeave() {
    setTerminalTilt({ x: 0, y: 0 });
  }

  return (
    <section
      className="border-b relative overflow-hidden py-12 sm:py-16 transition-colors duration-300"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-paper-raised)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-6% 0px" }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 mb-2 text-[11px] font-figure uppercase tracking-widest font-semibold" style={{ background: "var(--color-horizon-dim)", color: isLight ? "#92400e" : "var(--color-horizon)" }}>
            <Cpu className="h-3 w-3" />
            <span>Scene 4 — FinAI</span>
          </div>
          <h2
            className="font-screamer text-4xl sm:text-5xl lg:text-6xl"
            style={{ color: "var(--color-ink)" }}
          >
            Ask anything.
            <br />
            Get ledger-backed answers.
          </h2>
          <p className="font-editorial mt-3 text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
            FinAI reads your personal balance history, compares real period-over-period patterns, and explains
            why your money moved — without making generic guesses.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-12 items-center">
          {/* Left 7 Cols: Floating AI Terminal Interface */}
          <motion.div
            ref={terminalRef}
            onMouseMove={handleTerminalMouseMove}
            onMouseLeave={handleTerminalMouseLeave}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            style={{
              rotateX: terminalTilt.x,
              rotateY: terminalTilt.y,
              transformPerspective: 1200,
            }}
            className="lg:col-span-7 transition-transform duration-200 ease-out"
          >
            <div
              className="rounded-2xl border p-5 shadow-sm relative overflow-hidden backdrop-blur-md"
              style={{
                borderColor: "var(--color-line)",
                background: "var(--color-paper)",
              }}
            >
              {/* Window Chrome */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: "var(--color-line)" }}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                </div>
                <span className="font-figure text-[10px] uppercase tracking-widest text-ink-soft flex items-center gap-1.5 font-semibold">
                  <Cpu className="h-3 w-3 text-horizon" />
                  FinAI Context Engine · Interactive Preview
                </span>
              </div>

              {/* Scenario Prompt Chips */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                {AI_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-figure transition-all border cursor-pointer font-medium ${
                      selectedScenarioId === sc.id
                        ? "border-horizon text-horizon font-semibold shadow-xs"
                        : "border-line text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                    style={selectedScenarioId === sc.id ? { background: "var(--color-horizon-dim)" } : undefined}
                  >
                    {sc.chip}
                  </button>
                ))}
              </div>

              {/* Simulated Conversation */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScenario.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5"
                >
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div
                      className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs sm:text-sm font-editorial max-w-[85%] shadow-xs"
                      style={{
                        background: "var(--color-horizon)",
                        color: "#05080f",
                        fontWeight: 600,
                      }}
                    >
                      {activeScenario.prompt}
                    </div>
                  </div>

                  {/* FinAI Structured Response */}
                  <div className="space-y-2 pt-1">
                    {activeScenario.responses.map((step, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 + idx * 0.08, duration: 0.3 }}
                        className="rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-editorial"
                        style={{
                          background: "var(--color-paper-raised)",
                          borderColor: "var(--color-line)",
                          color: "var(--color-ink)",
                        }}
                      >
                        {step}
                      </motion.div>
                    ))}

                    <div className="flex items-center gap-2 pt-2 px-1">
                      <div className="h-2 w-2 rounded-full animate-ping" style={{ background: "var(--color-horizon)" }} />
                      <span className="font-figure text-[10px] uppercase tracking-wider font-semibold" style={{ color: isLight ? "#92400e" : "var(--color-horizon)" }}>
                        Ledger Verification: {activeScenario.citation}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right 5 Cols: Contextual Telemetry Cards */}
          <div className="lg:col-span-5 space-y-3">
            <p
              className="font-figure text-[10px] uppercase tracking-[0.25em] mb-2 font-semibold"
              style={{ color: "var(--color-horizon)" }}
            >
              Ledger Data Extracted
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeScenario.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2.5"
              >
                {activeScenario.telemetry.map((card, i) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    className="rounded-xl border p-3.5 flex items-center justify-between shadow-xs"
                    style={{
                      background: "var(--color-paper-raised)",
                      borderColor: "var(--color-line)",
                    }}
                  >
                    <div>
                      <p className="font-editorial text-ink-soft text-xs font-medium">{card.title}</p>
                      <p className="font-figure text-sm font-bold text-ink mt-0.5">{card.val}</p>
                    </div>
                    <span
                      className="font-figure text-[10px] px-2.5 py-1 rounded-full font-semibold"
                      style={{
                        background: card.bad
                          ? (isLight ? "rgba(220, 38, 38, 0.12)" : "rgba(248, 113, 113, 0.15)")
                          : (isLight ? "rgba(22, 163, 74, 0.12)" : "rgba(16, 217, 138, 0.15)"),
                        color: card.bad
                          ? (isLight ? "#b91c1c" : "#f87171")
                          : (isLight ? "#15803d" : "#10d98a"),
                      }}
                    >
                      {card.drift}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

              <p className="text-[10px] font-editorial pt-1" style={{ color: "var(--color-ink-soft)" }}>
                Click different scenario pills above to test FinAI&apos;s verified query-response mechanism.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

/* ═══════════════════════════════════════════════════════════════════ */
/* Root ScrollStory Export                                             */
/* ═══════════════════════════════════════════════════════════════════ */
export default function ScrollStory() {
  return (
    <div className="relative">
      <SceneIntro />
      <SceneStatement />
      <SceneFinScore />
      <SceneFinAI />
    </div>
  );
}
