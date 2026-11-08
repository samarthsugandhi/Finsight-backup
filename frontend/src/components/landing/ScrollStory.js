"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  PieChart,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  Sliders,
  Check,
  Cpu,
  RefreshCw,
  Coins,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════ */
/* Scene A — Financial Clarity & Three Pillars                         */
/* ═══════════════════════════════════════════════════════════════════ */
function SceneIntro() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });
  const lineWidth = useTransform(smooth, [0.15, 0.55], ["0%", "100%"]);
  const glowX = useTransform(smooth, [0.15, 0.75], ["0%", "100%"]);

  const pillars = [
    {
      title: "INR-native by default",
      tag: "Currency & Context",
      badge: "₹ INR Native",
      body: "Rupee-first formatting, Indian tax year awareness, and native handling of UPI, NEFT, and IMPS flows.",
      accent: "var(--color-horizon)",
      stat: "100% Indian Banking Native",
      flow: ["UPI QR", "IMPS", "NEFT P2P"],
    },
    {
      title: "Statement-first onboarding",
      tag: "Verification First",
      badge: "Dual-Pass Engine",
      body: "Upload bank statements, inspect every row with auto-categorisation, and approve before permanent posting.",
      accent: "#c9a227",
      stat: "Zero Auto-Posting Errors",
      flow: ["HDFC · ICICI · SBI", "Review Queue", "Ledger"],
    },
    {
      title: "Transparent FinScore",
      tag: "Zero Black Boxes",
      badge: "Audit Grade",
      body: "Every metric, ratio, and advisor suggestion is mathematically traceable back to your verified ledger.",
      accent: "#d6ff62",
      stat: "74 / 100 Live Composite",
      flow: ["Savings", "Debt Ratio", "Liquidity"],
    },
  ];

  return (
    <section ref={containerRef} className="mx-auto max-w-6xl px-6 pt-12 pb-10 sm:pt-16 sm:pb-14 relative">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true, margin: "-8% 0px" }}
        className="text-center mb-10 sm:mb-12"
      >
        <p
          className="font-figure text-xs uppercase tracking-[0.3em] mb-4"
          style={{ color: "var(--color-horizon)" }}
        >
          Scene 1 — Financial Clarity
        </p>
        <h2
          className="font-screamer text-5xl sm:text-6xl lg:text-7xl leading-tight"
          style={{ color: "var(--color-ink)" }}
        >
          Everything connected,
          <br />
          nothing black-boxed.
        </h2>
        <p
          className="font-editorial mt-5 text-lg leading-relaxed mx-auto max-w-2xl"
          style={{ color: "var(--color-ink-soft)" }}
        >
          FinSight bridges raw bank statement files, transparent financial health scoring,
          and intelligent portfolio tracking into a single unified workspace.
        </p>
      </motion.div>

      {/* Dynamic Animated Connector Beam between Pillars */}
      <div className="relative mb-6 hidden sm:block">
        <div className="h-px w-full bg-line/40 relative overflow-hidden">
          <motion.div
            style={{ width: lineWidth }}
            className="h-full bg-gradient-to-r from-transparent via-horizon to-amber-400"
          />
        </div>
        <motion.div
          style={{ left: glowX }}
          className="absolute -top-1 h-2.5 w-2.5 rounded-full bg-horizon blur-xs shadow-lg shadow-horizon"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {pillars.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: "-6% 0px" }}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
            className="rounded-2xl border p-6 flex flex-col justify-between group transition-all relative overflow-hidden backdrop-blur-xs"
            style={{
              borderColor: "var(--color-line)",
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
                    color: "var(--color-horizon)",
                  }}
                >
                  {p.tag}
                </span>
                <span className="font-figure text-xs font-semibold" style={{ color: "var(--color-ink-soft)" }}>
                  0{i + 1}
                </span>
              </div>

              <h3 className="font-screamer text-xl uppercase tracking-wide mb-2 group-hover:text-horizon transition-colors" style={{ color: "var(--color-ink)" }}>
                {p.title}
              </h3>
              <p className="font-editorial text-sm leading-6" style={{ color: "var(--color-ink-soft)" }}>
                {p.body}
              </p>

              {/* Micro-visual flow preview */}
              <div className="mt-4 pt-3.5 border-t border-line/60 flex items-center justify-between text-[11px] font-figure">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.accent }} />
                  <span className="text-ink font-medium">{p.stat}</span>
                </div>
                <span className="text-ink-soft text-[10px] opacity-70 truncate max-w-[120px]">{p.badge}</span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t flex items-center justify-between text-xs font-figure" style={{ borderColor: "var(--color-line)" }}>
              <span className="text-ink-soft group-hover:text-ink transition-colors">Inspect flow</span>
              <ArrowRight className="h-3.5 w-3.5 text-horizon transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Scene B — Statement Transformation (Sticky + Interactive Tabs)       */
