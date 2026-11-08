"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Shield,
  TrendingUp,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Compass,
  ArrowRight,
  Info,
  Check,
  HelpCircle,
  Clock,
  Coins,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Card, Button } from "@/components/ui";
import { api } from "@/lib/api";

const RISK_LEVELS = [
  {
    id: "LOW",
    title: "Low Risk",
    icon: Shield,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    activeCard: "border-emerald-500 bg-emerald-500/5 shadow-sm",
    explanation:
      "Focus on keeping your money safe with steady, predictable returns and minimal market ups and downs.",
    idealFor: "Investors seeking capital preservation and steady interest.",
  },
  {
    id: "MODERATE",
    title: "Moderate Risk",
    icon: TrendingUp,
    badgeColor: "bg-horizon/15 text-[#0f1b33] border-horizon/30",
    activeCard: "border-horizon bg-horizon/10 shadow-sm",
    explanation:
      "A balanced approach combining steady income instruments with growth assets for medium-term wealth building.",
    idealFor: "Investors wanting steady compounding while cushioning market dips.",
  },
  {
    id: "HIGH",
    title: "High Risk",
    icon: Flame,
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    activeCard: "border-amber-500 bg-amber-500/5 shadow-sm",
    explanation:
      "Focus on higher long-term growth by investing in equity markets, accepting that values will rise and fall in the short term.",
    idealFor: "Investors targeting maximum multi-year capital growth over 5+ years.",
  },
];

const DURATIONS = [
  {
    id: "LESS_THAN_1_YEAR",
    label: "Less than 1 year",
    subtitle: "Near-term goals / Capital safety",
    tag: "< 1 Year",
  },
  {
    id: "1_TO_3_YEARS",
    label: "1–3 years",
    subtitle: "Short to medium term / Balanced",
    tag: "1–3 Years",
  },
  {
    id: "3_TO_5_YEARS",
    label: "3–5 years",
    subtitle: "Medium term / Steady compounding",
    tag: "3–5 Years",
  },
  {
    id: "MORE_THAN_5_YEARS",
    label: "More than 5 years",
    subtitle: "Long term / Wealth creation",
    tag: "5+ Years",
  },
];

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 200000];

