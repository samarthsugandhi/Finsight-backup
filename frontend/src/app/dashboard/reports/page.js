"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PageHeader,
  Card,
  ErrorState,
  EmptyState,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

// ─── Utility formatters ───────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtShort = (n) => {
  const abs = Math.abs(Number(n) || 0);
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(1)}K`;
  return `₹${abs.toFixed(0)}`;
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_OPTS = MONTH_NAMES.map((m, i) => ({ value: i + 1, label: m }));
const YEAR_OPTS = [2024, 2025, 2026, 2027];

const CATEGORY_COLORS = [
  "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6",
  "#EC4899","#14B8A6","#F97316","#6366F1","#84CC16",
];

// ─── Helper: build query string from report state ─────────────────────────────
function buildParams({ periodMode, month, year, startDate, endDate, content, type, search, page, limit }) {
  const p = new URLSearchParams();
  p.set("period", periodMode);
  if (periodMode === "monthly") { p.set("month", month); p.set("year", year); }
  if (periodMode === "yearly") { p.set("year", year); }
  if (periodMode === "custom") { p.set("startDate", startDate); p.set("endDate", endDate); }
  p.set("content", content);
  p.set("type", type);
  if (search) p.set("search", search);
  p.set("page", page);
  p.set("limit", limit);
  return "?" + p.toString();
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ label, value, formatted, positive, comparison, comparisonLabel, icon: Icon }) {
  const isUp = comparison > 0;
  const isDown = comparison < 0;
  const showDelta = comparison !== null && comparison !== undefined;

  return (
    <div className="rounded-xl border border-line bg-paper-raised p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
        {Icon && (
          <span className={`rounded-md p-1.5 ${positive ? "bg-signal-pos/10" : "bg-signal-neg/10"}`}>
            <Icon className={`h-3.5 w-3.5 ${positive ? "text-signal-pos" : "text-signal-neg"}`} />
          </span>
        )}
      </div>
      <p className={`font-figure text-2xl font-semibold ${positive ? "text-signal-pos" : positive === false ? "text-signal-neg" : "text-ink"}`}>
        {formatted ?? fmt(value)}
      </p>
      {showDelta && (
        <div className="mt-2 flex items-center gap-1.5">
          {isUp ? (
            <ArrowUpRight className={`h-3 w-3 ${positive ? "text-signal-pos" : "text-signal-neg"}`} />
          ) : isDown ? (
            <ArrowDownRight className={`h-3 w-3 ${positive ? "text-signal-neg" : "text-signal-pos"}`} />
          ) : (
            <Minus className="h-3 w-3 text-ink-soft" />
          )}
          <span className={`text-xs font-editorial ${
            isUp && positive ? "text-signal-pos" :
            isUp && !positive ? "text-signal-neg" :
            isDown && positive ? "text-signal-neg" :
            isDown && !positive ? "text-signal-pos" :
            "text-ink-soft"
          }`}>
            {comparison > 0 ? "+" : ""}{comparison.toFixed(1)}% vs {comparisonLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Custom Tooltip for Charts ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-paper-raised p-3 shadow-lg text-xs font-editorial">
      <p className="font-semibold text-ink mb-2">{label}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-ink-soft">{item.name}:</span>
          <span className="text-ink font-semibold">{fmt(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────
function ReportPeriodSelector({
  periodMode, setPeriodMode,
  month, setMonth,
  year, setYear,
  startDate, setStartDate,
  endDate, setEndDate,
  dateRangeError, setDateRangeError,
  loading,
}) {
  const modes = [
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly" },
    { id: "custom", label: "Custom Range" },
  ];

  return (
    <div className="rounded-xl border border-line bg-paper-raised p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Mode tabs */}
        <div className="flex items-center rounded-lg bg-paper p-1 border border-line gap-0.5">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setPeriodMode(m.id); setDateRangeError(""); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all duration-200 ${
                periodMode === m.id
                  ? "bg-horizon text-[#0f1b33] shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-ink/5"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Monthly controls */}
        {periodMode === "monthly" && (
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink focus:outline-none focus:border-horizon cursor-pointer"
            >
              {MONTH_OPTS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink focus:outline-none focus:border-horizon cursor-pointer"
            >
              {YEAR_OPTS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Yearly controls */}
        {periodMode === "yearly" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-soft">Year:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink focus:outline-none focus:border-horizon cursor-pointer"
            >
              {YEAR_OPTS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Custom range controls */}
        {periodMode === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-ink-soft">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDateRangeError(""); }}
                className="px-2 py-1.5 bg-paper border border-line rounded-md text-xs text-ink focus:outline-none focus:border-horizon cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-ink-soft">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDateRangeError(""); }}
                className="px-2 py-1.5 bg-paper border border-line rounded-md text-xs text-ink focus:outline-none focus:border-horizon cursor-pointer"
              />
            </div>
            {dateRangeError && (
              <span className="text-xs text-signal-neg font-editorial">{dateRangeError}</span>
            )}
          </div>
        )}

        {loading && (
          <span className="ml-auto text-xs text-horizon font-editorial animate-pulse flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-horizon animate-ping" />
            Loading report…
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Export Controls ──────────────────────────────────────────────────────────
function ExportControls({ content, setContent, onExportPdf, onExportCsv, exporting }) {
  const contentOpts = [
    { id: "summary", label: "Summary" },
    { id: "detailed", label: "Detailed Report" },
    { id: "transactions", label: "Transactions Only" },
  ];

  return (
    <div className="rounded-xl border border-line bg-paper-raised p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Report Contents:</span>
          <div className="flex items-center rounded-lg bg-paper p-1 border border-line gap-0.5">
            {contentOpts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setContent(c.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all duration-200 ${
                  content === c.id
                    ? "bg-horizon text-[#0f1b33]"
                    : "text-ink-soft hover:text-ink hover:bg-ink/5"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!!exporting}
            className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold border border-line text-ink hover:bg-ink/5 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {exporting === "csv" ? "Exporting…" : "Download CSV"}
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!!exporting}
            className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold bg-ink text-paper hover:bg-ink/90 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            {exporting === "pdf" ? "Generating PDF…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Reports Page ────────────────────────────────────────────────────────
export default function ReportsPage() {
  const now = new Date();

  // Period state
  const [periodMode, setPeriodMode] = useState("monthly");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => now.toISOString().slice(0, 10));
  const [dateRangeError, setDateRangeError] = useState("");

  // Content/export state
  const [content, setContent] = useState("summary");
  const [exporting, setExporting] = useState(null); // "pdf" | "csv" | null

  // Transaction filter state
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Report data
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef(null);

  // Build query params and fetch report data
  const fetchReport = useCallback(async (override = {}) => {
    const params = {
      periodMode: override.periodMode ?? periodMode,
      month: override.month ?? month,
      year: override.year ?? year,
      startDate: override.startDate ?? startDate,
      endDate: override.endDate ?? endDate,
      content: override.content ?? content,
      type: override.type ?? typeFilter,
      search: override.search ?? searchQuery,
      page: override.page ?? page,
      limit: PAGE_SIZE,
    };

    // Validate custom range
    if (params.periodMode === "custom") {
      if (!params.startDate || !params.endDate) {
        setDateRangeError("Both start and end dates are required.");
        return;
      }
      if (new Date(params.startDate) > new Date(params.endDate)) {
        setDateRangeError("Start date must be on or before end date.");
        return;
      }
    }

    setDateRangeError("");
    setLoading(true);
    setError("");

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const result = await api.reportData(buildParams(params));
      if (!ac.signal.aborted) {
        setReport(result.data);
      }
    } catch (err) {
      if (!ac.signal.aborted) {
        setError(err.message || "Failed to load report data.");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [periodMode, month, year, startDate, endDate, content, typeFilter, searchQuery, page]);

  // Fetch on mount and whenever period/filters change
  useEffect(() => {
    fetchReport();
    return () => { abortRef.current?.abort(); };
  }, [fetchReport]);

  // Reset page when filters change
  const handleTypeFilter = (t) => { setTypeFilter(t); setPage(1); };
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };
  const clearSearch = () => { setSearchInput(""); setSearchQuery(""); setPage(1); };

  // Trigger file download from blob
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const params = buildParams({ periodMode, month, year, startDate, endDate, content, type: typeFilter, search: searchQuery, page: 1, limit: 2000 });
      const { blob, filename } = await api.reportExportPdf(params);
      triggerDownload(blob, filename);
    } catch (err) {
      setError(err.message || "PDF export failed.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting("csv");
    try {
      const params = buildParams({ periodMode, month, year, startDate, endDate, content, type: typeFilter, search: searchQuery, page: 1, limit: 5000 });
      const { blob, filename } = await api.reportExportCsv(params);
      triggerDownload(blob, filename);
    } catch (err) {
      setError(err.message || "CSV export failed.");
    } finally {
      setExporting(null);
    }
  };

  const data = report;
  const summary = data?.summary;
  const comparison = data?.comparison;

  const periodLabel = data?.periodLabel ?? (
    periodMode === "monthly" ? `${MONTH_NAMES[month - 1]} ${year}` :
    periodMode === "yearly" ? `Calendar Year ${year}` :
    startDate && endDate ? `${startDate} to ${endDate}` : "Selected Period"
  );

  // Chart data
  const incomeExpenseChartData = data?.monthlyTrends?.length > 0
    ? data.monthlyTrends.map((m) => ({ name: m.monthName, Income: m.income, Expenses: m.expense }))
    : data?.summary ? [{ name: periodLabel, Income: data.summary.totalIncome, Expenses: data.summary.totalExpenses }]
    : [];

  const categoryChartData = (data?.spendingByCategory ?? [])
    .slice(0, 8)
    .map((c) => ({ name: c.categoryName, value: c.amount, pct: c.percentage }));

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <PageHeader
        title="Reports"
        description={`Financial performance for ${periodLabel} · Currency: INR`}
      />

      <ErrorState message={error} onRetry={() => fetchReport()} />

      {/* ─── Period Selector ─────────────────────────────────────────────── */}
      <ReportPeriodSelector
        periodMode={periodMode} setPeriodMode={(v) => { setPeriodMode(v); setPage(1); }}
        month={month} setMonth={(v) => { setMonth(v); setPage(1); }}
        year={year} setYear={(v) => { setYear(v); setPage(1); }}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        dateRangeError={dateRangeError} setDateRangeError={setDateRangeError}
        loading={loading}
      />

      {/* ─── Export Controls ─────────────────────────────────────────────── */}
      <ExportControls
        content={content}
        setContent={setContent}
        onExportPdf={handleExportPdf}
        onExportCsv={handleExportCsv}
        exporting={exporting}
      />

      {/* ─── Loading Skeleton ─────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-ink/5" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-xl bg-ink/5" />
          <div className="h-64 animate-pulse rounded-xl bg-ink/5" />
        </div>
      )}

      {/* ─── Report Body ─────────────────────────────────────────────────── */}
      {data && (
        <div className={`space-y-6 transition-opacity duration-200 ${loading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>

          {/* 1. Data Coverage / Integrity Notice */}
          {!data.dataCoverage?.isComplete && data.dataCoverage?.notes?.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm font-editorial">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-700 dark:text-yellow-400 text-xs uppercase tracking-wide mb-1">Data Coverage Notice</p>
                {data.dataCoverage.notes.map((note, i) => (
                  <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300">• {note}</p>
                ))}
              </div>
            </div>
          )}

          {/* 2. Summary Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Income"
              value={summary.totalIncome}
              positive={true}
              icon={TrendingUp}
              comparison={comparison?.hasPreviousData ? comparison.incomeChangePct : null}
              comparisonLabel="prior period"
            />
            <StatCard
              label="Total Expenses"
              value={summary.totalExpenses}
              positive={false}
              icon={TrendingDown}
              comparison={comparison?.hasPreviousData ? comparison.expenseChangePct : null}
              comparisonLabel="prior period"
            />
            <StatCard
              label="Net Cash Flow"
              value={summary.netCashFlow}
              positive={summary.netCashFlow >= 0}
              icon={summary.netCashFlow >= 0 ? TrendingUp : TrendingDown}
              comparison={null}
            />
            <StatCard
              label="Savings Rate"
              formatted={summary.savingsRate !== null ? `${summary.savingsRate.toFixed(1)}%` : "N/A"}
              positive={summary.savingsRate !== null && summary.savingsRate >= 20}
              icon={summary.savingsRate !== null && summary.savingsRate >= 20 ? CheckCircle : Info}
              comparison={null}
            />
          </div>

          {/* Previous period comparison strip */}
          {comparison?.hasPreviousData && (
            <div className="rounded-lg border border-line bg-paper-raised/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2.5">
                vs Previous Period
              </p>
              <div className="grid gap-4 sm:grid-cols-4 text-xs font-editorial">
                <div>
                  <p className="text-ink-soft">Income</p>
                  <p className="font-figure text-ink font-semibold">{fmt(comparison.previousIncome)}</p>
                </div>
                <div>
                  <p className="text-ink-soft">Expenses</p>
                  <p className="font-figure text-ink font-semibold">{fmt(comparison.previousExpense)}</p>
                </div>
                <div>
                  <p className="text-ink-soft">Net Cash Flow</p>
                  <p className={`font-figure font-semibold ${comparison.previousNetCashFlow >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                    {fmt(comparison.previousNetCashFlow)}
                  </p>
                </div>
                <div>
                  <p className="text-ink-soft">Savings Rate</p>
                  <p className="font-figure text-ink font-semibold">
                    {comparison.previousSavingsRate !== null ? `${comparison.previousSavingsRate.toFixed(1)}%` : "N/A"}
                  </p>
                </div>
              </div>
              {summary.totalTransfers > 0 && (
                <p className="mt-2.5 text-[11px] text-ink-soft font-editorial italic">
                  Internal transfers ({fmt(summary.totalTransfers)}) are excluded from income/expense totals.
                </p>
              )}
            </div>
          )}

          {/* 3. Charts Row */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Income vs Expenses chart */}
            <Card className="lg:col-span-3 !p-5">
              <h2 className="font-screamer text-sm tracking-wide text-ink uppercase mb-4">
                {data.period === "yearly" ? "Monthly Income vs Expenses" : "Income vs Expenses"}
              </h2>
              {incomeExpenseChartData.length === 0 ? (
                <EmptyState title="No transactions in this period" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={incomeExpenseChartData} barSize={16} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtShort}
                      tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="Income" fill="var(--color-signal-pos)" radius={[3, 3, 0, 0]} name="Income" />
                    <Bar dataKey="Expenses" fill="var(--color-signal-neg)" radius={[3, 3, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Spending by Category chart */}
            <Card className="lg:col-span-2 !p-5">
              <h2 className="font-screamer text-sm tracking-wide text-ink uppercase mb-4">
                Spending by Category
              </h2>
              {categoryChartData.length === 0 ? (
                <EmptyState title="No expense data" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {categoryChartData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _, props) => [
                        `${fmt(value)} (${props.payload.pct}%)`,
                        props.payload.name,
                      ]}
                      contentStyle={{
                        backgroundColor: "var(--color-paper-raised)",
                        border: "1px solid var(--color-line)",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* 4. Category Breakdown Table */}
          {data.spendingByCategory.length > 0 && (
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="font-screamer text-sm tracking-wide text-ink uppercase">
                  Category Breakdown — {periodLabel}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" role="table">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft font-semibold">
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-right">Transactions</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-right">Share</th>
                      <th className="px-5 py-3 w-36">Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 font-editorial">
                    {data.spendingByCategory.map((cat, i) => (
                      <tr key={cat.categoryId} className="hover:bg-ink/[0.015] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                            />
                            <span className="text-ink font-medium">{cat.categoryName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-ink-soft">{cat.count}</td>
                        <td className="px-5 py-3 text-right font-figure text-ink font-semibold">{fmt(cat.amount)}</td>
                        <td className="px-5 py-3 text-right text-ink-soft">{cat.percentage.toFixed(1)}%</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 rounded-full bg-ink/10 h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(cat.percentage, 100)}%`,
                                  backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-ink-soft w-8">{cat.percentage.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 5. Monthly Trend Table (yearly report) */}
          {data.period === "yearly" && data.monthlyTrends.length > 0 && (
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="font-screamer text-sm tracking-wide text-ink uppercase">
                  Month-by-Month Trend — {year}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" role="table">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft font-semibold">
                      <th className="px-5 py-3">Month</th>
                      <th className="px-5 py-3 text-right">Income</th>
                      <th className="px-5 py-3 text-right">Expenses</th>
                      <th className="px-5 py-3 text-right">Net Cash Flow</th>
                      <th className="px-5 py-3 text-right">Savings Rate</th>
                      <th className="px-5 py-3 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 font-editorial">
                    {data.monthlyTrends.map((m, i) => (
                      <tr key={m.month} className={`hover:bg-ink/[0.015] transition-colors ${m.income === 0 && m.expense === 0 ? "opacity-40" : ""}`}>
                        <td className="px-5 py-3 text-ink font-medium">{MONTH_NAMES[m.month - 1]}</td>
                        <td className="px-5 py-3 text-right font-figure text-signal-pos">{m.income > 0 ? fmt(m.income) : "—"}</td>
                        <td className="px-5 py-3 text-right font-figure text-signal-neg">{m.expense > 0 ? fmt(m.expense) : "—"}</td>
                        <td className={`px-5 py-3 text-right font-figure font-semibold ${m.netCashFlow >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                          {m.transactionCount > 0 ? fmt(m.netCashFlow) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-figure text-ink-soft">
                          {m.savingsRate !== null ? `${m.savingsRate.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-ink-soft">{m.transactionCount || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 6. Budget Performance */}
          {data.budgets.length > 0 && (
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="font-screamer text-sm tracking-wide text-ink uppercase">
                  Budget Performance — {periodLabel}
                </h2>
              </div>
              <ul className="divide-y divide-line/40 font-editorial text-xs">
                {data.budgets.map((b) => (
                  <li key={b.budgetId} className="flex items-center gap-4 px-5 py-3 hover:bg-ink/[0.015] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-medium truncate">{b.categoryName}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 rounded-full bg-ink/10 h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              b.status === "EXCEEDED" ? "bg-signal-neg" : b.status === "WARNING" ? "bg-yellow-500" : "bg-signal-pos"
                            }`}
                            style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-ink-soft w-8">{b.percentUsed.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-figure text-ink">{fmt(b.spent)}</span>
                      <span className="text-ink-soft"> / {fmt(b.limit)}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                      b.status === "EXCEEDED" ? "bg-signal-neg/10 text-signal-neg" :
                      b.status === "WARNING" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
                      "bg-signal-pos/10 text-signal-pos"
                    }`}>
                      {b.status === "ON_TRACK" ? "On Track" : b.status === "WARNING" ? "Warning" : "Exceeded"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* 7. FinScore */}
          {data.healthScore?.isAvailable && (
            <div className="rounded-xl border border-line bg-paper-raised px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1">FinScore</p>
                <p className="font-figure text-2xl font-bold text-ink">
                  {data.healthScore.score}
                  <span className="text-sm font-normal text-ink-soft"> / 100</span>
                </p>
                <p className="text-xs text-ink-soft mt-1 font-editorial">Rating: {data.healthScore.rating} · {periodLabel}</p>
              </div>
              <div className={`rounded-full h-14 w-14 flex items-center justify-center text-sm font-figure font-bold border-2 ${
                data.healthScore.score >= 70 ? "border-signal-pos text-signal-pos" :
                data.healthScore.score >= 50 ? "border-yellow-500 text-yellow-600" :
                "border-signal-neg text-signal-neg"
              }`}>
                {data.healthScore.score}
              </div>
            </div>
          )}

          {/* 8. Transaction Ledger with filters & pagination */}
          <Card className="!p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-screamer text-sm tracking-wide text-ink uppercase">Transaction Ledger</h2>
                  <p className="text-xs text-ink-soft font-editorial mt-0.5">
                    {data.transactions.pagination.total} transactions · page {data.transactions.pagination.page} of {data.transactions.pagination.totalPages}
                  </p>
                </div>

                {/* Search & Type Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type filter pills */}
                  <div className="flex items-center rounded-lg bg-paper p-0.5 border border-line gap-0.5">
                    {["ALL", "INCOME", "EXPENSE", "TRANSFER"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeFilter(t)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-all ${
                          typeFilter === t
                            ? "bg-horizon text-[#0f1b33]"
                            : "text-ink-soft hover:text-ink hover:bg-ink/5"
                        }`}
                      >
                        {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <form onSubmit={handleSearch} className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-ink-soft" />
                    <input
                      type="search"
                      placeholder="Search transactions…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-8 pr-8 py-1.5 text-xs bg-paper border border-line rounded-md text-ink focus:outline-none focus:border-horizon w-44"
                    />
                    {searchInput && (
                      <button type="button" onClick={clearSearch} className="absolute right-2 cursor-pointer text-ink-soft hover:text-ink">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {data.transactions.items.length === 0 ? (
              <div className="p-8">
                {typeFilter === "TRANSFER" ? (
                  <div className="rounded-xl border border-line bg-paper/60 p-6 text-center max-w-lg mx-auto">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6]/10 text-[#3B82F6] mb-3">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <h4 className="font-screamer text-base text-ink mb-1">No personal transfers identified</h4>
                    <p className="text-xs text-ink-soft leading-relaxed mb-4">
                      Transfers between your own bank accounts, cards, or investment wallets are tracked separately and excluded from income, expenses, and savings rates to keep your cash flow metrics accurate. No transactions in this period have been marked as transfers yet.
                    </p>
                    <div className="text-xs text-ink-soft/90 bg-paper-raised/80 rounded-lg p-3 border border-line/60 text-left mb-4">
                      <p className="font-semibold text-ink mb-1">How to classify a personal transfer:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Go to <span className="font-semibold text-ink">Transactions</span> and edit any transaction to change its type to <span className="font-semibold text-horizon">Transfer</span>.</li>
                        <li>Link an outgoing withdrawal with an incoming deposit as a matched transfer pair.</li>
                        <li>When uploading bank statements, items with self-transfer descriptions will be recognized as transfers.</li>
                      </ul>
                    </div>
                    <a
                      href="/dashboard/transactions"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-horizon text-[#0f1b33] rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Go to Transactions Ledger <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <EmptyState
                    title="No transactions match this filter"
                    description={`There are no ${typeFilter === "ALL" ? "" : typeFilter.toLowerCase() + " "}transactions in this period${searchQuery ? ` matching "${searchQuery}"` : ""}.`}
                  />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" role="table">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft font-semibold">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-center">Type</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 font-editorial">
                    {data.transactions.items.map((tx) => {
                      const typeLabel = tx.isInternalTransfer ? "Transfer" : tx.type.charAt(0) + tx.type.slice(1).toLowerCase();
                      const typeColor = tx.isInternalTransfer
                        ? "text-[#3B82F6] bg-[#3B82F6]/10"
                        : tx.type === "INCOME"
                        ? "text-signal-pos bg-signal-pos/10"
                        : "text-signal-neg bg-signal-neg/10";
                      return (
                        <tr key={tx.id} className="hover:bg-ink/[0.015] transition-colors">
                          <td className="px-5 py-3 text-ink-soft whitespace-nowrap font-figure">
                            {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-5 py-3 text-ink max-w-[220px] truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="px-5 py-3 text-ink-soft">{tx.categoryName}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${typeColor}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className={`px-5 py-3 text-right font-figure font-semibold ${
                            tx.isInternalTransfer ? "text-[#3B82F6]" :
                            tx.type === "INCOME" ? "text-signal-pos" : "text-signal-neg"
                          }`}>
                            {tx.type === "INCOME" ? "+" : tx.isInternalTransfer ? "" : "−"}{fmt(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data.transactions.pagination.totalPages > 1 && (
              <div className="border-t border-line px-5 py-3 flex items-center justify-between gap-4">
                <span className="text-xs text-ink-soft font-editorial">
                  Showing {((data.transactions.pagination.page - 1) * data.transactions.pagination.limit) + 1}–
                  {Math.min(data.transactions.pagination.page * data.transactions.pagination.limit, data.transactions.pagination.total)} of {data.transactions.pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={data.transactions.pagination.page <= 1}
                    className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {[...Array(Math.min(data.transactions.pagination.totalPages, 7))].map((_, i) => {
                    const pg = i + 1;
                    return (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setPage(pg)}
                        className={`min-w-[28px] h-7 rounded-md text-xs font-figure cursor-pointer transition-colors ${
                          data.transactions.pagination.page === pg
                            ? "bg-horizon text-[#0f1b33] font-bold"
                            : "text-ink-soft hover:text-ink hover:bg-ink/5"
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(data.transactions.pagination.totalPages, p + 1))}
                    disabled={data.transactions.pagination.page >= data.transactions.pagination.totalPages}
                    className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Footer note */}
          <p className="text-xs text-ink-soft font-editorial italic text-center pb-4">
            {data.summary.totalTransfers > 0 && `Internal transfers (${fmt(data.summary.totalTransfers)}) excluded from income/expense totals. `}
            Report generated {new Date(data.generatedAt).toLocaleString("en-IN")} · Currency: {data.currency}
          </p>
        </div>
      )}

      {/* Empty state when no data and not loading */}
      {!loading && !data && !error && (
        <EmptyState
          title="No report data"
          description="Select a period and content type above to generate your financial report."
        />
      )}
    </div>
  );
}
