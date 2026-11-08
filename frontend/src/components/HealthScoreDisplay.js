"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card } from "@/components/ui";
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";

export const BREAKDOWN_ORDER = [
  "savingsRate",
  "budgetDiscipline",
  "emergencyFund",
  "diversification",
  "debtRatio",
];

export const BREAKDOWN_LABELS = {
  savingsRate: "Savings & Cash Flow",
  budgetDiscipline: "Budget Management",
  emergencyFund: "Emergency Fund",
  diversification: "Investment Diversification",
  debtRatio: "Debt Health",
};

export const BREAKDOWN_WEIGHTS = {
  savingsRate: "30%",
  budgetDiscipline: "20%",
  emergencyFund: "20%",
  diversification: "20%",
  debtRatio: "10%",
};

const currencyFormatter = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const tooltipStyle = {
  backgroundColor: "var(--color-paper-raised)",
  borderColor: "var(--color-line)",
  borderRadius: "10px",
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
  fontSize: "12px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
};

function getScoreRating(score) {
  if (score >= 85) return { label: "Excellent", color: "text-signal-pos", bg: "bg-signal-pos/10", border: "border-signal-pos/20" };
  if (score >= 70) return { label: "Good", color: "text-signal-pos", bg: "bg-signal-pos/10", border: "border-signal-pos/20" };
  if (score >= 50) return { label: "Fair", color: "text-horizon", bg: "bg-horizon/10", border: "border-horizon/20" };
  return { label: "Needs Attention", color: "text-signal-neg", bg: "bg-signal-neg/10", border: "border-signal-neg/20" };
}

// ============================================================================
// PILLAR CONFIG — colors, weights, labels, and clear everyday explanations
// ============================================================================
const PILLAR_CONFIG = [
  {
    key: "savingsRate",
    label: "Savings & Cash Flow",
    shortLabel: "Savings",
    weight: 0.30,
    color: "#34d399",   // emerald
    explanation: "How much of your income you keep each month after expenses. A healthy target is 20% or more.",
  },
  {
    key: "budgetDiscipline",
    label: "Budget Management",
    shortLabel: "Budget",
    weight: 0.20,
    color: "#60a5fa",   // blue
    explanation: "How well your spending stays within category limits, even if total spending seems okay.",
  },
  {
    key: "emergencyFund",
    label: "Emergency Fund",
    shortLabel: "Emergency",
    weight: 0.20,
    color: "#f59e0b",   // amber
    explanation: "How many months of basic living costs your cash and liquid savings can cover if income stops.",
  },
  {
    key: "diversification",
    label: "Investment Diversification",
    shortLabel: "Investments",
    weight: 0.20,
    color: "#a78bfa",   // violet
    explanation: "How well your investments are spread across different types so you don't risk too much on one thing.",
  },
  {
    key: "debtRatio",
    label: "Debt Health",
    shortLabel: "Debt",
    weight: 0.10,
    color: "#f87171",   // red
    explanation: "How comfortable your loan and EMI payments are compared to what you make each month.",
  },
];

/**
 * Build SVG arc path for a donut segment.
 * cx/cy = center, r = radius, startAngle/endAngle in degrees (0 = 12 o'clock, clockwise).
 */
