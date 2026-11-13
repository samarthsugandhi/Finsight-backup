"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

import { Card, EmptyState, ErrorState } from "@/components/ui";
import { useFinance } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getChartColors } from "@/lib/chartColors";

// ─── Helpers & Formatters ─────────────────────────────────────────────────────

const currencyFormatter = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const fmtNumber = (val) =>
  Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const tooltipStyle = {
  backgroundColor: "var(--color-paper-raised)",
  borderColor: "var(--color-line)",
  borderRadius: "8px",
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
  fontSize: "12px",
};

const MONTH_OPTIONS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

function normalizeTransaction(tx) {
  return {
    ...tx,
    categoryName: tx.category?.name || tx.Category?.name || "Uncategorized",
  };
}

function formatCleanDescription(desc) {
  if (!desc) return "Transaction";
  let clean = desc.trim();
  clean = clean.replace(/^(UPI|IMPS|NEFT|RTGS|ACH|POS|NACH|BILLPAY)[\/\-_:\s]+/i, "");
  clean = clean.replace(/^[0-9A-Z]{8,25}[\/\-_:\s]+/i, "");
  clean = clean.replace(/^(PYMT\s*TO|PAYMENT\s*TO|TRANSFER\s*TO|PAID\s*TO|REC\s*FROM)\s+/i, "");
  clean = clean.replace(/[\/][A-Z0-9]{4,}[A-Z0-9\/_\-]*$/i, "");
  clean = clean.trim();
  return clean || desc;
}