function fmtRupee(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ExploreInvestmentsView() {
  // ── Step 1: Risk Level ──
  const [riskLevel, setRiskLevel] = useState("MODERATE");

  // ── Step 2: Investment Amount ──
  const [amount, setAmount] = useState(50000);
  const [rawAmountInput, setRawAmountInput] = useState("50000");

  // ── Step 3: Investment Duration ──
  const [duration, setDuration] = useState("3_TO_5_YEARS");

  // Options response state
  const [loading, setLoading] = useState(false);
  const [optionsData, setOptionsData] = useState(null);

  // Fetch or compute options whenever inputs change
  const fetchOptions = useCallback(async () => {
    const numAmount = Math.max(Number(amount) || 10000, 100);
    setLoading(true);
    try {
      const res = await api.getInvestmentOptions({
        riskLevel,
        amount: numAmount,
        duration,
      });
      if (res && res.options) {
        setOptionsData(res);
      }
    } catch {
      // Fallback: Generate locally if network fails
      generateLocalFallback(riskLevel, numAmount, duration);
    } finally {
      setLoading(false);
    }
  }, [riskLevel, amount, duration]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleAmountChange = (val) => {
    setRawAmountInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    }
  };

  const handlePresetClick = (preset) => {
    setAmount(preset);
    setRawAmountInput(String(preset));
  };

  const handleOpenGuide = () => {
    window.dispatchEvent(new CustomEvent("finsight:open-guide"));
  };

  // Local fallback generator ensures immediate responsiveness
  function generateLocalFallback(risk, amt, dur) {
    let warning = null;
    if (dur === "LESS_THAN_1_YEAR") {
      warning =
        "For an investment duration under 1 year, capital preservation is essential. Equities carry high risk of short-term losses that cannot reliably recover in less than 12 months. Options below prioritize capital stability, fixed interest, and liquidity.";
    } else if (dur === "1_TO_3_YEARS" && risk === "HIGH") {
      warning =
        "For a 1 to 3 year duration, pure equity exposure remains risky because market cycles can cause multi-quarter drawdowns. We recommend balanced or conservative structures that protect capital while providing controlled growth.";
    }

    const opts = [
      {
        id: "opt-1",
        name: dur === "LESS_THAN_1_YEAR" ? "High-Yield Bank Fixed Deposit" : "Nifty 50 Index Mutual Fund",
        category: dur === "LESS_THAN_1_YEAR" ? "Fixed Deposit" : "Mutual Fund",
        riskLevel: dur === "LESS_THAN_1_YEAR" ? "Low Risk" : "Moderate Risk",
        duration: dur === "LESS_THAN_1_YEAR" ? "6 to 12 months" : "3 to 5 years",
        suggestedAmount: amt,
        suggestedAmountText: `${fmtRupee(amt)} (Core allocation)`,
        illustrativeScenario: {
          rateOrRange: dur === "LESS_THAN_1_YEAR" ? "6.5% – 7.0% p.a." : "11.0% – 12.5% p.a.",
          scenarioText: `At an illustrative benchmark rate, ${fmtRupee(amt)} can grow dependably without high speculative churn.`,
          assumptionSource: "Standard benchmark historical averages. Not a guaranteed projection.",
        },
        downsideScenario: "Protected by capital certainty or diversified market leader holdings.",
        benefits: ["Inflation-hedging capital growth", "Transparent liquidity", "Institutional regulation"],
        risks: ["Market fluctuations or inflation tax drag"],
        liquidity: "High. Accessible via bank or AMC portal.",
        whySuited: "Tailored to your selected timeframe and risk tolerance.",
        marketLinked: dur !== "LESS_THAN_1_YEAR",
      },
    ];

    setOptionsData({
      riskLevel: risk,
      duration: dur,
      amount: amt,
      suitabilityWarning: warning,
      options: opts,
      disclaimer:
        "These options and scenarios are for educational illustration only. Investments are subject to market risks. Read scheme documents carefully before investing.",
    });
  }

  return (
    <div className="space-y-8 font-editorial">
      {/* ── Header Introduction ── */}
      <div className="rounded-2xl border border-line bg-paper-raised p-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-horizon/10 text-horizon">
                <Compass className="h-5 w-5" />
              </span>
              <h2 className="font-screamer text-2xl uppercase tracking-wide text-ink">
                Investment Planner
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed max-w-2xl">
              Tell us your risk preference, available money, and timeframe. We will generate 3–4 transparent,
              suitable investment options with realistic return scenarios, liquidity conditions, and risk disclosures.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenGuide}
            className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line bg-paper text-xs font-semibold text-ink hover:text-horizon hover:border-horizon/50 transition-colors shadow-xs"
          >
            <HelpCircle className="h-4 w-4 text-horizon" />
            <span>Open Guide</span>
          </button>
        </div>
      </div>

      {/* ── 3-Step Input Configuration Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── STEP 1: SELECT RISK LEVEL ── */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-horizon text-[#0f1b33] font-figure text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="font-screamer text-base uppercase tracking-wide text-ink">
                  Select Risk Level
                </h3>
              </div>
              <span className="text-[11px] text-ink-soft font-mono font-medium">Required</span>
            </div>

            <p className="text-xs text-ink-soft mb-3">
              How comfortable are you with ups and downs in your investment values?
            </p>

            <div className="space-y-2.5">
              {RISK_LEVELS.map((rl) => {
                const Icon = rl.icon;
                const isSelected = riskLevel === rl.id;
                return (
                  <button
                    key={rl.id}
                    type="button"
                    onClick={() => setRiskLevel(rl.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-horizon bg-horizon/10 shadow-xs ring-1 ring-horizon/40"
                        : "border-line bg-paper hover:border-horizon/40 hover:bg-paper-raised"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`h-4 w-4 ${
                            rl.id === "LOW"
                              ? "text-emerald-500"
                              : rl.id === "MODERATE"
                              ? "text-horizon"
                              : "text-amber-500"
                          }`}
                        />
                        <span className="text-xs font-bold text-ink">{rl.title}</span>
                      </div>
                      <div
                        className={`h-3 w-3 rounded-full transition-all ${
                          isSelected ? "bg-horizon ring-3 ring-horizon/20" : "border border-line"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-ink-soft mt-2 leading-relaxed">
                      {rl.explanation}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── STEP 2: ENTER INVESTMENT AMOUNT ── */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-horizon text-[#0f1b33] font-figure text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="font-screamer text-base uppercase tracking-wide text-ink">
                  Investment Amount
                </h3>
              </div>
              <span className="text-[11px] text-ink-soft font-mono font-medium">INR (₹)</span>
            </div>

            <p className="text-xs text-ink-soft mb-3">
              Enter the lump-sum capital you are planning to invest.
            </p>

            {/* Input field */}
            <div className="relative mb-3">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-soft font-figure">
                ₹
              </span>
              <input
                type="number"
                min="100"
                step="500"
                value={rawAmountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="50,000"
                className="w-full pl-8 pr-4 py-2.5 bg-paper border border-line rounded-xl text-base font-figure font-bold text-ink focus:border-horizon focus:ring-1 focus:ring-horizon/30 outline-none transition-all"
              />
            </div>

            {/* Preset Amount Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">
                Quick Preset Amounts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_AMOUNTS.map((p) => {
                  const isCur = amount === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-figure font-medium border transition-all cursor-pointer ${
                        isCur
                          ? "border-horizon bg-horizon text-[#0f1b33] font-bold shadow-xs"
                          : "border-line bg-paper text-ink hover:border-horizon/50"
                      }`}
                    >
                      {fmtRupee(p)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-paper border border-line text-[11px] text-ink-soft">
              <div className="flex items-center gap-1.5 text-ink font-semibold">
                <Coins className="h-3.5 w-3.5 text-horizon" />
                <span>Planned Capital</span>
              </div>
              <p className="mt-1">
                Currently evaluating suitable options for <strong className="text-ink font-figure font-semibold">{fmtRupee(amount)}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* ── STEP 3: SELECT DURATION ── */}
        <div className="rounded-2xl border border-line bg-paper-raised p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-horizon text-[#0f1b33] font-figure text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="font-screamer text-base uppercase tracking-wide text-ink">
                  Investment Duration
                </h3>
              </div>
              <span className="text-[11px] text-ink-soft font-mono font-medium">Timeframe</span>
            </div>

            <p className="text-xs text-ink-soft mb-3">
              How long can you comfortably keep this money invested before needing it back?
            </p>

            <div className="space-y-2.5">
              {DURATIONS.map((d) => {
                const isSelected = duration === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDuration(d.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-horizon bg-horizon/10 shadow-xs ring-1 ring-horizon/40"
                        : "border-line bg-paper hover:border-horizon/40 hover:bg-paper-raised"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-horizon" />
                        <span className="text-xs font-bold text-ink">{d.label}</span>
                      </div>
                      <div
                        className={`h-3 w-3 rounded-full transition-all ${
                          isSelected ? "bg-horizon ring-3 ring-horizon/20" : "border border-line"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-ink-soft mt-1.5 leading-relaxed">
                      {d.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Suitability Notice / Safeguard Banner ── */}
      {optionsData?.suitabilityWarning && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4.5 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Suitability & Capital Preservation Notice
            </h4>
            <p className="text-xs text-ink leading-relaxed">
              {optionsData.suitabilityWarning}
            </p>
          </div>
        </div>
      )}

      {/* ── Generated Recommendation Cards Section ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-line">
          <div>
            <h3 className="font-screamer text-xl uppercase tracking-wide text-ink flex items-center gap-2">
              <span>Suitable Investment Options</span>
              <span className="text-xs font-mono font-bold text-[#0f1b33] bg-horizon px-2 py-0.5 rounded-full">
                {optionsData?.options?.length || 0} Options
              </span>
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Individual investment ideas tailored for {fmtRupee(amount)} over {DURATIONS.find((d) => d.id === duration)?.label}.
            </p>
          </div>
          <div className="text-xs text-ink-soft italic">
            Informational evaluation • No automatic transactions created
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-2xl border border-line bg-ink/5 animate-pulse" />
            ))}
          </div>
        ) : !optionsData || optionsData.options?.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft text-xs">
            No options generated for this specific configuration. Please adjust your amount or duration.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {optionsData.options.map((opt, idx) => (
              <RecommendationCard key={opt.id || idx} option={opt} />
            ))}
          </div>
        )}
      </div>

      {/* ── Educational Regulatory Disclaimer ── */}
      <div className="rounded-2xl border border-line bg-paper-raised/60 p-5 text-xs text-ink-soft leading-relaxed space-y-2">
        <div className="flex items-center gap-2 text-ink font-semibold">
          <Info className="h-4 w-4 text-horizon" />
          <span>Educational Disclaimer & Regulatory Transparency</span>
        </div>
        <p>
          {optionsData?.disclaimer ||
            "These suggestions and illustrative return scenarios are educational estimates based on user inputs. FinSight is an educational personal financial management tool and is not a SEBI-registered Investment Adviser (RIA), portfolio manager, or broker."}
        </p>
        <p className="text-[11px] text-ink-soft/80">
          Hypothetical and historical benchmarks are not guarantees of future performance. Mutual fund investments and equities are subject to market risks; read all scheme-related documents carefully before investing. You independently decide whether and where to invest outside of FinSight.
        </p>
      </div>
    </div>
  );
}

// ── Recommendation Card Component ─────────────────────────────────────────────

function RecommendationCard({ option }) {
  const isMarket = option.marketLinked;

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 flex flex-col justify-between shadow-xs hover:border-horizon/50 hover:shadow-md transition-all">
      <div>
        {/* Top Badges & Title */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-paper border border-line text-ink">
                {option.category}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  option.riskLevel?.includes("Low")
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : option.riskLevel?.includes("Moderate")
                    ? "bg-horizon/15 text-[#0f1b33] border border-horizon/30"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {option.riskLevel}
              </span>
              {isMarket && (
                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  Market-Linked
                </span>
              )}
            </div>
            <h4 className="font-screamer text-xl uppercase tracking-wide text-ink">
              {option.name}
            </h4>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-paper border border-line/70 mb-4 text-xs font-figure">
          <div>
            <span className="text-[10px] text-ink-soft uppercase tracking-wider block font-editorial">
              Suggested Capital
            </span>
            <span className="font-bold text-ink text-sm">
              {option.suggestedAmountText || fmtRupee(option.suggestedAmount)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-ink-soft uppercase tracking-wider block font-editorial">
              Ideal Duration
            </span>
            <span className="font-semibold text-ink text-sm">
              {option.duration}
            </span>
          </div>
        </div>

        {/* Illustrative Return Scenario */}
        {option.illustrativeScenario && (
          <div className="mb-4 p-3.5 rounded-xl border border-horizon/30 bg-horizon/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-horizon font-editorial">
                Illustrative Scenario (Not Guaranteed)
              </span>
              <span className="font-figure text-xs font-bold text-ink">
                {option.illustrativeScenario.rateOrRange}
              </span>
            </div>
            <p className="text-xs text-ink font-medium leading-relaxed">
              {option.illustrativeScenario.scenarioText}
            </p>
            {option.illustrativeScenario.assumptionSource && (
              <p className="text-[10px] text-ink-soft mt-1 leading-snug">
                * {option.illustrativeScenario.assumptionSource}
              </p>
            )}
          </div>
        )}

        {/* Downside / Loss Scenario */}
        {option.downsideScenario && (
          <div className="mb-4 p-3 rounded-xl bg-paper border border-line text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-signal-neg/90 block mb-1">
              Potential Downside / Risk Scenario
            </span>
            <p className="text-ink-soft text-[11px] leading-relaxed">
              {option.downsideScenario}
            </p>
          </div>
        )}

        {/* Benefits & Risks Lists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
          {/* Benefits */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1.5 flex items-center gap-1">
              <Check className="h-3 w-3" />
              <span>Key Benefits</span>
            </span>
            <ul className="space-y-1 text-[11px] text-ink-soft">
              {option.benefits?.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Important Risks</span>
            </span>
            <ul className="space-y-1 text-[11px] text-ink-soft">
              {option.risks?.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Liquidity */}
        <div className="p-2.5 rounded-xl bg-paper border border-line mb-4 text-[11px]">
          <strong className="text-ink font-semibold">Liquidity: </strong>
          <span className="text-ink-soft">{option.liquidity}</span>
        </div>

        {/* Why this option suits your preferences */}
        <div className="pt-3 border-t border-line/60 text-xs">
          <span className="text-[10px] uppercase tracking-wider text-ink font-bold block mb-1">
            Why this suits your preferences:
          </span>
          <p className="text-ink-soft text-[11px] leading-relaxed italic">
            "{option.whySuited}"
          </p>
        </div>
      </div>
    </div>
  );
}
