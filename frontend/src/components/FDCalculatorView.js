"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Calculator,
  RotateCcw,
  Info,
  HelpCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  Building,
  Coins,
  Percent,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, Button } from "@/components/ui";

// ── Centralized Validation Limits ───────────────────────────────────────────────
export const FD_LIMITS = {
  MIN_DEPOSIT: 100,
  MAX_DEPOSIT: 1000000000,
  MIN_RATE: 0.01,
  MAX_RATE: 30.0,
  MIN_DURATION_MONTHS: 1,
  MAX_DURATION_MONTHS: 120, // 10 years
};

export const COMPOUNDING_OPTIONS = [
  { id: "QUARTERLY", label: "Quarterly", n: 4, sub: "Compounded 4 times per year" },
  { id: "MONTHLY", label: "Monthly", n: 12, sub: "Compounded monthly (12 times/yr)" },
  { id: "HALF_YEARLY", label: "Half-yearly", n: 2, sub: "Every 6 months (2 times/yr)" },
  { id: "YEARLY", label: "Yearly", n: 1, sub: "Compounded annually (1 time/yr)" },
];

export const PRESET_DEPOSITS = [10000, 50000, 100000, 500000];
export const PRESET_RATES = [6.5, 7.0, 7.25, 7.5];
export const PRESET_DURATIONS = [
  { label: "6 Months", y: 0, m: 6 },
  { label: "1 Year", y: 1, m: 0 },
  { label: "3 Years", y: 3, m: 0 },
  { label: "5 Years", y: 5, m: 0 },
];