/* ═══════════════════════════════════════════════════════════════════ */

const SAMPLE_TXNS = [
  { id: 1, date: "02 Oct", desc: "Starbucks Coffee BKC", amount: "₹340", cat: "Food & Dining", type: "approved" },
  { id: 2, date: "05 Oct", desc: "UPI / 9820192819 / Rent", amount: "₹24,000", cat: "Review Needed", type: "review" },
  { id: 3, date: "08 Oct", desc: "Swiggy Online Food", amount: "₹480", cat: "Food & Dining", type: "approved" },
  { id: 4, date: "12 Oct", desc: "Metro Card Recharge", amount: "₹200", cat: "Transportation", type: "approved" },
  { id: 5, date: "15 Oct", desc: "IMPS / Client Retainer", amount: "₹45,000", cat: "Review Needed", type: "review" },
];

function SceneStatement() {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(null); // null = scroll-driven, or 0, 1, 2, 3
  const [reviewedItems, setReviewedItems] = useState({ 2: false, 5: false });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 85, damping: 26 });

  // Phase transforms
  const scrollDocX    = useTransform(smooth, [0.0, 0.22], [-60, 0]);
  const scrollDocO    = useTransform(smooth, [0.0, 0.18], [0, 1]);
  const scrollDocTilt = useTransform(smooth, [0.0, 0.25, 0.6], [-10, -3, 3]);
  const scrollScanTop = useTransform(smooth, [0.08, 0.42], ["0%", "100%"]);

  const scrollReviewY = useTransform(smooth, [0.35, 0.65], [40, 0]);
  const scrollReviewO = useTransform(smooth, [0.35, 0.58], [0, 1]);
  const scrollLedgerY = useTransform(smooth, [0.52, 0.82], [40, 0]);
  const scrollLedgerO = useTransform(smooth, [0.52, 0.72], [0, 1]);

  const stepText = useTransform(smooth, (v) => {
    if (activeTab === 0) return "Phase 1: Ingesting bank statement PDF";
    if (activeTab === 1) return "Phase 2: Extracting & tokenizing transaction rows";
    if (activeTab === 2) return "Phase 3: Flagging unverified transfers into Review Queue";
    if (activeTab === 3) return "Phase 4: Verified transactions committed to permanent ledger";
    if (v < 0.25) return "Phase 1: Ingesting bank statement PDF";
    if (v < 0.52) return "Phase 2: Extracting & tokenizing transaction rows";
    if (v < 0.76) return "Phase 3: Flagging unverified transfers into Review Queue";
    return "Phase 4: Verified transactions committed to permanent ledger";
  });

  // Calculate effective styles considering manual tab overrides
  const effectiveDocOpacity = activeTab !== null ? 1 : scrollDocO;
  const effectiveDocX       = activeTab !== null ? 0 : scrollDocX;
  const effectiveDocTilt    = activeTab !== null ? 0 : scrollDocTilt;
  const effectiveScanTop    = activeTab === 0 ? "50%" : scrollScanTop;

  const effectiveReviewO    = activeTab === 2 || activeTab === 3 ? 1 : activeTab === 0 || activeTab === 1 ? 0 : scrollReviewO;
  const effectiveReviewY    = activeTab !== null ? 0 : scrollReviewY;

  const effectiveLedgerO    = activeTab === 3 ? 1 : activeTab === 0 || activeTab === 1 || activeTab === 2 ? 0.3 : scrollLedgerO;
  const effectiveLedgerY    = activeTab !== null ? 0 : scrollLedgerY;

  function toggleReview(id) {
    setReviewedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section
      className="border-y relative overflow-hidden"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-paper-raised)",
      }}
    >
      {/* Intro Header */}
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-6 sm:pt-14 sm:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-5% 0px" }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <p
              className="font-figure text-[10px] uppercase tracking-[0.3em] mb-2"
              style={{ color: "var(--color-horizon)" }}
            >
              Scene 2 — Statement Intelligence
            </p>
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
      </div>

      {/* Tall Scroll Pipeline Container */}
      <div ref={containerRef} style={{ height: "165vh", position: "relative" }}>
        <div
          style={{
            position: "sticky",
            top: "6vh",
            minHeight: "78vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
          className="mx-auto max-w-6xl px-6 py-3"
        >
          {/* Status Tracker & Interactive Stage Filter Tabs */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--color-line)" }}>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--color-horizon)" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--color-horizon)" }} />
              </span>
              <motion.span className="font-figure text-xs tracking-wider uppercase font-medium" style={{ color: "var(--color-horizon)" }}>
                {stepText}
              </motion.span>
            </div>

            {/* Interactive Stage Tab Selectors */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: null, label: "Live Scroll" },
                { id: 0, label: "1. Scan PDF" },
                { id: 1, label: "2. Extracted" },
                { id: 2, label: "3. Review Queue (2)" },
                { id: 3, label: "4. Clean Ledger" },
              ].map((tab) => (
                <button
                  key={String(tab.id)}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-figure whitespace-nowrap transition-colors border ${
                    activeTab === tab.id
                      ? "border-horizon text-horizon bg-horizon-dim font-semibold"
                      : "border-line text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Visual Transformation Stage */}
          <div className="grid gap-8 lg:grid-cols-12 items-center relative">
            {/* Left Column: Bank Statement Document with Laser Scan */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                style={{
                  x: effectiveDocX,
                  opacity: effectiveDocOpacity,
                  rotateY: effectiveDocTilt,
                  transformPerspective: 1000,
                }}
                className="w-full max-w-md rounded-2xl border p-4 shadow-2xl relative overflow-hidden group"
                style={{
                  borderColor: "var(--color-line)",
                  background: "var(--color-paper)",
                }}
              >
                <div
                  className="rounded-xl border p-4 font-editorial relative overflow-hidden"
                  style={{
                    borderColor: "var(--color-line)",
                    background: "var(--color-paper)",
                  }}
                >
                  {/* Laser Scan Line with dynamic glow */}
                  <motion.div
                    className="absolute inset-x-0 h-1 pointer-events-none z-10"
                    style={{
                      top: effectiveScanTop,
                      background: "linear-gradient(90deg, transparent, var(--color-horizon), #c9a227, transparent)",
                      boxShadow: "0 0 16px var(--color-horizon), 0 0 30px rgba(214,255,98,0.4)",
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
                    <span className="rounded-md px-2 py-0.5 font-figure text-[9px] uppercase tracking-wide bg-horizon-dim text-horizon font-semibold">
                      PDF Verified
                    </span>
                  </div>

                  {/* Document Raw Rows */}
                  <div className="space-y-2">
                    {SAMPLE_TXNS.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-xs py-1.5 border-b last:border-0 font-figure transition-colors hover:bg-black/5 dark:hover:bg-white/5 px-1.5 rounded"
                        style={{ borderColor: "var(--color-line)" }}
                      >
                        <div>
                          <p className="text-ink text-[11px] font-medium truncate max-w-[180px]">{t.desc}</p>
                          <p className="text-[9px] text-ink-soft">{t.date}</p>
                        </div>
                        <span className="text-ink font-semibold">{t.amount}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-2 border-t flex justify-between items-center text-[10px] font-figure text-ink-soft" style={{ borderColor: "var(--color-line)" }}>
                    <span>5 entries identified</span>
                    <span className="flex items-center gap-1" style={{ color: "var(--color-horizon)" }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-horizon animate-ping" />
                      Auto-extracting...
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Split Outcome (Review Queue vs Verified Ledger) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Divergence 1: Review Queue (Amber Warning Card with Interactive Decisioning) */}
              <motion.div
                style={{
                  y: effectiveReviewY,
                  opacity: effectiveReviewO,
                }}
              >
                <div
                  className="rounded-2xl border p-4 shadow-sm relative overflow-hidden transition-all"
                  style={{
                    borderColor: "rgba(212,168,38,0.45)",
                    background: "rgba(212,168,38,0.07)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <h4 className="font-screamer text-sm tracking-wider uppercase" style={{ color: "#e5c76b" }}>
                        Action Required · Review Queue ({2 - (reviewedItems[2] ? 1 : 0) - (reviewedItems[5] ? 1 : 0)} Pending)
                      </h4>
                    </div>
                    <span className="font-figure text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full">
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
                            background: isApproved ? "rgba(16,217,138,0.08)" : "var(--color-paper-raised)",
                            borderColor: isApproved ? "rgba(16,217,138,0.4)" : "rgba(212,168,38,0.3)",
                          }}
                        >
                          <div>
                            <p className="font-editorial text-ink font-medium flex items-center gap-1.5">
                              {r.desc}
                              {isApproved && <span className="text-emerald-400 text-[10px]">✓ Approved</span>}
                            </p>
                            <p className="text-[10px] font-figure text-amber-400 mt-0.5">
                              {isApproved ? "Committed to ledger" : "Ambiguous transfer — Needs category"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 font-figure">
                            <span className="text-ink font-semibold">{r.amount}</span>
                            <button
                              type="button"
                              onClick={() => toggleReview(r.id)}
                              className={`rounded px-2.5 py-1 text-[10px] uppercase font-semibold transition-all ${
                                isApproved
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                  : "bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30"
                              }`}
                            >
                              {isApproved ? "Approved ✓" : "Confirm Category"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Divergence 2: Approved Ledger (Lime Success Card) */}
              <motion.div
                style={{
                  y: effectiveLedgerY,
                  opacity: effectiveLedgerO,
                }}
              >
                <div
                  className="rounded-2xl border p-4 shadow-sm"
                  style={{
                    borderColor: "var(--color-line)",
                    background: "var(--color-paper)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <h4 className="font-screamer text-sm tracking-wider uppercase text-ink">
                        Verified Ledger Records ({3 + (reviewedItems[2] ? 1 : 0) + (reviewedItems[5] ? 1 : 0)} Committed)
                      </h4>
                    </div>
                    <span className="font-figure text-[10px] font-medium" style={{ color: "var(--color-horizon)" }}>
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
                            className="rounded px-2 py-0.5 text-[9px] uppercase tracking-wide font-medium"
                            style={{
                              background: "var(--color-horizon-dim)",
                              color: "var(--color-horizon)",
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
              </motion.div>
            </div>
          </div>
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
    color: "#d6ff62",
    formula: "Savings / Gross Inflows = 31.2% (Benchmark: >20%)",
  },
  {
    id: "emergency",
    label: "Emergency Fund",
    score: 54,
    status: "3.8 months runway",
    color: "#c9a227",
    formula: "Liquid Bank Cash / Monthly Expenses = 3.8 months (Target: 6 months)",
  },
  {
    id: "debt",
    label: "Debt Load",
    score: 85,
    status: "Low DTI (12%)",
    color: "#10d98a",
    formula: "Debt Servicing EMI / Total Income = 12% (Benchmark: <30%)",
  },
  {
    id: "investment",
    label: "Investment Mix",
    score: 72,
    status: "Balanced Equity/Gold",
    color: "#d6ff62",
    formula: "Asset Diversification Index: Equities 55%, MF 25%, Gold 15%, FD 5%",
  },
  {
    id: "stability",
    label: "Income Stability",
    score: 82,
    status: "Consistent salary",
    color: "#c9a227",
    formula: "Variance coefficient of verified monthly credits over trailing 6 months",
  },
];

function ScoreRadialGauge({ progress, selectedPillar, simulated }) {
  const R = 100;
  const CIRC = 2 * Math.PI * R;
  const TARGET_SCORE = selectedPillar ? selectedPillar.score : (simulated ? 84 : 74);

  const arcFill = useTransform(progress, [0.08, 0.65], [0, 1]);
  const numberVal = useTransform(progress, [0.08, 0.65], [0, TARGET_SCORE]);
  const strokeDash = useTransform(arcFill, (v) => CIRC - v * (TARGET_SCORE / 100) * CIRC);
  const scoreText = useTransform(numberVal, (v) => Math.round(v).toString());

  return (
    <div className="relative flex items-center justify-center">
      {/* Background Pulse Glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-500"
        style={{
          width: 260,
          height: 260,
          background: simulated
            ? "radial-gradient(circle, rgba(16,217,138,0.25) 0%, rgba(214,255,98,0.12) 50%, transparent 70%)"
            : "radial-gradient(circle, rgba(214,255,98,0.18) 0%, rgba(212,168,38,0.08) 50%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      <svg width="260" height="260" viewBox="0 0 260 260" aria-label="FinScore 74 out of 100">
        <defs>
          <linearGradient id="finScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9a227" />
            <stop offset="45%" stopColor={simulated ? "#10d98a" : "#e5c76b"} />
            <stop offset="85%" stopColor={simulated ? "#10d98a" : "#d6ff62"} />
          </linearGradient>
        </defs>

        {/* Circular gauge track */}
        <circle
          cx="130"
          cy="130"
          r={R}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="14"
          opacity="0.6"
        />

        {/* Concentric tick marks */}
        {Array.from({ length: 36 }, (_, i) => {
          const angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
          const inner = R - 11;
          const outer = R - 3;
          const x1 = Math.round((130 + inner * Math.cos(angle)) * 100) / 100;
          const y1 = Math.round((130 + inner * Math.sin(angle)) * 100) / 100;
          const x2 = Math.round((130 + outer * Math.cos(angle)) * 100) / 100;
          const y2 = Math.round((130 + outer * Math.sin(angle)) * 100) / 100;
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
          cx="130"
          cy="130"
          r={R}
          fill="none"
          stroke="url(#finScoreGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          style={{ strokeDashoffset: strokeDash }}
          transform="rotate(-90 130 130)"
        />

        {/* Center Numbers */}
        <motion.text
          x="130"
          y="120"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-display)",
            fill: "var(--color-ink)",
            fontSize: 56,
            fontWeight: 300,
          }}
        >
          {selectedPillar ? selectedPillar.score : (simulated ? "84" : scoreText)}
        </motion.text>
        <text
          x="130"
          y="142"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fill: "var(--color-ink-soft)",
            fontSize: 12,
            letterSpacing: 2,
          }}
        >
          / 100
        </text>
        <text
          x="130"
          y="164"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fill: simulated ? "#10d98a" : "var(--color-horizon)",
            fontSize: 10,
            letterSpacing: 3,
            fontWeight: 600,
          }}
        >
          {selectedPillar
            ? selectedPillar.label.toUpperCase()
            : simulated
            ? "EXCELLENT · +10 PTS"
            : "GOOD · COMPOSITE"}
        </text>
      </svg>
    </div>
  );
}

function SceneFinScore() {
  const outerRef = useRef(null);
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [simulated, setSimulated] = useState(false);

  const { scrollYProgress } = useScroll({ target: outerRef, offset: ["start center", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 85, damping: 25 });

  return (
    <section className="border-b relative" style={{ borderColor: "var(--color-line)" }}>
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-6 sm:pt-14 sm:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-5% 0px" }}
        >
          <p
            className="font-figure text-[10px] uppercase tracking-[0.3em] mb-3"
            style={{ color: "var(--color-horizon)" }}
          >
            Scene 3 — FinScore
          </p>
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
      </div>

      <div ref={outerRef} style={{ height: "140vh" }}>
        <div
          style={{ position: "sticky", top: "8vh", minHeight: "76vh" }}
          className="flex items-center"
        >
          <div className="mx-auto max-w-6xl w-full px-6 grid gap-12 lg:grid-cols-12 items-center">
            {/* Left: Animated Radial Gauge & Interactive Strategy Simulator */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <ScoreRadialGauge progress={smooth} selectedPillar={selectedPillar} simulated={simulated} />

              {/* Strategy Simulator Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPillar(null);
                  setSimulated(!simulated);
                }}
                className={`mt-4 px-3.5 py-1.5 rounded-full text-xs font-figure border flex items-center gap-2 transition-all shadow-sm ${
                  simulated
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold"
                    : "border-line text-ink-soft hover:text-ink hover:border-horizon"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-horizon" />
                <span>{simulated ? "Active: +₹25k Emergency Reserve (Reset)" : "Simulate: Add ₹25k Reserve (+10 pts)"}</span>
              </button>

              {selectedPillar && (
                <button
                  type="button"
                  onClick={() => setSelectedPillar(null)}
                  className="mt-2 text-[11px] font-figure text-horizon hover:underline"
                >
                  Reset to Composite View
                </button>
              )}
            </div>

            {/* Right: Detailed Component Progress Breakdown (Interactive) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p
                  className="font-figure text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: "var(--color-horizon)" }}
                >
                  Composite Sub-Scores (Click to inspect formula)
                </p>
                {simulated && (
                  <span className="font-figure text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Runway upgraded: 3.8 → 5.4 mos
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {FINSCORE_PILLARS.map((p, i) => {
                  const isSelected = selectedPillar?.id === p.id;
                  const currentScore = (simulated && p.id === "emergency") ? 88 : p.score;
                  const currentStatus = (simulated && p.id === "emergency") ? "5.4 months runway (Boosted)" : p.status;
                  const currentColor = (simulated && p.id === "emergency") ? "#10d98a" : p.color;

                  return (
                    <motion.div
                      key={p.label}
                      initial={{ opacity: 0, x: 24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      viewport={{ once: true }}
                      onClick={() => setSelectedPillar(isSelected ? null : p)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-horizon ring-1 ring-horizon bg-white/[0.04]"
                          : "hover:border-white/30"
                      }`}
                      style={{
                        background: "var(--color-paper-raised)",
                        borderColor: isSelected ? "var(--color-horizon)" : "var(--color-line)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-editorial text-ink font-medium text-sm flex items-center gap-1.5">
                          <span>{p.label}</span>
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-horizon" />}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-figure text-[11px] text-ink-soft">{currentStatus}</span>
                          <span className="font-figure text-sm font-semibold" style={{ color: currentColor }}>
                            {currentScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Progress Track */}
                      <div className="h-1.5 w-full rounded-full" style={{ background: "var(--color-line)" }}>
                        <motion.div
                          className="h-full rounded-full transition-all duration-700"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${currentScore}%` }}
                          transition={{ delay: i * 0.1 + 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                          viewport={{ once: true }}
                          style={{ background: currentColor, width: `${currentScore}%` }}
                        />
                      </div>

                      {/* Explanatory Formula Card on Selection */}
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2.5 pt-2 border-t border-line text-[11px] font-figure text-horizon flex items-center gap-1.5"
                        >
                          <HelpCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{p.formula}</span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-[10px] font-editorial pt-2" style={{ color: "var(--color-ink-soft)", opacity: 0.6 }}>
                Every component maps strictly to actual ledger rows. No fabricated benchmarks or black-box predictions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Scene D — FinAI (Layered 3D Perspective Demo + Interactive Prompts)  */
/* ═══════════════════════════════════════════════════════════════════ */

const AI_SCENARIOS = [
  {
    id: "spending",
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
    id: "emergency",
    prompt: "How many months of emergency runway do I currently have?",
    responses: [
      "Based on trailing 3-month living expenses of ₹37,500/mo, your liquid cash of ₹1,42,000 gives 3.8 months of runway.",
      "Your recommended minimum is 6 months (₹2,25,000).",
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
  const outerRef = useRef(null);
  const terminalRef = useRef(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("spending");
  const [terminalTilt, setTerminalTilt] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({ target: outerRef, offset: ["start center", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 85, damping: 25 });

  const tiltX = useTransform(smooth, [0, 1], [4, -4]);
  const tiltY = useTransform(smooth, [0, 1], [-4, 4]);

  const inViewRef = useRef(null);
  const inView = useInView(inViewRef, { once: true, margin: "-10% 0px" });

  const activeScenario = AI_SCENARIOS.find((s) => s.id === selectedScenarioId) || AI_SCENARIOS[0];

  function handleTerminalMouseMove(e) {
    if (!terminalRef.current) return;
    const rect = terminalRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 8;
    setTerminalTilt({ x: y, y: x });
  }

  function handleTerminalMouseLeave() {
    setTerminalTilt({ x: 0, y: 0 });
  }

  return (
    <section
      className="border-b relative overflow-hidden"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-paper-raised)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-6 sm:pt-14 sm:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-5% 0px" }}
        >
          <p
            className="font-figure text-[10px] uppercase tracking-[0.3em] mb-3"
            style={{ color: "var(--color-horizon)" }}
          >
            Scene 4 — FinAI
          </p>
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
      </div>

      <div ref={outerRef} style={{ height: "140vh" }}>
        <div
          style={{ position: "sticky", top: "8vh", minHeight: "76vh" }}
          className="flex items-center"
        >
          <div ref={inViewRef} className="mx-auto max-w-5xl w-full px-6 grid gap-8 lg:grid-cols-12 items-center">
            {/* Left 7 Cols: Floating AI Terminal Interface with 3D Tilt */}
            <motion.div
              ref={terminalRef}
              onMouseMove={handleTerminalMouseMove}
              onMouseLeave={handleTerminalMouseLeave}
              style={{
                rotateX: terminalTilt.x || tiltX,
                rotateY: terminalTilt.y || tiltY,
                transformPerspective: 1200,
              }}
              className="lg:col-span-7 transition-transform duration-200 ease-out"
            >
              <div
                className="rounded-2xl border p-5 shadow-2xl relative overflow-hidden backdrop-blur-md"
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
                  <span className="font-figure text-[10px] uppercase tracking-widest text-ink-soft flex items-center gap-1.5">
                    <Cpu className="h-3 w-3 text-horizon" />
                    FinAI Context Engine · Live Test
                  </span>
                </div>

                {/* Scenario Prompt Chips */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {AI_SCENARIOS.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(sc.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-figure transition-colors border ${
                        selectedScenarioId === sc.id
                          ? "border-horizon text-horizon bg-horizon-dim font-semibold"
                          : "border-line text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      {sc.id === "spending" ? "Spending Spike" : sc.id === "emergency" ? "Emergency Runway" : "Portfolio Drift"}
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
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* User Query */}
                    <div className="flex justify-end">
                      <div
                        className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs sm:text-sm font-editorial max-w-[85%] shadow-sm"
                        style={{
                          background: "var(--color-horizon)",
                          color: "#05080f",
                          fontWeight: 500,
                        }}
                      >
                        {activeScenario.prompt}
                      </div>
                    </div>

                    {/* FinAI Structured Response */}
                    <div className="space-y-2.5 pt-1">
                      {activeScenario.responses.map((step, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -14 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 + idx * 0.12, duration: 0.35 }}
                          className="rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-editorial"
                          style={{
                            background: "var(--color-paper-raised)",
                            borderColor: "var(--color-line)",
                            color: "var(--color-ink-soft)",
                          }}
                        >
                          {step}
                        </motion.div>
                      ))}

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-2 pt-2 px-1"
                      >
                        <div className="h-2 w-2 rounded-full animate-ping" style={{ background: "var(--color-horizon)" }} />
                        <span className="font-figure text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-horizon)" }}>
                          Ledger Verification: {activeScenario.citation}
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Right 5 Cols: Contextual Telemetry Cards */}
            <div className="lg:col-span-5 space-y-3">
              <p
                className="font-figure text-[10px] uppercase tracking-[0.25em] mb-4"
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
                  className="space-y-3"
                >
                  {activeScenario.telemetry.map((card, i) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className="rounded-xl border p-3.5 flex items-center justify-between"
                      style={{
                        background: "var(--color-paper-raised)",
                        borderColor: "var(--color-line)",
                      }}
                    >
                      <div>
                        <p className="font-editorial text-ink text-xs font-medium">{card.title}</p>
                        <p className="font-figure text-sm font-bold text-ink mt-0.5">{card.val}</p>
                      </div>
                      <span
                        className="font-figure text-[10px] px-2 py-0.5 rounded font-semibold"
                        style={{
                          background: card.bad ? "rgba(248,113,113,0.15)" : "rgba(16,217,138,0.15)",
                          color: card.bad ? "#f87171" : "#10d98a",
                        }}
                      >
                        {card.drift}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              <p className="text-[10px] font-editorial pt-1 text-ink-soft" style={{ opacity: 0.6 }}>
                Click different scenario pills above to test FinAI&apos;s verified query-response mechanism.
              </p>
            </div>
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