function describeArc(cx, cy, r, startAngle, endAngle) {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ============================================================================
// 1. HEALTH GAUGE WITH RATING & DELTA  —  multicolored segmented donut
//
// Segment sizing follows the SAME logic as the backend:
//   effectiveWeight  = nominalWeight / totalAvailableWeight   (re-normalised)
//   contribution_pts = pillarScore × effectiveWeight          (0-100 scale pts)
//   trackDeg         = effectiveWeight × usableDeg            (full-weight band)
//   arcDeg           = (pillarScore / 100) × trackDeg         (filled portion)
//
// Data source: componentDetails[key].score  (always 0-100 or null)
//   — NOT breakdown.savingsRate which is the raw savings-rate percentage.
// ============================================================================
export function HealthGauge({
  score = 0,
  delta = 0,
  size = "large",
  subtitle = "Monthly Health Score",
  breakdown = null,
  componentDetails = null,
}) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [hoverSource, setHoverSource] = useState(null); // 'donut' | 'legend' | null
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const validScore = typeof score === "number" && !isNaN(score) ? score : 0;
  const rating = getScoreRating(validScore);

  // ---- donut geometry ----
  const isSmall = size === "small";
  const svgSize = isSmall ? 120 : 200;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const r = isSmall ? 44 : 76;
  const strokeWidth = isSmall ? 9 : 14;
  const GAP_DEG = isSmall ? 3 : 4;   // angular gap between pillar bands
  const MIN_ARC_DEG = 3.5;          // min visible fill arc so small non-zero scores stand out clearly

  // ---- derive available pillars from componentDetails.score (canonical 0-100 source) ----
  const available = PILLAR_CONFIG.filter((p) => {
    if (!componentDetails) return false;
    const d = componentDetails[p.key];
    return d && d.score !== null && d.score !== undefined;
  });
  const missing = PILLAR_CONFIG.filter((p) => !available.includes(p));

  // Re-normalised effective weights — mirrors the backend totalWeight calculation
  const totalNominalWeight = available.reduce((s, p) => s + p.weight, 0) || 1;

  const numSegments = available.length;
  const totalGapDeg = numSegments * GAP_DEG;
  const usableDeg = 360 - totalGapDeg;

  let segments = null;
  if (componentDetails && numSegments > 0) {
    segments = [];
    let cursor = 0;
    available.forEach((pillar, i) => {
      const detail = componentDetails[pillar.key];
      const pillarScore = Math.max(0, Math.min(100, detail.score));
      const effectiveWeight = pillar.weight / totalNominalWeight;
      // contribution_pts = pillarScore × effectiveWeight  (same arithmetic as backend)
      const contribution = Math.round(pillarScore * effectiveWeight);
      const trackDeg = effectiveWeight * usableDeg;
      const rawArcDeg = (pillarScore / 100) * trackDeg;
      // Guarantee visible presence for non-zero scores; 0 score has 0 fill but visible track
      const arcDeg = pillarScore > 0 ? Math.max(MIN_ARC_DEG, rawArcDeg) : 0;

      const startAngle = cursor + i * GAP_DEG;
      segments.push({
        ...pillar,
        pillarScore,
        effectiveWeight,
        contribution,
        arcDeg,
        trackDeg,
        startAngle,
        endAngle: startAngle + arcDeg,
        trackEnd: startAngle + trackDeg,
      });
      cursor += trackDeg;
    });
  }

  const hoveredPillar = hoveredKey ? PILLAR_CONFIG.find((p) => p.key === hoveredKey) : null;
  const hoveredSeg    = hoveredKey && segments ? segments.find((s) => s.key === hoveredKey) : null;
  const hoveredDetail = hoveredKey && componentDetails ? componentDetails[hoveredKey] : null;

  // Tooltip position relative to the wrapper div (data-donut-wrapper)
  const handleMouseMove = (e, key) => {
    const rect = e.currentTarget.closest("[data-donut-wrapper]").getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHoveredKey(key);
    setHoverSource("donut");
  };

  const handleMouseLeave = () => {
    setHoveredKey(null);
    setHoverSource(null);
  };

  // Smart tooltip placement: if cursor is on right half, render to the left to prevent clipping
  const tooltipWidth = 216;
  const tooltipLeft = tooltipPos.x > cx
    ? Math.max(4, tooltipPos.x - tooltipWidth - 10)
    : Math.min(svgSize - 20, tooltipPos.x + 14);
  const tooltipTop = Math.max(4, Math.min(svgSize - 110, tooltipPos.y - 25));

  return (
    <div
      className="relative mx-auto flex flex-col items-center"
      role="img"
      aria-label={`Financial health score: ${Math.round(validScore)} out of 100 — ${rating.label}`}
    >
      {/* SVG Donut */}
      <div
        data-donut-wrapper=""
        className="relative grid place-items-center"
        style={{ width: svgSize, height: svgSize }}
      >
        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          width={svgSize}
          height={svgSize}
          className="overflow-visible"
          aria-hidden="true"
        >
          {segments ? (
            segments.map((seg) => (
              <g
                key={seg.key}
                className="cursor-pointer outline-none"
                onMouseMove={(e) => handleMouseMove(e, seg.key)}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label={`${seg.label}: ${seg.pillarScore}/100, contributes ${seg.contribution} pts (weight ${Math.round(seg.weight * 100)}%)`}
                tabIndex={0}
                onFocus={() => {
                  setHoveredKey(seg.key);
                  setHoverSource("donut");
                  const midAngle = (seg.startAngle + seg.trackEnd) / 2;
                  const toRad = (d) => ((d - 90) * Math.PI) / 180;
                  setTooltipPos({
                    x: cx + r * Math.cos(toRad(midAngle)),
                    y: cy + r * Math.sin(toRad(midAngle)),
                  });
                }}
                onBlur={handleMouseLeave}
              >
                {/* Expanded invisible hit area across entire track to make small segments easily clickable/hoverable */}
                <path
                  d={describeArc(cx, cy, r, seg.startAngle, seg.trackEnd)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={strokeWidth + 10}
                  strokeLinecap="butt"
                />
                {/* Dim track — shows the full weight band allocated to this pillar */}
                <path
                  d={describeArc(cx, cy, r, seg.startAngle, seg.trackEnd)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  opacity={hoveredKey === seg.key ? 0.35 : 0.18}
                  style={{ transition: "opacity 0.18s ease" }}
                />
                {/* Filled arc — proportional to actual pillar score */}
                {seg.arcDeg > 0 && (
                  <path
                    d={describeArc(cx, cy, r, seg.startAngle, seg.endAngle)}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    opacity={hoveredKey && hoveredKey !== seg.key ? 0.35 : 1}
                    style={{
                      transition: "opacity 0.18s ease, filter 0.18s ease",
                      filter: hoveredKey === seg.key ? `drop-shadow(0 0 6px ${seg.color}dd)` : "none",
                    }}
                  />
                )}
              </g>
            ))
          ) : (
            /* Fallback single-color ring */
            <>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-line)" strokeWidth={strokeWidth} opacity="0.3" />
              <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke="var(--color-horizon)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * r}
                strokeDashoffset={(2 * Math.PI * r) * (1 - validScore / 100)}
                style={{ transformOrigin: `${cx}px ${cy}px`, transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.8s ease-out" }}
              />
            </>
          )}
        </svg>

        {/* Centre label */}
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
          <div>
            <span className={`font-figure font-bold ${isSmall ? "text-2xl" : "text-4xl"} text-ink`}>
              {Math.round(validScore)}
            </span>
            <span className="text-xs text-ink-soft/70 font-figure"> / 100</span>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-soft font-editorial font-semibold">
              {rating.label}
            </p>
          </div>
        </div>

        {/* Hover Tooltip — shown when hovering donut arcs */}
        <AnimatePresence>
          {hoveredKey && hoveredPillar && hoveredSeg && hoverSource === "donut" && (
            <motion.div
              key={hoveredKey}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.13 }}
              className="pointer-events-none absolute z-50 rounded-xl border border-line bg-paper-raised p-3 shadow-xl text-left"
              style={{ left: tooltipLeft, top: tooltipTop, width: tooltipWidth }}
            >
              {/* Pillar name */}
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: hoveredPillar.color }} />
                <span className="font-semibold text-xs text-ink font-editorial leading-tight">{hoveredPillar.label}</span>
              </div>
              {/* Score + effective weight */}
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-figure text-base font-bold text-ink">
                  {hoveredSeg.pillarScore}<span className="text-xs font-normal text-ink-soft"> / 100</span>
                </span>
                <span className="text-[10px] text-ink-soft font-editorial">
                  Weight: {Math.round(hoveredPillar.weight * 100)}%
                  {totalNominalWeight < 0.999 && (
                    <span className="ml-1 opacity-70">(eff. {Math.round(hoveredSeg.effectiveWeight * 100)}%)</span>
                  )}
                </span>
              </div>
              {/* Contribution row */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-line">
                <span className="text-[10px] text-ink-soft font-editorial">Contribution to score</span>
                <span className="font-figure text-xs font-bold text-ink">+{hoveredSeg.contribution} pts</span>
              </div>
              {/* Explanation */}
              <p className="text-[11px] text-ink-soft leading-relaxed font-editorial">
                {hoveredDetail?.explanation || hoveredPillar.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Delta badge ---- */}
      <div className="mt-2 flex items-center gap-2">
        {delta !== undefined && delta !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold font-figure px-2 py-0.5 rounded-full ${
              delta > 0 ? "bg-signal-pos/10 text-signal-pos" : "bg-signal-neg/10 text-signal-neg"
            }`}
          >
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta > 0 ? `+${delta}` : delta} vs last month
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-ink-soft font-editorial">{subtitle}</p>}

      {/* Compact legend — all 5 pillars; N/A for unavailable */}
      {!isSmall && (
        <div className="mt-4 w-full max-w-xs">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {PILLAR_CONFIG.map((p) => {
              // Use componentDetails for the 0-100 score, not breakdown
              const detail = componentDetails?.[p.key];
              const pillarScore = detail?.score ?? null;
              const isNA = pillarScore === null || pillarScore === undefined;
              return (
                <button
                  key={p.key}
                  type="button"
                  onMouseEnter={() => {
                    if (!isNA) {
                      setHoveredKey(p.key);
                      setHoverSource("legend");
                    }
                  }}
                  onMouseLeave={handleMouseLeave}
                  onFocus={() => {
                    if (!isNA) {
                      setHoveredKey(p.key);
                      setHoverSource("legend");
                    }
                  }}
                  onBlur={handleMouseLeave}
                  className={`flex items-center gap-1.5 text-left text-[11px] font-editorial rounded px-1.5 py-1 transition-colors ${
                    isNA ? "opacity-40 cursor-default" : "cursor-pointer hover:bg-ink/5"
                  } ${hoveredKey === p.key ? "bg-ink/10 ring-1 ring-ink/10" : ""}`}
                  aria-label={`${p.label}: ${isNA ? "Unavailable" : `${pillarScore}/100`}`}
                  disabled={isNA}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: isNA ? "var(--color-line)" : p.color }}
                  />
                  <span className={`${hoveredKey === p.key ? "text-ink font-semibold" : "text-ink-soft"} truncate`}>
                    {p.shortLabel}
                  </span>
                  <span className={`ml-auto font-figure font-semibold tabular-nums ${isNA ? "text-ink-soft/50" : "text-ink"}`}>
                    {isNA ? "N/A" : pillarScore}
                  </span>
                </button>
              );
            })}
          </div>
          {missing.length > 0 && (
            <p className="mt-2 text-[10px] text-ink-soft/60 font-editorial text-center leading-relaxed">
              {missing.map((p) => p.shortLabel).join(", ")} excluded — no data reported
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. DATA CONFIDENCE & COMPLETENESS BADGE
// ============================================================================
export function ConfidenceBadge({ confidence }) {
  const [showDetails, setShowDetails] = useState(false);
  if (!confidence) return null;

  const { score, level, trackedMetrics = [], missingMetrics = [] } = confidence;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-editorial font-medium border border-line bg-paper-raised hover:bg-paper cursor-pointer transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-horizon" />
        <span className="text-ink-soft">Confidence:</span>
        <span className="font-semibold text-ink">{level} ({score}%)</span>
        <Info className="h-3 w-3 text-ink-soft/70 ml-0.5" />
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 mt-2 z-30 w-72 rounded-xl border border-line bg-paper-raised p-4 shadow-xl text-xs font-editorial"
          >
            <div className="flex items-center justify-between pb-2 border-b border-line mb-2">
              <span className="font-semibold text-ink">Data Completeness</span>
              <span className="font-figure font-bold text-horizon">{score}%</span>
            </div>
            <p className="text-ink-soft mb-3 leading-relaxed">
              When specific data is missing (e.g. debt or emergency goals), FinSight never assumes 0. Weights redistribute dynamically across verified components.
            </p>

            {trackedMetrics.length > 0 && (
              <div className="mb-2">
                <span className="text-[11px] font-semibold text-signal-pos uppercase tracking-wider block mb-1">
                  Tracked Pillars ({trackedMetrics.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {trackedMetrics.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded bg-signal-pos/10 text-signal-pos text-[11px]">
                      ✓ {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingMetrics.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-horizon uppercase tracking-wider block mb-1">
                  Excluded / Not Reported ({missingMetrics.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {missingMetrics.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded bg-horizon/10 text-ink-soft text-[11px]">
                      • {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// 3. WEEKLY MONITORING VIEW
// ============================================================================
export function WeeklyMonitoringView({ weeklyData, onSelectWeek }) {
  if (!weeklyData) return null;

  const {
    selectedWeek = 1,
    weeksInMonth = [1, 2, 3, 4],
    income = 0,
    expenses = 0,
    netCashFlow = 0,
    budgetUsage,
    weekOverWeek,
    unusualSpending,
    alerts = [],
    categoryBreakdown = [],
    weeklyTrend = [],
    month,
    year,
  } = weeklyData;

  const pacing = budgetUsage || {};
  const isPacingOver = pacing.pacingStatus === "ahead_of_budget";

  return (
    <div className="space-y-6">
      {/* Week Selector Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="font-screamer text-xl text-ink tracking-wide uppercase">
            Weekly Financial Monitoring
          </h2>
          <p className="text-xs text-ink-soft font-editorial mt-0.5">
            Track your weekly cash flow and check if your spending is on pace for month {month}/{year}.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-paper p-1 rounded-lg border border-line">
          {weeksInMonth.map((wNum) => (
            <button
              key={wNum}
              type="button"
              onClick={() => onSelectWeek && onSelectWeek(wNum)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedWeek === wNum
                  ? "bg-horizon text-[#0f1b33] font-bold shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-ink/5"
              }`}
            >
              Week {wNum}
            </button>
          ))}
        </div>
      </div>

      {/* Smart Alerts Banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-horizon/30 bg-horizon/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-horizon font-editorial">
            <Zap className="h-4 w-4" />
            <span>Weekly Insights & Alerts</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs font-editorial text-ink">
                <span className="text-horizon font-bold">•</span>
                <span>{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Core Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-1">
          <p className="text-xs text-ink-soft uppercase tracking-wide font-editorial">Money In (Weekly Income)</p>
          <p className="font-figure text-2xl font-bold text-signal-pos">+{currencyFormatter(income)}</p>
          <p className="text-[11px] text-ink-soft font-editorial">Earned in Week {selectedWeek}</p>
        </Card>

        <Card className="space-y-1">
          <p className="text-xs text-ink-soft uppercase tracking-wide font-editorial">Money Out (Weekly Spending)</p>
          <p className="font-figure text-2xl font-bold text-signal-neg">−{currencyFormatter(expenses)}</p>
          <p className="text-[11px] text-ink-soft font-editorial">
            {weekOverWeek?.changePct !== null && weekOverWeek?.changePct !== undefined ? (
              <span className={weekOverWeek.changePct > 0 ? "text-signal-neg font-semibold" : "text-signal-pos font-semibold"}>
                {weekOverWeek.changePct > 0 ? `+${weekOverWeek.changePct}%` : `${weekOverWeek.changePct}%`} vs last week
              </span>
            ) : (
              "First monitoring week"
            )}
          </p>
        </Card>

        <Card className="space-y-1">
          <p className="text-xs text-ink-soft uppercase tracking-wide font-editorial">Money Left Over (Net Cash Flow)</p>
          <p className={`font-figure text-2xl font-bold ${netCashFlow >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
            {netCashFlow >= 0 ? "+" : "−"}{currencyFormatter(Math.abs(netCashFlow))}
          </p>
          <p className="text-[11px] text-ink-soft font-editorial">
            {netCashFlow >= 0 ? "Net weekly savings retained" : "Weekly deficit covered by reserves"}
          </p>
        </Card>

        <Card className="space-y-1">
          <p className="text-xs text-ink-soft uppercase tracking-wide font-editorial">Monthly Budget Pacing</p>
          <div className="flex items-baseline gap-2">
            <span className="font-figure text-2xl font-bold text-ink">{pacing.usagePct || 0}%</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPacingOver ? "bg-signal-neg/10 text-signal-neg" : "bg-signal-pos/10 text-signal-pos"
            }`}>
              {isPacingOver ? "Pacing High" : "On Track"}
            </span>
          </div>
          <p className="text-[11px] text-ink-soft font-editorial truncate">
            {currencyFormatter(pacing.monthToDateExpense || 0)} of {currencyFormatter(pacing.monthlyBudgetLimit || 0)}
          </p>
        </Card>
      </div>

      {/* Weekly Multi-week Pacing & Spending Breakdown */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-screamer text-lg text-ink tracking-wide uppercase">
              Month Spending by Week
            </h3>
            <span className="text-xs text-ink-soft font-editorial">Trend across weeks</span>
          </div>

          {weeklyTrend.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--color-ink-soft)"
                    fontSize={11}
                    fontFamily="var(--font-body)"
                    tick={{ fill: "var(--color-ink-soft)" }}
                  />
                  <YAxis
                    stroke="var(--color-ink-soft)"
                    fontSize={11}
                    fontFamily="var(--font-body)"
                    tick={{ fill: "var(--color-ink-soft)" }}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name) => [currencyFormatter(val), name === "income" ? "Income" : "Expense"]}
                  />
                  <Bar dataKey="expense" fill="var(--color-horizon)" radius={[4, 4, 0, 0]} name="Expense" />
                  <Bar dataKey="income" fill="var(--color-signal-pos)" radius={[4, 4, 0, 0]} name="Income" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-ink-soft font-editorial">
              No weekly trend data recorded yet.
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-screamer text-lg text-ink tracking-wide uppercase">
              Week {selectedWeek} Spending Breakdown
            </h3>
            <span className="text-xs text-ink-soft font-editorial">Top categories</span>
          </div>

          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3 font-editorial">
              {categoryBreakdown.slice(0, 5).map((cat, idx) => {
                const pct = expenses > 0 ? Math.round((cat.amount / expenses) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink font-medium">{cat.name}</span>
                      <span className="font-figure font-semibold text-ink">
                        {currencyFormatter(cat.amount)} <span className="text-ink-soft font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                      <div
                        className="h-full bg-horizon rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-ink-soft font-editorial">
              No expenses recorded in Week {selectedWeek}.
            </div>
          )}

          {unusualSpending?.count > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-signal-neg/20 bg-signal-neg/5 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-signal-neg shrink-0 mt-0.5" />
              <div className="text-xs font-editorial">
                <span className="font-semibold text-signal-neg block">Unusual Spending Flagged</span>
                <span className="text-ink-soft">{unusualSpending.summary}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MONTHLY PRIMARY HEALTH SCORE VIEW
// ============================================================================
export function MonthlyHealthView({ healthData }) {
  if (!healthData) return null;

  const score = healthData.score || 0;
  const delta = healthData.delta || 0;
  const breakdown = healthData.breakdown || {};
  const details = healthData.componentDetails || {};
  const confidence = healthData.confidence;
  const explainability = healthData.explainability || {};
  const monthly = healthData.monthly || {};

  return (
    <div className="space-y-8 font-editorial">
      {/* Top Banner: Primary Gauge + Decision Support Executive Card */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.8fr]">
        <Card className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <HealthGauge
            score={score}
            delta={delta}
            size="large"
            subtitle={`${monthly.monthName || "Selected Month"} ${monthly.year || ""}`}
            breakdown={breakdown}
            componentDetails={details}
          />
          <ConfidenceBadge confidence={confidence} />
        </Card>

        <Card className="flex flex-col justify-between p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-ink-soft font-semibold">
                Financial Summary
              </span>
              <span className="text-xs font-figure font-bold text-horizon">
                {score}/100 · {getScoreRating(score).label}
              </span>
            </div>
            <h3 className="font-screamer text-2xl text-ink tracking-wide uppercase">
              How your finances look this month
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              {explainability.summary ||
                "Your score evaluates how much you save, your category budget discipline, your emergency cushion, and your investment mix."}
            </p>
          </div>

          {/* Quick Pillars Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-line text-xs">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#34d399" }} />
                <span className="text-ink-soft block text-[11px]">Savings</span>
              </div>
              <span className="font-figure font-bold text-ink">
                {details.savingsRate?.displayValue || (breakdown.savingsRate !== null ? `${breakdown.savingsRate}%` : "Unavailable")}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#60a5fa" }} />
                <span className="text-ink-soft block text-[11px]">Budget</span>
              </div>
              <span className="font-figure font-bold text-ink">
                {details.budgetDiscipline?.displayValue || (breakdown.budgetDiscipline !== null ? `${breakdown.budgetDiscipline}/100` : "No Budgets Set")}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: breakdown.emergencyFund !== null ? "#f59e0b" : "var(--color-line)" }}
                />
                <span className="text-ink-soft block text-[11px]">Emergency</span>
              </div>
              <span className="font-figure font-bold text-ink">
                {details.emergencyFund?.displayValue || (breakdown.emergencyFund !== null ? `${breakdown.emergencyFund}/100` : "No Goal Set")}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "#a78bfa" }} />
                <span className="text-ink-soft block text-[11px]">Investments</span>
              </div>
              <span className="font-figure font-bold text-ink">
                {details.diversification?.displayValue || (breakdown.diversification !== null && breakdown.diversification !== undefined ? `${breakdown.diversification}/100` : "Unavailable")}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: breakdown.debtRatio !== null ? "#f87171" : "var(--color-line)" }}
                />
                <span className="text-ink-soft block text-[11px]">Debt</span>
              </div>
              <span className="font-figure font-bold text-ink">
                {details.debtRatio?.displayValue || (breakdown.debtRatio !== null ? `${breakdown.debtRatio}/100` : "Not Reported")}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top 3 Priority Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-screamer text-xl text-ink tracking-wide uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-horizon" />
            Priority Recommendations
          </h2>
          <span className="text-xs text-ink-soft">
            Simple, high-impact actions based on your numbers
          </span>
        </div>

        {explainability.topActions?.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {explainability.topActions.slice(0, 3).map((action) => (
              <Card
                key={action.rank}
                className="flex flex-col justify-between space-y-3 p-5 border-l-4 border-l-horizon hover:border-horizon transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-figure text-xs font-bold px-2 py-0.5 rounded-full bg-horizon/10 text-horizon">
                      Action #{action.rank}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                        action.priority === "High"
                          ? "bg-signal-neg/10 text-signal-neg"
                          : "bg-horizon/10 text-ink"
                      }`}
                    >
                      {action.priority} Priority
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-ink mb-1">{action.title}</h4>
                    <p className="text-xs text-ink-soft leading-relaxed">{action.action}</p>
                  </div>
                  {action.target && (
                    <div className="rounded-lg bg-horizon/10 border border-horizon/20 px-3 py-2 text-xs text-ink font-medium flex items-start gap-2">
                      <span className="text-horizon font-bold text-sm shrink-0">🎯</span>
                      <span className="leading-snug">
                        <strong className="text-horizon">Practical Target:</strong> {action.target}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-2.5 border-t border-line text-[11px] text-signal-pos font-medium">
                  <strong className="text-ink-soft font-normal">Why it matters: </strong>
                  {action.impact}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5 text-center text-xs text-ink-soft">
            You are maintaining strong financial discipline across all pillars. Keep up your regular habits!
          </Card>
        )}
      </div>

      {/* The 5 Evaluated Health Pillars */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-screamer text-xl text-ink tracking-wide uppercase">
            The 5 Financial Pillars
          </h2>
          <span className="text-xs text-ink-soft">
            Your score evaluates 5 key parts of your financial foundation
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. Savings & Cash Flow */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: "#34d399" }} />
                <span className="text-xs font-semibold text-ink-soft">Savings & Cash Flow</span>
              </div>
              <span className="text-[11px] text-ink-soft/70">Weight: 30%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-figure text-2xl font-bold text-ink">
                {details.savingsRate?.displayValue || (breakdown.savingsRate !== null ? `${breakdown.savingsRate}% saved` : "Unavailable")}
              </span>
              <span className="text-xs font-figure font-semibold text-signal-pos">
                {details.savingsRate?.score !== null && details.savingsRate?.score !== undefined ? `${details.savingsRate.score}/100` : "Unavailable"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: details.savingsRate?.score !== null && details.savingsRate?.score !== undefined ? `${Math.min(100, details.savingsRate.score)}%` : "0%",
                  backgroundColor: "#34d399",
                }}
              />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              {details.savingsRate?.explanation || "How much of your income you keep each month after expenses. A healthy target is 20% or more."}
            </p>
          </Card>

          {/* 2. Budget Management */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: "#60a5fa" }} />
                <span className="text-xs font-semibold text-ink-soft">Budget Management</span>
              </div>
              <span className="text-[11px] text-ink-soft/70">Weight: 20%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-figure text-2xl font-bold text-ink">
                {breakdown.budgetDiscipline !== null ? `${breakdown.budgetDiscipline}/100` : "No Budgets Set"}
              </span>
              <span className="text-xs font-figure font-semibold text-ink-soft">
                {monthly.categoryBudgets?.length ? `${monthly.categoryBudgets.length} Categories` : "Not Tracked"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: breakdown.budgetDiscipline !== null ? `${Math.min(100, breakdown.budgetDiscipline)}%` : "0%",
                  backgroundColor: "#60a5fa",
                }}
              />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              {details.budgetDiscipline?.explanation || "How well your spending stays within category limits, even if total spending seems okay."}
            </p>
          </Card>

          {/* 3. Emergency Fund */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: breakdown.emergencyFund !== null ? "#f59e0b" : "var(--color-line)" }}
                />
                <span className="text-xs font-semibold text-ink-soft">Emergency Fund</span>
              </div>
              <span className="text-[11px] text-ink-soft/70">Weight: 20%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-figure text-2xl font-bold text-ink">
                {details.emergencyFund?.displayValue || (breakdown.emergencyFund !== null ? `${breakdown.emergencyFund}/100` : "No Goal Set")}
              </span>
              <span className="text-xs font-figure font-semibold text-ink-soft">
                {breakdown.emergencyFund !== null ? `${breakdown.emergencyFund}/100` : "Unavailable"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: breakdown.emergencyFund !== null ? `${Math.min(100, breakdown.emergencyFund)}%` : "0%",
                  backgroundColor: "#f59e0b",
                }}
              />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              {details.emergencyFund?.explanation || "How many months of basic living costs your cash and liquid savings can cover if income stops."}
            </p>
          </Card>

          {/* 4. Investment Diversification */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: breakdown.diversification !== null && breakdown.diversification !== undefined ? "#a78bfa" : "var(--color-line)" }}
                />
                <span className="text-xs font-semibold text-ink-soft">Investment Diversification</span>
              </div>
              <span className="text-[11px] text-ink-soft/70">Weight: 20%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-figure text-2xl font-bold text-ink">
                {details.diversification?.displayValue || (breakdown.diversification !== null && breakdown.diversification !== undefined ? `${breakdown.diversification}/100` : "Unavailable")}
              </span>
              <span className="text-xs font-figure font-semibold text-ink-soft">
                {breakdown.diversification !== null && breakdown.diversification !== undefined ? `${breakdown.diversification}/100` : "Excluded from score"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: breakdown.diversification !== null && breakdown.diversification !== undefined ? `${Math.min(100, breakdown.diversification)}%` : "0%",
                  backgroundColor: "#a78bfa",
                }}
              />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              {details.diversification?.explanation || "How well your investments are spread across different types so you don't risk too much on one thing."}
            </p>
          </Card>

          {/* 5. Debt Health */}
          <Card className={`space-y-3 ${details.debtRatio?.score === null || breakdown.debtRatio === null ? "opacity-80" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: breakdown.debtRatio !== null ? "#f87171" : "var(--color-line)" }}
                />
                <span className="text-xs font-semibold text-ink-soft">Debt Health</span>
              </div>
              <span className="text-[11px] text-ink-soft/70">Weight: 10%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-figure text-2xl font-bold text-ink">
                {details.debtRatio?.displayValue || (breakdown.debtRatio !== null ? `${breakdown.debtRatio}/100` : "Not Reported")}
              </span>
              <span className="text-xs font-figure font-semibold text-ink-soft">
                {breakdown.debtRatio !== null ? `${breakdown.debtRatio}/100` : "Excluded from score"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: breakdown.debtRatio !== null ? `${Math.min(100, breakdown.debtRatio)}%` : "0%",
                  backgroundColor: "#f87171",
                }}
              />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              {details.debtRatio?.explanation || "How comfortable your loan and EMI payments are compared to what you make each month."}
            </p>
          </Card>
        </div>
      </div>

      {/* Expandable Technical Diagnostics & Calculations */}
      <details className="group rounded-xl border border-line bg-paper-raised p-5 shadow-sm">
        <summary className="flex items-center justify-between cursor-pointer font-screamer uppercase tracking-wide text-ink text-base select-none">
          <span>Detailed Calculations, Formulas & Technical Diagnostics</span>
          <span className="text-xs text-horizon font-editorial font-medium group-open:hidden">
            Show Formulas & Diagnostics +
          </span>
          <span className="text-xs text-horizon font-editorial font-medium hidden group-open:inline">
            Hide Diagnostics −
          </span>
        </summary>

        <div className="mt-5 pt-5 border-t border-line space-y-6">
          {/* Section 1: Exact Calculations & Benchmarks */}
          <div className="space-y-3">
            <h4 className="font-screamer text-base text-ink tracking-wide uppercase">
              1. How Each Pillar is Evaluated
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="p-3.5 rounded-xl border border-line bg-paper space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Savings & Cash Flow</span>
                  <span className="text-[11px] text-ink-soft">Weight: 30%</span>
                </div>
                <p className="text-ink-soft">
                  <strong className="text-ink">Formula:</strong> (Income − Expenses) ÷ Income
                </p>
                <p className="text-ink-soft">
                  <strong className="text-ink">Benchmark:</strong> 20%+ gets 100/100 score; 10%–20% scores 65–99; negative cash flow is penalized.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-paper space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Budget Management</span>
                  <span className="text-[11px] text-ink-soft">Weight: 20%</span>
                </div>
                <p className="text-ink-soft">
                  <strong className="text-ink">Formula:</strong> Category budget compliance
                </p>
                <p className="text-ink-soft">
                  <strong className="text-ink">Benchmark:</strong> Overspending in specific categories lowers your score even if total spending is within limits.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-paper space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Emergency Fund</span>
                  <span className="text-[11px] text-ink-soft">Weight: 20%</span>
                </div>
                <p className="text-ink-soft">
                  <strong className="text-ink">Formula:</strong> (Goal Savings + Liquid Reserves) ÷ Essential Monthly Expenses
                </p>
                <p className="text-ink-soft">
                  <strong className="text-ink">Benchmark:</strong> 6+ months of basic living costs gets 100/100; 3 to 6 months gets 60–99.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-paper space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Investment Diversification</span>
                  <span className="text-[11px] text-ink-soft">Weight: 20%</span>
                </div>
                <p className="text-ink-soft">
                  <strong className="text-ink">Formula:</strong> Normalized asset concentration across holdings
                </p>
                <p className="text-ink-soft">
                  <strong className="text-ink">Benchmark:</strong> Spreading investments across 3+ asset classes with no single class over 50% gives top scores.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-paper space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Debt Health</span>
                  <span className="text-[11px] text-ink-soft">Weight: 10%</span>
                </div>
                <p className="text-ink-soft">
                  <strong className="text-ink">Formula:</strong> Monthly Debt & EMI Payments ÷ Monthly Income (DTI)
                </p>
                <p className="text-ink-soft">
                  <strong className="text-ink">Benchmark:</strong> EMI under 20% of income = 100/100; over 35% is flagged as heavy debt burden.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-horizon/30 bg-horizon/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-horizon">Dynamic Weight Redistribution</span>
                  <span className="text-[11px] text-horizon font-bold">Rule</span>
                </div>
                <p className="text-ink-soft">
                  When a metric is missing (e.g. no debt or investments recorded), FinSight never treats it as zero or gives an unearned 100.
                </p>
                <p className="text-ink-soft font-figure">
                  Effective Weight = Nominal Weight ÷ Sum of Available Weights
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Exact Numbers Used in This Calculation */}
          <div className="space-y-3">
            <h4 className="font-screamer text-base text-ink tracking-wide uppercase">
              2. Actual Data Used for This Score ({monthly.monthName || "Selected Month"} {monthly.year || ""})
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="p-3 rounded-xl border border-line bg-paper">
                <span className="text-[11px] text-ink-soft block mb-0.5">Cash Flow Retention</span>
                <span className="font-figure text-sm font-bold text-ink block">
                  Income: {currencyFormatter(monthly.income || 0)}
                </span>
                <span className="font-figure text-sm font-bold text-ink block">
                  Spending: {currencyFormatter(monthly.expense || 0)}
                </span>
                <span className={`font-figure text-xs font-semibold mt-1 block ${
                  (monthly.netCashFlow || 0) >= 0 ? "text-signal-pos" : "text-signal-neg"
                }`}>
                  Net: {(monthly.netCashFlow || 0) >= 0 ? "+" : ""}{currencyFormatter(monthly.netCashFlow || 0)}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-line bg-paper">
                <span className="text-[11px] text-ink-soft block mb-0.5">Budget Limits & Spent</span>
                <span className="font-figure text-sm font-bold text-ink block">
                  Limit: {currencyFormatter(monthly.budgetLimit || 0)}
                </span>
                <span className="font-figure text-sm font-bold text-ink block">
                  Spent: {currencyFormatter(monthly.budgetSpent || 0)}
                </span>
                <span className="text-xs text-ink-soft mt-1 block">
                  {monthly.categoryBudgets?.length || 0} active category budget(s)
                </span>
              </div>

              <div className="p-3 rounded-xl border border-line bg-paper">
                <span className="text-[11px] text-ink-soft block mb-0.5">Emergency Reserves</span>
                <span className="font-figure text-sm font-bold text-ink block">
                  Liquid Portfolio: {currencyFormatter(monthly.liquidPortfolioAssets || 0)}
                </span>
                <span className="font-figure text-sm font-bold text-ink block">
                  Basic Expenses/Mo: {currencyFormatter(monthly.essentialExpenses || 0)}
                </span>
                <span className="text-xs text-horizon font-semibold mt-1 block">
                  Coverage: {monthly.emergencyMonthsCovered || "Unavailable"}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-line bg-paper">
                <span className="text-[11px] text-ink-soft block mb-0.5">Data Completeness</span>
                <span className="font-figure text-lg font-bold text-horizon block">
                  {confidence?.score || 0}% Complete
                </span>
                <span className="text-xs text-ink-soft mt-1 block">
                  {confidence?.level || "Standard"} tracking level
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Strengths & Areas to Watch */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-xl border border-line bg-paper space-y-3">
              <div className="flex items-center gap-2 text-signal-pos font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Financial Strengths</span>
              </div>
              {explainability.strengths?.length ? (
                <div className="space-y-2">
                  {explainability.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-ink">
                      <span className="text-signal-pos font-bold">✓</span>
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-soft">No prominent strengths identified yet.</p>
              )}
            </div>

            <div className="p-4 rounded-xl border border-line bg-paper space-y-3">
              <div className="flex items-center gap-2 text-horizon font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Key Areas to Watch</span>
              </div>
              {explainability.weaknesses?.length ? (
                <div className="space-y-2">
                  {explainability.weaknesses.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-ink">
                      <span className="text-horizon font-bold">⚠</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-soft">No major vulnerabilities flagged.</p>
              )}
            </div>
          </div>

          {/* Section 4: Multi-Month Anomaly Smoothing Protection */}
          <div className="p-3.5 rounded-xl border border-line/60 bg-paper/60 text-xs text-ink-soft space-y-1">
            <span className="font-semibold text-ink uppercase tracking-wider text-[11px] block">
              Multi-Month Anomaly Smoothing Protection
            </span>
            <p className="leading-relaxed">
              FinSight isolates one-off spikes (such as annual insurance premiums or sudden hospital bills) using 6-month historical baselines. This prevents an isolated spike from distorting your long-term health score.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

// ============================================================================
// 5. YEARLY FINANCIAL PROGRESS VIEW
// ============================================================================
export function YearlyProgressView({ yearlyData }) {
  if (!yearlyData) return null;

  const {
    year,
    isDataSufficient,
    insufficientDataReason,
    progressScore,
    rating,
    pointsSinceStart,
    startMonthName,
    monthlyTrajectory = [],
    pillars = {},
    narrativeSummary = [],
  } = yearlyData;

  // Insufficient Data State
  if (!isDataSufficient) {
    return (
      <Card className="p-8 text-center space-y-4 font-editorial">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-horizon/10 text-horizon">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="font-screamer text-2xl text-ink uppercase tracking-wide">
          Insufficient Historical Data for {year}
        </h3>
        <p className="max-w-md mx-auto text-xs text-ink-soft leading-relaxed">
          {insufficientDataReason ||
            `FinSight requires at least 2 distinct recorded months in ${year} to evaluate yearly financial progress. As you log more months, your growth trajectory will appear here.`}
        </p>
      </Card>
    );
  }

  const chartData = monthlyTrajectory.map((m) => ({
    name: m.monthName.slice(0, 3),
    score: m.score,
    savingsRate: m.savingsRate,
  }));

  return (
    <div className="space-y-8 font-editorial">
      {/* Yearly Header Banner */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.8fr]">
        <Card className="flex flex-col items-center justify-center p-6 text-center space-y-3">
          <span className="text-xs uppercase tracking-wider text-ink-soft font-semibold">
            {year} Financial Progress
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-figure text-5xl font-bold text-ink">{progressScore}</span>
            <span className="font-figure text-lg text-ink-soft"> / 100</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-horizon/10 text-horizon">
            {rating}
          </span>
          {pointsSinceStart !== undefined && pointsSinceStart !== null && (
            <p className="text-xs font-figure font-semibold text-signal-pos">
              {pointsSinceStart >= 0 ? `↑ +${pointsSinceStart}` : `↓ ${pointsSinceStart}`} points since {startMonthName}
            </p>
          )}
        </Card>

        <Card className="flex flex-col justify-between p-6 space-y-4">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-ink-soft font-semibold">
              Yearly Progress Summary
            </span>
            <h3 className="font-screamer text-2xl text-ink tracking-wide uppercase">
              Are your finances improving this year?
            </h3>
            <div className="space-y-1.5 pt-1">
              {narrativeSummary.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-ink">
                  <span className="text-signal-pos font-bold">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-ink-soft italic">
            Yearly progress evaluates your long-term growth across all key pillars, not just a simple average of monthly scores.
          </p>
        </Card>
      </div>

      {/* Monthly Health Trajectory Chart */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-screamer text-xl text-ink tracking-wide uppercase">
              Monthly Health Trajectory
            </h3>
            <p className="text-xs text-ink-soft">Score trend across {year}</p>
          </div>
          <span className="text-xs font-figure font-semibold text-horizon">
            {monthlyTrajectory.length} Months Tracked
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-horizon)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-horizon)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke="var(--color-ink-soft)"
                fontSize={11}
                fontFamily="var(--font-body)"
                tick={{ fill: "var(--color-ink-soft)" }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="var(--color-ink-soft)"
                fontSize={11}
                fontFamily="var(--font-body)"
                tick={{ fill: "var(--color-ink-soft)" }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val) => [`${val}/100`, "Health Score"]}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--color-horizon)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* The 6 Yearly Progress Pillars */}
      <div>
        <h3 className="font-screamer text-xl text-ink tracking-wide uppercase mb-4">
          The 6 Progress Drivers
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(pillars).map(([key, data]) => (
            <Card key={key} className="space-y-2 p-4">
              <span className="text-xs text-ink-soft font-semibold">{data.label}</span>
              <div className="flex items-baseline justify-between">
                <span className="font-figure text-xl font-bold text-ink">
                  {data.score !== null ? `${data.score}/100` : "Not Reported"}
                </span>
                <span className="text-xs font-figure font-semibold text-signal-pos">
                  {data.metric}
                </span>
              </div>
              <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-horizon rounded-full"
                  style={{ width: `${Math.min(100, data.score || 0)}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. HEALTH BREAKDOWN (LEGACY COMPATIBLE)
// ============================================================================
export function HealthBreakdown({ health, showWeights = false }) {
  const breakdown = health?.breakdown || {};
  return (
    <Card className="mt-4 space-y-4 font-editorial">
      {BREAKDOWN_ORDER.map((key, index) => {
        const value = breakdown[key];
        const isNull = value === null || value === undefined;
        return (
          <div key={key}>
            <div className="flex justify-between text-xs">
              <span className="text-ink-soft">
                {BREAKDOWN_LABELS[key]}
                {showWeights && <span className="ml-1 text-ink-soft/60">({BREAKDOWN_WEIGHTS[key]})</span>}
              </span>
              <span className="font-figure text-ink font-semibold">
                {isNull ? "Not Reported" : `${value}/100`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-horizon"
                initial={false}
                animate={{ width: isNull ? "0%" : `${Math.max(0, Math.min(100, value))}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 24, delay: index * 0.08 }}
              />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