function fmtRupee(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Compact Info Tooltip Component ────────────────────────────────────────────

function TooltipInfo({ title, text, example }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <span className="relative inline-flex items-center ml-1.5 align-middle" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        className="p-0.5 rounded-full text-ink-soft hover:text-horizon hover:bg-horizon/10 transition-colors cursor-pointer"
        aria-label={`Explanation of ${title}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setOpen(false)}
          className="absolute z-50 left-0 bottom-full mb-2 w-72 p-3 rounded-xl border border-line bg-paper text-ink shadow-xl text-left text-xs font-editorial animate-in fade-in zoom-in-95 duration-150 block whitespace-normal"
        >
          <span className="flex items-center justify-between pb-1 border-b border-line mb-1.5 font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-horizon" />
              {title}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="text-ink-soft hover:text-ink">
              <X className="h-3 w-3" />
            </button>
          </span>
          <span className="text-ink-soft text-[11px] leading-relaxed block">{text}</span>
          {example && (
            <span className="mt-1.5 p-1.5 rounded-lg bg-paper-raised border border-line/60 text-[10px] text-ink-soft block">
              <strong className="text-ink font-semibold">Example: </strong>
              {example}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

// ── Precision Safe Compound Interest Math ─────────────────────────────────────

export function calculateFDMath(deposit, ratePct, years, months, freqKey) {
  const P = Number(deposit);
  const r = Number(ratePct) / 100;
  const freq = COMPOUNDING_OPTIONS.find((f) => f.id === freqKey) || COMPOUNDING_OPTIONS[0];
  const n = freq.n;

  const y = Number(years) || 0;
  const m = Number(months) || 0;
  const totalMonths = y * 12 + m;
  const t = totalMonths / 12;

  let rawMaturity = 0;
  if (r === 0) {
    rawMaturity = P;
  } else {
    // Formula: A = P * (1 + r/n)^(n*t)
    const base = 1 + r / n;
    const exponent = n * t;
    rawMaturity = P * Math.pow(base, exponent);
  }

  // Round final displayed amounts to two decimal places
  const roundedMaturity = Math.round(rawMaturity * 100) / 100;
  const rawInterest = roundedMaturity - P;
  const roundedInterest = Math.round(rawInterest * 100) / 100;
  const consistentMaturity = Math.round((P + roundedInterest) * 100) / 100;

  return {
    principalAmount: Math.round(P * 100) / 100,
    interestEarned: roundedInterest,
    maturityAmount: consistentMaturity,
    interestRate: Number(ratePct),
    durationYears: y,
    durationMonths: m,
    totalDurationInMonths: totalMonths,
    totalDurationInYears: Math.round(t * 1000) / 1000,
    compoundingFrequency: freqKey,
    compoundingFrequencyLabel: freq.label,
  };
}

export default function FDCalculatorView() {
  // Input states
  const [depositAmount, setDepositAmount] = useState("100000");
  const [interestRate, setInterestRate] = useState("7.0");
  const [years, setYears] = useState("1");
  const [months, setMonths] = useState("0");
  const [frequency, setFrequency] = useState("QUARTERLY");

  // Touched state to avoid premature validation errors
  const [touched, setTouched] = useState({
    deposit: false,
    rate: false,
    duration: false,
  });

  // Calculation output state
  const [result, setResult] = useState(() =>
    calculateFDMath(100000, 7.0, 1, 0, "QUARTERLY")
  );

  // ── Validation logic ─────────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const errs = {};

    // Deposit Amount
    const depTrimmed = depositAmount.trim();
    if (!depTrimmed) {
      errs.deposit = "Deposit amount is required.";
    } else {
      const depNum = Number(depTrimmed);
      if (isNaN(depNum)) {
        errs.deposit = "Please enter a valid numeric amount.";
      } else if (depNum < FD_LIMITS.MIN_DEPOSIT) {
        errs.deposit = `Deposit amount must be at least ₹${FD_LIMITS.MIN_DEPOSIT.toLocaleString("en-IN")}.`;
      } else if (depNum > FD_LIMITS.MAX_DEPOSIT) {
        errs.deposit = `Deposit amount exceeds ₹${FD_LIMITS.MAX_DEPOSIT.toLocaleString("en-IN")}.`;
      } else {
        const parts = depTrimmed.split(".");
        if (parts.length > 1 && parts[1].length > 2) {
          errs.deposit = "Amount cannot have more than 2 decimal places.";
        }
      }
    }

    // Annual Interest Rate
    const rateTrimmed = interestRate.trim();
    if (!rateTrimmed) {
      errs.rate = "Annual interest rate is required.";
    } else {
      const rateNum = Number(rateTrimmed);
      if (isNaN(rateNum)) {
        errs.rate = "Please enter a valid numeric interest rate.";
      } else if (rateNum <= 0) {
        errs.rate = "Interest rate must be greater than 0%.";
      } else if (rateNum > FD_LIMITS.MAX_RATE) {
        errs.rate = `Interest rate cannot exceed ${FD_LIMITS.MAX_RATE}%.`;
      } else {
        const parts = rateTrimmed.split(".");
        if (parts.length > 1 && parts[1].length > 2) {
          errs.rate = "Rate cannot have more than 2 decimal places.";
        }
      }
    }

    // Deposit Duration
    const yNum = Number(years);
    const mNum = Number(months);
    if (isNaN(yNum) || yNum < 0 || !Number.isInteger(yNum)) {
      errs.duration = "Years must be a whole positive number or 0.";
    } else if (isNaN(mNum) || mNum < 0 || !Number.isInteger(mNum)) {
      errs.duration = "Months must be a whole positive number or 0.";
    } else {
      const totalMonths = yNum * 12 + mNum;
      if (totalMonths < FD_LIMITS.MIN_DURATION_MONTHS) {
        errs.duration = "Minimum deposit duration is 1 month.";
      } else if (totalMonths > FD_LIMITS.MAX_DURATION_MONTHS) {
        errs.duration = "Maximum deposit duration is 10 years (120 months).";
      }
    }

    return errs;
  }, [depositAmount, interestRate, years, months]);

  const isValid = Object.keys(errors).length === 0;

  // Run calculation if inputs are valid
  const handleCalculate = useCallback(
    (e) => {
      if (e) e.preventDefault();
      setTouched({ deposit: true, rate: true, duration: true });
      if (!isValid) return;

      const res = calculateFDMath(depositAmount, interestRate, years, months, frequency);
      setResult(res);
    },
    [depositAmount, interestRate, years, months, frequency, isValid]
  );

  // Auto-recalculate smoothly on input changes if already valid
  React.useEffect(() => {
    if (isValid) {
      const res = calculateFDMath(depositAmount, interestRate, years, months, frequency);
      setResult(res);
    }
  }, [depositAmount, interestRate, years, months, frequency, isValid]);

  // Reset to default standard state
  const handleReset = () => {
    setDepositAmount("100000");
    setInterestRate("7.0");
    setYears("1");
    setMonths("0");
    setFrequency("QUARTERLY");
    setTouched({ deposit: false, rate: false, duration: false });
    const res = calculateFDMath(100000, 7.0, 1, 0, "QUARTERLY");
    setResult(res);
  };

  return (
    <div className="space-y-6 font-editorial">
      {/* ── Header Introduction ── */}
      <div className="rounded-2xl border border-line bg-paper-raised p-6">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-horizon/10 text-horizon">
            <Calculator className="h-5 w-5" />
          </span>
          <h2 className="font-screamer text-2xl uppercase tracking-wide text-ink">
            Fixed Deposit (FD) Calculator
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed max-w-2xl">
          Calculate your estimated FD maturity amount and interest based on your deposit, interest rate, duration and compounding frequency.
        </p>
      </div>

      {/* ── Main Layout: Inputs on Left, Results on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Inputs Form (7 cols) ── */}
        <div className="lg:col-span-7 rounded-2xl border border-line bg-paper-raised p-6 space-y-6">
          <form onSubmit={handleCalculate} className="space-y-5">
            {/* Input 1: Deposit Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="fd-deposit" className="text-xs font-bold uppercase tracking-wider text-ink flex items-center">
                  <span>Deposit Amount (INR)</span>
                  <TooltipInfo
                    title="Deposit Amount"
                    text="The principal sum of money you deposit upfront into the Fixed Deposit account."
                    example="e.g. ₹1,00,000 deposited initially."
                  />
                </label>
                <span className="text-[11px] font-mono text-ink-soft">Min ₹100</span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-soft font-figure">
                  ₹
                </span>
                <input
                  id="fd-deposit"
                  type="number"
                  step="0.01"
                  min={FD_LIMITS.MIN_DEPOSIT}
                  value={depositAmount}
                  onChange={(e) => {
                    setDepositAmount(e.target.value);
                    setTouched((prev) => ({ ...prev, deposit: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, deposit: true }))}
                  placeholder="1,00,000"
                  className={`w-full pl-8 pr-4 py-2.5 bg-paper border rounded-xl text-base font-figure font-bold text-ink outline-none transition-all ${
                    touched.deposit && errors.deposit
                      ? "border-signal-neg ring-1 ring-signal-neg/30"
                      : "border-line focus:border-horizon focus:ring-1 focus:ring-horizon/30"
                  }`}
                />
              </div>

              {touched.deposit && errors.deposit && (
                <p className="mt-1.5 text-xs text-signal-neg font-medium flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{errors.deposit}</span>
                </p>
              )}

              {/* Quick deposit presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_DEPOSITS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDepositAmount(String(preset));
                      setTouched((prev) => ({ ...prev, deposit: true }));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-figure border transition-colors cursor-pointer ${
                      Number(depositAmount) === preset
                        ? "border-horizon bg-horizon text-[#0f1b33] dark:text-[#080b12] font-bold"
                        : "border-line bg-paper text-ink hover:border-horizon/50"
                    }`}
                  >
                    ₹{preset >= 100000 ? `${preset / 100000} Lakh` : `${preset / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Input 2: Annual Interest Rate */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="fd-rate" className="text-xs font-bold uppercase tracking-wider text-ink flex items-center">
                  <span>Annual Interest Rate (%)</span>
                  <TooltipInfo
                    title="Annual Interest Rate"
                    text="The nominal annual interest rate agreed upon by the bank before compounding."
                    example="Most commercial banks currently offer between 6.5% and 7.5% p.a."
                  />
                </label>
                <span className="text-[11px] font-mono text-ink-soft">Max 30%</span>
              </div>

              <div className="relative">
                <input
                  id="fd-rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="30"
                  value={interestRate}
                  onChange={(e) => {
                    setInterestRate(e.target.value);
                    setTouched((prev) => ({ ...prev, rate: true }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, rate: true }))}
                  placeholder="7.0"
                  className={`w-full pl-3.5 pr-8 py-2.5 bg-paper border rounded-xl text-base font-figure font-bold text-ink outline-none transition-all ${
                    touched.rate && errors.rate
                      ? "border-signal-neg ring-1 ring-signal-neg/30"
                      : "border-line focus:border-horizon focus:ring-1 focus:ring-horizon/30"
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-soft font-figure">
                  % p.a.
                </span>
              </div>

              {touched.rate && errors.rate && (
                <p className="mt-1.5 text-xs text-signal-neg font-medium flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{errors.rate}</span>
                </p>
              )}

              {/* Quick rate presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setInterestRate(String(rate));
                      setTouched((prev) => ({ ...prev, rate: true }));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-figure border transition-colors cursor-pointer ${
                      Number(interestRate) === rate
                        ? "border-horizon bg-horizon text-[#0f1b33] dark:text-[#080b12] font-bold"
                        : "border-line bg-paper text-ink hover:border-horizon/50"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Input 3: Deposit Duration */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center">
                  <span>Deposit Duration</span>
                  <TooltipInfo
                    title="Deposit Duration"
                    text="The tenor for which your capital is invested. Can be specified in a combination of years and months."
                    example="1 year and 6 months = 18 total months (1.5 years)."
                  />
                </label>
                <span className="text-[11px] font-mono text-ink-soft">1 mo – 10 yrs</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Years */}
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="1"
                      value={years}
                      onChange={(e) => {
                        setYears(e.target.value);
                        setTouched((prev) => ({ ...prev, duration: true }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, duration: true }))}
                      placeholder="1"
                      className="w-full pl-3.5 pr-14 py-2.5 bg-paper border border-line rounded-xl text-base font-figure font-bold text-ink focus:border-horizon outline-none transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-soft">
                      Years
                    </span>
                  </div>
                </div>

                {/* Months */}
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="11"
                      step="1"
                      value={months}
                      onChange={(e) => {
                        setMonths(e.target.value);
                        setTouched((prev) => ({ ...prev, duration: true }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, duration: true }))}
                      placeholder="0"
                      className="w-full pl-3.5 pr-16 py-2.5 bg-paper border border-line rounded-xl text-base font-figure font-bold text-ink focus:border-horizon outline-none transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-soft">
                      Months
                    </span>
                  </div>
                </div>
              </div>

              {touched.duration && errors.duration && (
                <p className="mt-1.5 text-xs text-signal-neg font-medium flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{errors.duration}</span>
                </p>
              )}

              {/* Quick duration presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => {
                      setYears(String(d.y));
                      setMonths(String(d.m));
                      setTouched((prev) => ({ ...prev, duration: true }));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-figure border transition-colors cursor-pointer ${
                      Number(years) === d.y && Number(months) === d.m
                        ? "border-horizon bg-horizon text-[#0f1b33] dark:text-[#080b12] font-bold"
                        : "border-line bg-paper text-ink hover:border-horizon/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input 4: Compounding Frequency */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-ink flex items-center">
                  <span>Compounding Frequency</span>
                  <TooltipInfo
                    title="Compounding Frequency"
                    text="How frequently the accrued interest is added to your principal to begin earning further interest. Most banks calculate interest on a quarterly basis, though terms vary across products."
                    example="Quarterly (n = 4) compounds interest 4 times a year."
                  />
                </label>
                <span className="text-[11px] font-mono text-ink-soft">Formula: n</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COMPOUNDING_OPTIONS.map((f) => {
                  const isCur = frequency === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFrequency(f.id)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isCur
                          ? "border-horizon bg-horizon/10 dark:bg-horizon/15 shadow-xs ring-1 ring-horizon/40"
                          : "border-line bg-paper hover:border-horizon/40 hover:bg-paper-raised"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">{f.label}</span>
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            isCur ? "bg-horizon" : "border border-line"
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-ink-soft block mt-0.5">{f.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <Button
                type="submit"
                variant="accent"
                disabled={!isValid}
                className="cursor-pointer text-xs py-2.5 px-6 font-screamer tracking-wider uppercase disabled:opacity-50"
              >
                Calculate Maturity
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                className="cursor-pointer text-xs py-2.5 px-4 font-screamer tracking-wider uppercase"
              >
                Reset
              </Button>
            </div>
          </form>
        </div>

        {/* ── Right Column: Outputs Display (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-xs flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                <h3 className="font-screamer text-lg uppercase tracking-wide text-ink flex items-center gap-2">
                  <span>Calculation Breakdown</span>
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-horizon/15 text-amber-900 border border-horizon/30 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600/50">
                  Compound Interest
                </span>
              </div>

              {/* Highlight Maturity Amount Card */}
              <div className="rounded-xl border border-horizon/40 bg-gradient-to-br from-horizon/15 to-horizon/5 dark:from-horizon/10 dark:to-transparent p-4 mb-4">
                <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold block">
                  Estimated Maturity Amount
                </span>
                <p className="font-figure text-3xl font-bold text-ink mt-1">
                  {fmtRupee(result.maturityAmount)}
                </p>
                <p className="text-[11px] text-ink-soft mt-1">
                  Gross amount receivable on completion of {result.durationYears > 0 ? `${result.durationYears}y ` : ""}
                  {result.durationMonths > 0 ? `${result.durationMonths}m` : ""}
                </p>
              </div>

              {/* Principal vs Interest Row (simplified: no percentage labels or progress bar) */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-figure">
                <div className="p-3.5 rounded-xl bg-paper border border-line">
                  <span className="text-[10px] text-ink-soft uppercase tracking-wider block font-editorial">
                    Principal Amount (P)
                  </span>
                  <span className="font-bold text-ink text-base block mt-1">
                    {fmtRupee(result.principalAmount)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-paper border border-line">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-editorial">
                    Interest Earned (A − P)
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base block mt-1">
                    +{fmtRupee(result.interestEarned)}
                  </span>
                </div>
              </div>

              {/* Parameter Summary Table */}
              <div className="rounded-xl border border-line bg-paper p-3 text-xs space-y-2 mb-4">
                <div className="flex items-center justify-between text-ink-soft">
                  <span>Annual Nominal Rate:</span>
                  <span className="font-figure font-bold text-ink">{result.interestRate}% p.a.</span>
                </div>
                <div className="flex items-center justify-between text-ink-soft">
                  <span>Total Duration:</span>
                  <span className="font-figure font-bold text-ink">
                    {result.totalDurationInMonths} Months ({result.totalDurationInYears} Years)
                  </span>
                </div>
                <div className="flex items-center justify-between text-ink-soft">
                  <span>Compounding Period:</span>
                  <span className="font-medium text-ink">{result.compoundingFrequencyLabel}</span>
                </div>
                <div className="flex items-center justify-between text-ink-soft border-t border-line/60 pt-2 font-mono text-[11px]">
                  <span>Mathematical Check:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>A = P + Interest</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Standard Statutory Disclaimer */}
            <div className="pt-3 border-t border-line text-[11px] text-ink-soft leading-relaxed italic">
              "These are estimated maturity calculations using the selected compound-interest method. Actual bank FD returns may differ based on the bank's calculation method, deposit terms, payout option, taxes and applicable charges. This estimate does not include TDS or income tax."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