function getScoreRating(score) {
  if (score >= 85) return { label: "Excellent", color: "text-signal-pos", bg: "bg-signal-pos/10", border: "border-signal-pos/30" };
  if (score >= 70) return { label: "Good", color: "text-signal-pos", bg: "bg-signal-pos/10", border: "border-signal-pos/30" };
  if (score >= 50) return { label: "Fair", color: "text-horizon", bg: "bg-horizon/10", border: "border-horizon/30" };
  return { label: "Needs Attention", color: "text-signal-neg", bg: "bg-signal-neg/10", border: "border-signal-neg/30" };
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const store = useFinance();
  const { summary, health, transactions, portfolio, budgets, goals, availableSavings, loading, error, refetch } = store;
  const { user } = useAuth();
  const { theme } = useTheme();
  const chartColors = useMemo(() => getChartColors(theme), [theme]);

  const now = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly" | "all_time"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [periodSummary, setPeriodSummary] = useState(null);
  const [periodHealth, setPeriodHealth] = useState(null);
  const [periodTransactions, setPeriodTransactions] = useState([]);
  const [periodBudgets, setPeriodBudgets] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const [chartType, setChartType] = useState("pie");

  // Time-based greeting
  const greetingTime = useMemo(() => {
    const hr = now.getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  }, [setPeriodLoading, setPeriodError, setPeriodSummary, setPeriodHealth, setPeriodTransactions, setPeriodBudgets]);

  const periodLabel = useMemo(() => {
    if (periodMode === "monthly") {
      const m = MONTH_OPTIONS.find((item) => item.value === selectedMonth)?.label || "";
      return `${m} ${selectedYear}`;
    }
    if (periodMode === "yearly") {
      return `Year ${selectedYear}`;
    }
    return "All Time";
  }, [periodMode, selectedMonth, selectedYear]);

  const fetchPeriodData = useCallback(async (mode, m, y) => {
    setPeriodLoading(true);
    setPeriodError("");
    let query = "";
    if (mode === "monthly") {
      query = `?period=monthly&month=${m}&year=${y}`;
    } else if (mode === "yearly") {
      query = `?period=yearly&year=${y}`;
    } else if (mode === "all_time") {
      query = `?period=all_time`;
    }

    try {
      const [sumRes, healthRes, txRes, budgetRes] = await Promise.all([
        api.summary(query),
        api.healthScore(query),
        api.transactions(query),
        api.budgets(query),
      ]);
      setPeriodSummary(sumRes);
      setPeriodHealth(healthRes);
      setPeriodTransactions((txRes.transactions || []).map(normalizeTransaction));
      setPeriodBudgets(budgetRes.budgets || []);
    } catch (err) {
      setPeriodError(err.message || "Failed to load data for selected period.");
    } finally {
      setPeriodLoading(false);
    }
  }, [setPeriodLoading, setPeriodError, setPeriodSummary, setPeriodHealth, setPeriodTransactions, setPeriodBudgets]);

  useEffect(() => {
    if (!loading && summary) {
      fetchPeriodData(periodMode, selectedMonth, selectedYear);
    }
  }, [loading, summary, periodMode, selectedMonth, selectedYear, fetchPeriodData]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 font-editorial">
        <div className="h-8 w-44 animate-pulse rounded bg-ink/10 mb-2" />
        <div className="h-4 w-60 animate-pulse rounded bg-ink/5 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-ink/5 border border-line" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-ink/5 border border-line" />
          <div className="h-64 animate-pulse rounded-xl bg-ink/5 border border-line" />
        </div>
      </div>
    );
  }

  if (!summary || !health || !portfolio) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 font-editorial">
        <ErrorState
          message={error || "Couldn't load dashboard data. Please check backend connectivity."}
          onRetry={refetch}
        />
      </div>
    );
  }

  const activeSummary = periodSummary || summary;
  const activeHealth = periodHealth || health;
  const activeTransactions = periodTransactions.length > 0 || periodSummary ? periodTransactions : transactions;
  const activeBudgets = periodBudgets.length > 0 || periodSummary ? periodBudgets : (budgets || []);

  // ─── Financial Calculations ────────────────────────────────────────────────

  // Cumulative Cash Savings
  const cashSavings = Number(activeSummary.allTimeSavings ?? availableSavings?.totalSavings ?? summary.savings ?? 0);

  // Portfolio Current Valuation
  const portfolioValuation = Number(portfolio.summary.totalKnownCurrent ?? portfolio.summary.totalCurrent ?? 0);
  const unvaluedAssetsCount = Number(portfolio.summary.unpricedCount ?? 0);
  const pricedHoldingsCount = (portfolio.holdings || []).filter((h) => h.currentValue !== null).length;

  // Established Net Worth = Cumulative Cash Savings + Known Current Portfolio Valuation
  const netWorth = cashSavings + portfolioValuation;

  // Spending categories: limit dashboard preview to top 5 categories
  const expenseByCategory = activeSummary.byCategory || {};
  const totalExpenseAmount = Number(activeSummary.expense || 0);

  const rawCategoryEntries = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const previewCategories = (() => {
    if (rawCategoryEntries.length <= 5) {
      return rawCategoryEntries.map((c) => ({
        ...c,
        percentage: totalExpenseAmount > 0 ? (c.value / totalExpenseAmount) * 100 : 0,
      }));
    }
    const top4 = rawCategoryEntries.slice(0, 4);
    const otherSum = rawCategoryEntries.slice(4).reduce((s, c) => s + c.value, 0);
    const combined = [
      ...top4,
      { name: "Other", value: otherSum },
    ];
    return combined.map((c) => ({
      ...c,
      percentage: totalExpenseAmount > 0 ? (c.value / totalExpenseAmount) * 100 : 0,
    }));
  })();

  // Budget calculations
  const totalBudgetLimit = activeBudgets.reduce((s, b) => s + Number(b.monthlyLimit || 0), 0);
  const totalBudgetSpent = activeBudgets.reduce((s, b) => s + Number(b.spent || 0), 0);
  const totalBudgetRemaining = totalBudgetLimit - totalBudgetSpent;
  const overallBudgetUtilization = totalBudgetLimit > 0 ? Math.min(100, (totalBudgetSpent / totalBudgetLimit) * 100) : 0;
  
  // At most two budgets needing attention (approaching >= 80% or exceeded, or top spent)
  const attentionBudgets = [...activeBudgets]
    .sort((a, b) => b.percentUsed - a.percentUsed)
    .slice(0, 2);

  // Goals calculations
  const userGoals = goals || [];
  const totalGoalTarget = userGoals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
  const totalGoalSaved = userGoals.reduce((s, g) => s + Number(g.contributed || 0), 0);
  const overallGoalProgress = totalGoalTarget > 0 ? Math.min(100, (totalGoalSaved / totalGoalTarget) * 100) : 0;
  
  // At most two active goals
  const activeGoalsPreview = [...userGoals].sort((a, b) => b.progressPct - a.progressPct).slice(0, 2);

  // Exactly 5 recent transactions
  const recentTransactions = [...activeTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Comparison metrics with previous period
  const prevData = activeSummary.previous;

  // ─── Financial Insights (2-3 rule-based observations) ──────────────────────
  const insights = (() => {
    const list = [];

    // 1. Savings Rate insight
    if (activeSummary.income > 0) {
      const rate = activeSummary.savingsRate;
      if (rate >= 0.2) {
        list.push({
          id: "savings",
          title: "Healthy Savings Rate",
          desc: `You preserved ${(rate * 100).toFixed(0)}% of income in ${periodLabel}, exceeding the 20% benchmark.`,
          type: "pos",
          href: "/dashboard/analytics",
        });
      } else if (rate > 0) {
        list.push({
          id: "savings",
          title: "Moderate Savings Pacing",
          desc: `You saved ${(rate * 100).toFixed(0)}% of income. Increasing savings toward 20% will build stronger cash reserves.`,
          type: "neutral",
          href: "/dashboard/analytics",
        });
      } else {
        list.push({
          id: "savings",
          title: "Deficit This Period",
          desc: `Expenses exceeded income by ${currencyFormatter(Math.abs(activeSummary.savings))} for ${periodLabel}.`,
          type: "neg",
          href: "/dashboard/expenses",
        });
      }
    }

    // 2. Budget insight
    if (totalBudgetLimit > 0) {
      const exceeded = activeBudgets.filter((b) => b.status === "EXCEEDED");
      if (exceeded.length > 0) {
        list.push({
          id: "budget",
          title: `${exceeded.length} Budget${exceeded.length > 1 ? "s" : ""} Exceeded`,
          desc: `${exceeded.map((b) => b.category?.name).slice(0, 2).join(", ")} exceeded set monthly limits.`,
          type: "neg",
          href: "/dashboard/budgets",
        });
      } else if (overallBudgetUtilization >= 80) {
        list.push({
          id: "budget",
          title: "Approaching Budget Limit",
          desc: `You have utilized ${overallBudgetUtilization.toFixed(0)}% of your planned category limits.`,
          type: "warning",
          href: "/dashboard/budgets",
        });
      } else {
        list.push({
          id: "budget",
          title: "Disciplined Budget Pacing",
          desc: `Category expenses are comfortably controlled at ${overallBudgetUtilization.toFixed(0)}% utilization.`,
          type: "pos",
          href: "/dashboard/budgets",
        });
      }
    }

    // 3. Asset valuation or spending trend insight
    if (unvaluedAssetsCount > 0) {
      list.push({
        id: "valuation",
        title: "Asset Valuation Needed",
        desc: `${unvaluedAssetsCount} holding${unvaluedAssetsCount > 1 ? "s" : ""} await current valuation for complete Net Worth tracking.`,
        type: "warning",
        href: "/dashboard/portfolio",
      });
    } else if (prevData?.hasData && prevData.expenseChangePct !== null) {
      if (prevData.expenseChangePct <= -5) {
        list.push({
          id: "trend",
          title: "Spending Reduced",
          desc: `Expenses are down ${Math.abs(prevData.expenseChangePct)}% compared to the previous period.`,
          type: "pos",
          href: "/dashboard/expenses",
        });
      } else if (prevData.expenseChangePct >= 10) {
        list.push({
          id: "trend",
          title: "Spending Increased",
          desc: `Expenses rose ${prevData.expenseChangePct}% compared to the previous period.`,
          type: "neutral",
          href: "/dashboard/expenses",
        });
      }
    }

    // Fallback if brand new account with 0 data
    if (list.length === 0) {
      list.push({
        id: "welcome",
        title: "Track Your Financial Pulse",
        desc: "Add your regular expenses and investment assets to generate automated health insights.",
        type: "neutral",
        href: "/dashboard/transactions",
      });
    }

    return list.slice(0, 3);
  })();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-5 sm:py-6 font-editorial space-y-5 sm:space-y-6">
      <ErrorState message={error} onRetry={refetch} />

      {/* ── A. Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-line sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-screamer text-xl sm:text-2xl uppercase tracking-wide text-ink truncate">
            {greetingTime}, {user?.name?.split(" ")[0] || "Investor"}
          </h1>
          <p className="text-xs text-ink-soft mt-0.5 truncate">
            Financial overview for <span className="font-semibold text-ink">{periodLabel}</span>.
          </p>
        </div>

        {/* Period Selector — horizontally scrollable on mobile */}
        <div className="overflow-x-auto scrollbar-none -mx-0.5 px-0.5">
          <div className="flex items-center gap-2 w-max">
            <div className="flex items-center rounded-lg bg-paper-raised p-1 border border-line shrink-0">
              {[
                { id: "monthly", label: "Monthly" },
                { id: "yearly", label: "Yearly" },
                { id: "all_time", label: "All Time" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriodMode(item.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                    periodMode === item.id
                      ? "bg-horizon text-[#0f1b33] shadow-sm font-bold"
                      : "text-ink-soft hover:text-ink hover:bg-paper"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {periodMode === "monthly" && (
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2 py-1 bg-paper-raised border border-line rounded-md text-xs text-ink focus:border-horizon cursor-pointer outline-none"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2 py-1 bg-paper-raised border border-line rounded-md text-xs text-ink focus:border-horizon cursor-pointer outline-none"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodMode === "yearly" && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-1 bg-paper-raised border border-line rounded-md text-xs text-ink focus:border-horizon cursor-pointer outline-none shrink-0"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}

            {periodLoading && (
              <span className="flex items-center gap-1 text-[11px] text-horizon animate-pulse shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-horizon animate-ping" />
                Syncing…
              </span>
            )}
          </div>
        </div>
      </div>

      {periodError && (
        <ErrorState message={periodError} onRetry={() => fetchPeriodData(periodMode, selectedMonth, selectedYear)} />
      )}

      {/* ── B. Financial Overview (4 Summary Cards) ────────────────────────── */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
        {/* 1. Total Income */}
        <div className="rounded-xl border border-line bg-paper-raised p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">Total Income</span>
            <p className="font-figure text-2xl font-bold text-ink mt-1.5">
              {currencyFormatter(activeSummary.income)}
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5">Recorded in {periodLabel}</p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-line/40 text-[11px]">
            {prevData?.hasData && prevData.incomeChangePct !== null ? (
              <span className={`inline-flex items-center gap-0.5 font-medium ${prevData.incomeChangePct >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                {prevData.incomeChangePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {prevData.incomeChangePct >= 0 ? "+" : ""}{prevData.incomeChangePct}% vs prev
              </span>
            ) : (
              <span className="text-ink-soft/70">Inflow baseline</span>
            )}
          </div>
        </div>

        {/* 2. Total Expenses */}
        <div className="rounded-xl border border-line bg-paper-raised p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">Total Expenses</span>
            <p className="font-figure text-2xl font-bold text-ink mt-1.5">
              {currencyFormatter(activeSummary.expense)}
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5">Spent across categories</p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-line/40 text-[11px]">
            {prevData?.hasData && prevData.expenseChangePct !== null ? (
              <span className={`inline-flex items-center gap-0.5 font-medium ${prevData.expenseChangePct <= 0 ? "text-signal-pos" : "text-amber-400"}`}>
                {prevData.expenseChangePct <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {prevData.expenseChangePct >= 0 ? "+" : ""}{prevData.expenseChangePct}% vs prev
              </span>
            ) : (
              <span className="text-ink-soft/70">Outflow baseline</span>
            )}
          </div>
        </div>

        {/* 3. Total Savings */}
        <div className="rounded-xl border border-line bg-paper-raised p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">Total Savings</span>
            <p className={`font-figure text-2xl font-bold mt-1.5 ${Number(activeSummary.savings) >= 0 ? "text-ink" : "text-signal-neg"}`}>
              {currencyFormatter(activeSummary.savings)}
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5">
              {activeSummary.income > 0 ? (
                <span className="font-semibold text-horizon">
                  {(activeSummary.savingsRate * 100).toFixed(0)}% savings rate
                </span>
              ) : (
                "Net period cash flow"
              )}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-line/40 text-[11px]">
            {prevData?.hasData && prevData.savingsDiff !== null ? (
              <span className={`font-medium ${prevData.savingsDiff >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                {prevData.savingsDiff >= 0 ? "+" : ""}{currencyFormatter(prevData.savingsDiff)} vs prev
              </span>
            ) : (
              <span className="text-ink-soft/70">Period cash margin</span>
            )}
          </div>
        </div>

        {/* 4. Net Worth */}
        <div className="rounded-xl border border-line bg-paper-raised p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">Net Worth</span>
            <p className="font-figure text-2xl font-bold text-ink mt-1.5">
              {currencyFormatter(netWorth)}
            </p>
            <p className="text-[11px] text-ink-soft mt-0.5 truncate" title={`Cash: ₹${fmtNumber(cashSavings)} · Assets: ₹${fmtNumber(portfolioValuation)}`}>
              Cash: ₹{fmtNumber(cashSavings)} · Assets: ₹{fmtNumber(portfolioValuation)}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-line/40 text-[11px]">
            {unvaluedAssetsCount > 0 ? (
              <span className="text-amber-400 text-[10px]">
                Excludes {unvaluedAssetsCount} unpriced holding{unvaluedAssetsCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-signal-pos text-[10px]">All holdings priced</span>
            )}
          </div>
        </div>
      </div>

      {/* ── C. Spending Overview & Financial Health (2 Balanced Columns) ───── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending Overview */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div>
                <h2 className="font-screamer text-base uppercase tracking-wider text-ink">
                  Spending Overview
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Total: <strong className="text-ink font-semibold">{currencyFormatter(totalExpenseAmount)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-md bg-paper p-0.5 border border-line">
                  {["pie", "bar"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setChartType(type)}
                      className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded cursor-pointer transition-colors ${
                        chartType === type
                          ? "bg-horizon text-[#0f1b33] font-bold"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {type === "pie" ? "Donut" : "Bar"}
                    </button>
                  ))}
                </div>
                <Link href="/dashboard/expenses" className="text-xs text-horizon hover:underline font-semibold">
                  View All →
                </Link>
              </div>
            </div>

            {previewCategories.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-ink">No expenses recorded</p>
                <p className="text-xs text-ink-soft mt-1">
                  Log an expense or upload a statement for {periodLabel}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                {/* Donut / Bar Chart */}
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "pie" ? (
                      <PieChart>
                        <Pie
                          data={previewCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {previewCategories.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={chartColors[idx % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [currencyFormatter(v), "Spent"]}
                          contentStyle={tooltipStyle}
                        />
                      </PieChart>
                    ) : (
                      <BarChart data={previewCategories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" opacity={0.3} />
                        <XAxis dataKey="name" stroke="var(--color-ink-soft)" fontSize={9} tickLine={false} />
                        <YAxis stroke="var(--color-ink-soft)" fontSize={9} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip formatter={(v) => [currencyFormatter(v), "Spent"]} contentStyle={tooltipStyle} />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                          {previewCategories.map((_, idx) => (
                            <Cell key={`bar-${idx}`} fill={chartColors[idx % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Legend (Top 5 categories) */}
                <div className="flex-1 w-full space-y-2">
                  {previewCategories.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                        />
                        <span className="text-ink truncate font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-figure">
                        <span className="text-ink font-semibold">{currencyFormatter(item.value)}</span>
                        <span className="text-ink-soft text-[11px] w-9 text-right">
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* FinScore */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div>
                <h2 className="font-screamer text-base uppercase tracking-wider text-ink">
                  FinScore
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Five-pillar weighted resilience score
                </p>
              </div>
              <Link href="/dashboard/financial-health" className="text-xs text-horizon hover:underline font-semibold">
                View Details →
              </Link>
            </div>

            {/* Score & Rating Headline */}
            <div className="flex items-center justify-between mb-4 bg-paper rounded-lg p-3 border border-line">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="font-figure text-2xl font-bold text-ink">
                    {activeHealth.score ?? "—"}
                  </span>
                  <span className="text-xs text-ink-soft">/ 100</span>
                </div>
                {activeHealth.score !== null && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getScoreRating(activeHealth.score).bg} ${getScoreRating(activeHealth.score).color} ${getScoreRating(activeHealth.score).border}`}>
                    {activeHealth.rating || getScoreRating(activeHealth.score).label}
                  </span>
                )}
              </div>

              <div className="text-right text-xs">
                {activeHealth.delta !== undefined && activeHealth.delta !== 0 ? (
                  <span className={`inline-flex items-center gap-1 font-semibold ${activeHealth.delta > 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                    {activeHealth.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {activeHealth.delta > 0 ? "+" : ""}{activeHealth.delta} pts vs prev
                  </span>
                ) : (
                  <span className="text-ink-soft">Stable pacing</span>
                )}
              </div>
            </div>

            {/* Compact Component Scores */}
            <div className="space-y-2">
              {[
                { key: "savingsRate", label: "Savings & Cash Flow", weight: "30%", color: "bg-emerald-400" },
                { key: "budgetDiscipline", label: "Budget Management", weight: "20%", color: "bg-blue-400" },
                { key: "emergencyFund", label: "Emergency Fund", weight: "20%", color: "bg-amber-400" },
                { key: "diversification", label: "Investment Diversification", weight: "20%", color: "bg-violet-400" },
                { key: "debtRatio", label: "Debt Health", weight: "10%", color: "bg-rose-400" },
              ].map(({ key, label, weight, color }) => {
                const detail = activeHealth.componentDetails?.[key];
                const scoreVal = detail?.score;
                const isUnavailable = scoreVal === null || scoreVal === undefined;

                return (
                  <div key={key} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-ink font-medium">
                        {label} <span className="text-[10px] text-ink-soft">({weight})</span>
                      </span>
                      <span className="font-figure font-semibold">
                        {isUnavailable ? (
                          <span className="text-ink-soft/60 italic text-[11px]">Unavailable</span>
                        ) : (
                          <span className="text-ink">{scoreVal} / 100</span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                      {!isUnavailable && (
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-300`}
                          style={{ width: `${Math.max(4, scoreVal)}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ── D. Budgets and Savings Goals (Two Balanced Cards) ───────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div>
                <h2 className="font-screamer text-base uppercase tracking-wider text-ink">
                  Budget Status
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  {totalBudgetLimit > 0 ? (
                    <>
                      {currencyFormatter(totalBudgetSpent)} spent of {currencyFormatter(totalBudgetLimit)}
                    </>
                  ) : (
                    "No budgets set for this period"
                  )}
                </p>
              </div>
              <Link href="/dashboard/budgets" className="text-xs text-horizon hover:underline font-semibold">
                Manage Budgets →
              </Link>
            </div>

            {totalBudgetLimit === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-ink">No category budgets active</p>
                <p className="text-xs text-ink-soft mt-1">
                  Configure limits to track your category spending pace.
                </p>
                <Link
                  href="/dashboard/budgets"
                  className="inline-block mt-3 text-xs font-semibold text-horizon hover:underline"
                >
                  Create budget limit →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overall Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-ink font-medium">Overall Pace</span>
                    <span className={`font-figure font-semibold ${overallBudgetUtilization > 100 ? "text-signal-neg" : overallBudgetUtilization >= 80 ? "text-amber-400" : "text-signal-pos"}`}>
                      {overallBudgetUtilization.toFixed(0)}% used · {totalBudgetRemaining >= 0 ? `${currencyFormatter(totalBudgetRemaining)} left` : `${currencyFormatter(Math.abs(totalBudgetRemaining))} exceeded`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        overallBudgetUtilization > 100
                          ? "bg-signal-neg"
                          : overallBudgetUtilization >= 80
                          ? "bg-amber-400"
                          : "bg-signal-pos"
                      }`}
                      style={{ width: `${Math.min(100, overallBudgetUtilization)}%` }}
                    />
                  </div>
                </div>

                {/* At most two budgets needing attention */}
                <div className="space-y-2 pt-1 border-t border-line/40">
                  <p className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold">
                    Top Monitored Categories
                  </p>
                  {attentionBudgets.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-1">
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-ink truncate">{b.category?.name || "Category"}</p>
                        <p className="text-[11px] text-ink-soft">
                          {currencyFormatter(b.spent)} / {currencyFormatter(b.monthlyLimit)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                        b.percentUsed > 100
                          ? "bg-signal-neg/10 text-signal-neg border border-signal-neg/30"
                          : b.percentUsed >= 80
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-signal-pos/10 text-signal-pos border border-signal-pos/30"
                      }`}>
                        {b.percentUsed.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Savings Goals Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div>
                <h2 className="font-screamer text-base uppercase tracking-wider text-ink">
                  Savings Goals
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  {totalGoalTarget > 0 ? (
                    <>
                      {currencyFormatter(totalGoalSaved)} saved of {currencyFormatter(totalGoalTarget)}
                    </>
                  ) : (
                    "No savings goals active"
                  )}
                </p>
              </div>
              <Link href="/dashboard/goals" className="text-xs text-horizon hover:underline font-semibold">
                Manage Goals →
              </Link>
            </div>

            {userGoals.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-ink">No active goals</p>
                <p className="text-xs text-ink-soft mt-1">
                  Earmark savings for emergencies, home down payments, or purchases.
                </p>
                <Link
                  href="/dashboard/goals"
                  className="inline-block mt-3 text-xs font-semibold text-horizon hover:underline"
                >
                  Create savings goal →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overall Goal Progress */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-ink font-medium">Cumulative Progress</span>
                    <span className="font-figure font-semibold text-horizon">
                      {overallGoalProgress.toFixed(0)}% completed
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full rounded-full bg-horizon transition-all duration-300"
                      style={{ width: `${Math.min(100, overallGoalProgress)}%` }}
                    />
                  </div>
                </div>

                {/* At most two active goals */}
                <div className="space-y-2 pt-1 border-t border-line/40">
                  <p className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold">
                    Priority Goals
                  </p>
                  {activeGoalsPreview.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-xs py-1">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-ink truncate">{g.title}</p>
                          {g.isEmergencyFund && (
                            <span className="px-1 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-mono">
                              Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-soft">
                          {currencyFormatter(g.contributed)} / {currencyFormatter(g.targetAmount)}
                        </p>
                      </div>
                      <span className="font-figure font-semibold text-ink text-xs">
                        {g.progressPct.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── E. Investments (ONE Compact Summary Card) ─────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
          <div>
            <h2 className="font-screamer text-base uppercase tracking-wider text-ink">
              Investments
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Holdings across Stocks, Mutual Funds, Gold, and Fixed Deposits
            </p>
          </div>
          <Link href="/dashboard/portfolio" className="text-xs text-horizon hover:underline font-semibold">
            View All Assets →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">Known Current Value</span>
            <p className="font-figure text-lg font-bold text-ink mt-1">
              {portfolioValuation > 0 ? currencyFormatter(portfolioValuation) : "—"}
            </p>
            <p className="text-[11px] text-ink-soft">Verified holdings</p>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">Total Invested</span>
            <p className="font-figure text-lg font-bold text-ink mt-1">
              {currencyFormatter(portfolio.summary.totalInvested || 0)}
            </p>
            <p className="text-[11px] text-ink-soft">{portfolio.holdings.length} recorded holdings</p>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">Unrealized Gain / Loss</span>
            {pricedHoldingsCount > 0 ? (
              <>
                <p className={`font-figure text-lg font-bold mt-1 ${portfolio.summary.returns >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                  {portfolio.summary.returns >= 0 ? "+" : ""}{currencyFormatter(portfolio.summary.returns)}
                </p>
                <p className="text-[11px] text-ink-soft">
                  {portfolio.summary.returnsPct !== null ? `${portfolio.summary.returns >= 0 ? "+" : ""}${portfolio.summary.returnsPct.toFixed(1)}% on priced holdings` : "On priced holdings"}
                </p>
              </>
            ) : (
              <>
                <p className="font-figure text-lg font-bold text-ink-soft mt-1">—</p>
                <p className="text-[11px] text-ink-soft">Awaiting valuation</p>
              </>
            )}
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">Awaiting Valuation</span>
            <p className="font-figure text-lg font-bold text-ink mt-1">
              {unvaluedAssetsCount}
            </p>
            <p className="text-[11px] text-ink-soft">
              {unvaluedAssetsCount > 0 ? "Update in portfolio" : "100% priced"}
            </p>
          </div>
        </div>
      </Card>

      {/* ── F. Recent Transactions and Financial Insights (Two Columns) ────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div>
                <h2 className="font-screamer text-base uppercase tracking-wider text-ink">
                  Recent Activity
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Latest recorded entries
                </p>
              </div>
              <Link href="/dashboard/transactions" className="text-xs text-horizon hover:underline font-semibold">
                View All →
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-ink">No recent transactions</p>
                <p className="text-xs text-ink-soft mt-1">
                  Add transactions manually or import a bank statement.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line/30">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  const isTransfer = tx.type === "TRANSFER";
                  const cleanTitle = formatCleanDescription(tx.description);

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2.5 hover:bg-paper/30 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-medium text-ink text-xs truncate max-w-[200px] sm:max-w-xs" title={tx.description}>
                          {cleanTitle}
                        </p>
                        <p className="text-[11px] text-ink-soft">
                          {tx.categoryName} · {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      </div>

                      <span
                        className={`font-figure font-bold text-xs shrink-0 ${
                          isIncome
                            ? "text-signal-pos"
                            : isTransfer
                            ? "text-blue-400"
                            : "text-signal-neg"
                        }`}
                      >
                        {isIncome ? "+" : isTransfer ? "" : "−"}
                        {currencyFormatter(tx.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Financial Insights */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div>
                <h2 className="font-screamer text-base uppercase tracking-wider text-ink">
                  Financial Insights
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Automated rule-based observations
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-paper border border-line text-ink-soft">
                Verified
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-lg border border-line bg-paper/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-ink flex items-center gap-1.5">
                      {insight.type === "pos" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-signal-pos shrink-0" />
                      ) : insight.type === "warning" ? (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      ) : insight.type === "neg" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-signal-neg shrink-0" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-horizon shrink-0" />
                      )}
                      <span>{insight.title}</span>
                    </p>
                    <p className="text-ink-soft text-[11px] leading-relaxed">
                      {insight.desc}
                    </p>
                  </div>
                  {insight.href && (
                    <Link
                      href={insight.href}
                      className="text-horizon hover:underline text-[11px] font-semibold shrink-0 pt-0.5"
                    >
                      View →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
