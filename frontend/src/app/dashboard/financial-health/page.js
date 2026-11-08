"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card, ErrorState } from "@/components/ui";
import {
  MonthlyHealthView,
  WeeklyMonitoringView,
  YearlyProgressView,
} from "@/components/HealthScoreDisplay";
import { useFinance } from "@/context/FinanceContext";
import { api } from "@/lib/api";
import { Info, Activity, ShieldCheck, Compass } from "lucide-react";

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative group">
      <button
        type="button"
        aria-label="How FinScore works"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper-raised text-ink-soft hover:text-ink cursor-pointer transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>
      <div
        className={`absolute right-0 top-10 z-30 w-80 rounded-xl border border-line bg-paper-raised p-4 text-left text-xs font-editorial text-ink-soft shadow-xl ${
          open ? "block" : "hidden group-hover:block"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

export default function FinancialHealthPage() {
  const { loading: initialLoading, error, refetch } = useFinance();

  const now = new Date();
  const [viewMode, setViewMode] = useState("monthly"); // "weekly" | "monthly" | "yearly"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [healthData, setHealthData] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const fetchHealthScore = useCallback(async (mode, m, y, w) => {
    setPeriodLoading(true);
    setPeriodError("");
    const params = new URLSearchParams();
    params.set("period", mode);
    if (y) params.set("year", String(y));
    if (m) params.set("month", String(m));
    if (w) params.set("week", String(w));

    try {
      const res = await api.healthScore(`?${params.toString()}`);
      setHealthData(res);
      if (res?.weekly?.selectedWeek && !w) {
        setSelectedWeek(res.weekly.selectedWeek);
      }
    } catch (err) {
      setPeriodError(err.message || "Failed to load financial health data.");
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchHealthScore(viewMode, selectedMonth, selectedYear, selectedWeek);
    }
  }, [initialLoading, viewMode, selectedMonth, selectedYear, selectedWeek, fetchHealthScore]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 space-y-8">
      {/* Page Header */}
      <PageHeader
        title="FinScore"
        description="A clear view of where your money stands, how each area is doing, and simple next steps to improve."
        action={
          <InfoTooltip
            text="FinSight evaluates 5 core pillars: Savings & Cash Flow (30%), Budget Management (20%), Emergency Fund (20%), Investment Diversification (20%), and Debt Health (10%). If any information is not reported, FinSight never assumes zero or awards a fake score — weights adjust dynamically across your verified data."
          />
        }
      />

      <ErrorState message={error} onRetry={refetch} />

      {/* Primary Navigation Tabs: Weekly (Monitoring) | Monthly (Health Score) | Yearly (Progress) */}
      <Card className="bg-paper-raised/90 border border-line/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-paper p-1.5 rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setViewMode("weekly")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                viewMode === "weekly"
                  ? "bg-horizon text-[#0f1b33] font-bold shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-ink/5"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Weekly Monitoring</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                viewMode === "monthly"
                  ? "bg-horizon text-[#0f1b33] font-bold shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-ink/5"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Monthly FinScore</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("yearly")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                viewMode === "yearly"
                  ? "bg-horizon text-[#0f1b33] font-bold shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-ink/5"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Yearly Progress</span>
            </button>
          </div>

          {/* Period Selectors */}
          <div className="flex items-center gap-2">
            {(viewMode === "monthly" || viewMode === "weekly") && (
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setSelectedWeek(null);
                }}
                className="px-3 py-1.5 bg-paper border border-line rounded-lg text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-paper border border-line rounded-lg text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {periodLoading && (
              <span className="text-xs text-horizon font-editorial animate-pulse flex items-center gap-1.5 ml-2">
                <span className="inline-block h-2 w-2 rounded-full bg-horizon animate-ping" />
                Updating…
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Period Error State */}
      {periodError && (
        <ErrorState
          message={periodError}
          onRetry={() => fetchHealthScore(viewMode, selectedMonth, selectedYear, selectedWeek)}
        />
      )}

      {/* Initial Skeleton Loader */}
      {initialLoading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-ink/5" />
      ) : !healthData ? null : (
        <div className={`transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
          {/* 1. WEEKLY MONITORING VIEW */}
          {viewMode === "weekly" && (
            <WeeklyMonitoringView
              weeklyData={healthData.weekly}
              onSelectWeek={(wNum) => {
                setSelectedWeek(wNum);
                fetchHealthScore("weekly", selectedMonth, selectedYear, wNum);
              }}
            />
          )}

          {/* 2. MONTHLY HEALTH SCORE VIEW (PRIMARY) */}
          {viewMode === "monthly" && <MonthlyHealthView healthData={healthData} />}

          {/* 3. YEARLY FINANCIAL PROGRESS VIEW */}
          {viewMode === "yearly" && <YearlyProgressView yearlyData={healthData.yearly} />}
        </div>
      )}
    </div>
  );
}
