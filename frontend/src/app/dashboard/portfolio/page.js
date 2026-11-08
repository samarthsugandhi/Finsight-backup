"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, Button, ErrorState } from "@/components/ui";
import { useFinance } from "@/context/FinanceContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";

import AddAssetModal from "@/components/AddAssetModal";
import AddTransactionModal from "@/components/AddTransactionModal";
import EditAssetModal from "@/components/EditAssetModal";
import TransactionHistoryModal from "@/components/TransactionHistoryModal";
import InvestmentStatementUploader from "@/components/InvestmentStatementUploader";
import ExploreInvestmentsView from "@/components/ExploreInvestmentsView";
import FDCalculatorView from "@/components/FDCalculatorView";
import { getChartColors } from "@/lib/chartColors";
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
  Legend,
} from "recharts";
import {
  Plus,
  UploadCloud,
  TrendingUp,
  PieChart as PieIcon,
  Coins,
  Building,
  Layers,
  Search,
  X,
  Edit2,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Compass,
  Briefcase,
  Calculator,
  BarChart3,
  ArrowUpDown,
  Sliders,
  DollarSign,
  History,
  Info,
  HelpCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_TYPES = ["STOCK", "MUTUAL_FUND", "GOLD", "FIXED_DEPOSIT"];

const CATEGORY_META = {
  STOCK:         { label: "Stocks",         icon: TrendingUp, color: "text-blue-400",   bg: "bg-blue-400/10", border: "border-blue-400/30" },
  MUTUAL_FUND:   { label: "Mutual Funds",   icon: PieIcon,    color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/30" },
  GOLD:          { label: "Gold",           icon: Coins,      color: "text-amber-400",  bg: "bg-amber-400/10", border: "border-amber-400/30" },
  FIXED_DEPOSIT: { label: "Fixed Deposits", icon: Building,   color: "text-emerald-400",bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
};

const CATEGORY_TABS = [
  { id: "ALL",           label: "All Assets"    },
  { id: "STOCK",         label: "Stocks"        },
  { id: "MUTUAL_FUND",   label: "Mutual Funds"  },
  { id: "GOLD",          label: "Gold"          },
  { id: "FIXED_DEPOSIT", label: "Fixed Deposits"},
];

function fmt(n) {
  if (n === null || n === undefined) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const tooltipStyle = {
  backgroundColor: "var(--color-paper-raised)",
  borderColor: "var(--color-line)",
  borderRadius: "8px",
  color: "var(--color-ink)",
  fontSize: "12px",
};

function isSupportedType(type) {
  return SUPPORTED_TYPES.includes(type);
}

function maturityBadge(holding) {
  if (holding.type !== "FIXED_DEPOSIT") return null;
  if (holding.isMatured || (holding.daysToMaturity !== null && holding.daysToMaturity <= 0)) {
    return { label: "Matured", cls: "bg-slate-500/10 text-slate-300 border-slate-500/30", Icon: CheckCircle2 };
  }
  if (holding.daysToMaturity !== null && holding.daysToMaturity <= 30) {
    return { label: `${holding.daysToMaturity}d left`, cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", Icon: AlertCircle };
  }
  if (holding.daysToMaturity !== null) {
    return { label: `${holding.daysToMaturity}d left`, cls: "bg-blue-500/10 text-blue-400 border-blue-500/30", Icon: Clock };
  }
  return null;
}

// ─── Metric Explainer Tooltip Component ──────────────────────────────────────────

function MetricInfo({ title, explanation, example, note }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
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
        aria-label={`Learn more about ${title}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setOpen(false)}
          className="absolute z-50 left-0 bottom-full mb-2 w-72 sm:w-80 p-3.5 rounded-xl border border-line bg-paper text-ink shadow-xl text-left text-xs font-editorial animate-in fade-in zoom-in-95 duration-150 block whitespace-normal"
        >
          <span className="flex items-center justify-between pb-1.5 border-b border-line mb-2">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-horizon" />
              {title}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ink-soft hover:text-ink cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
          <span className="text-ink leading-relaxed block">{explanation}</span>
          {example && (
            <span className="mt-2 p-2 rounded-lg bg-paper-raised border border-line/60 text-[11px] text-ink-soft block">
              <strong className="text-ink font-semibold">Example: </strong>
              {example}
            </span>
          )}
          {note && (
            <span className="mt-1.5 text-[10px] text-amber-600 font-medium block">
              * {note}
            </span>
          )}
          <span className="mt-2.5 pt-2 border-t border-line/50 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("finsight:open-guide"));
              }}
              className="text-[11px] font-semibold text-horizon hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Learn more in Guide &rarr;
            </button>
          </span>
        </span>
      )}
    </span>
  );
}

// ─── 4 Summary Cards ──────────────────────────────────────────────────────────

function SummaryCards({ summary }) {
  const invested   = summary?.totalInvested ?? 0;
  const knownCurr  = summary?.totalKnownCurrent ?? null;
  const returns    = summary?.returns ?? 0;
  const unpriced   = summary?.unpricedCount ?? 0;
  const pricedInv  = summary?.pricedInvested ?? 0;

  const returnsPct = pricedInv > 0 ? ((returns / pricedInv) * 100) : null;
  const returnsPos = returns >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      {/* 1. Total Invested */}
      <div className="rounded-xl border border-line bg-paper-raised p-4 transition-all">
        <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold flex items-center">
          <span>Total Invested (Cost Basis)</span>
          <MetricInfo
            title="Total Invested (Cost Basis)"
            explanation="The actual money you paid to purchase your currently held investments. FinSight updates this with running weighted-average cost (WAVAC) whenever you record buy or sell transactions."
            example="If you bought 10 shares of a company at ₹1,000 each, your Total Invested is ₹10,000 regardless of today's market price."
          />
        </p>
        <p className="font-figure text-2xl font-bold text-ink mt-1">{fmt(invested)}</p>
        <p className="text-[11px] text-ink-soft mt-1">Total purchase cost of your current holdings</p>
      </div>

      {/* 2. Current Value */}
      <div className="rounded-xl border border-line bg-paper-raised p-4 transition-all">
        <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold flex items-center">
          <span>Current Market Value</span>
          <MetricInfo
            title="Current Market Value"
            explanation="The total market worth of your holdings based on verified current market prices. Only holdings with added market prices are counted here to prevent distorted valuations."
            example="If your 10 shares are now trading at ₹1,200 each, your Current Market Value is ₹12,000."
            note="Holdings marked 'Price not added' are tracked at cost basis until updated."
          />
        </p>
        <p className="font-figure text-2xl font-bold text-ink mt-1">
          {knownCurr !== null && knownCurr !== undefined ? fmt(knownCurr) : "—"}
        </p>
        <p className="text-[11px] text-ink-soft mt-1">
          {unpriced > 0
            ? `Priced holdings only (excludes ${unpriced} without price)`
            : "All investments have verified values"}
        </p>
      </div>

      {/* 3. Profit / Loss */}
      <div className="rounded-xl border border-line bg-paper-raised p-4 transition-all">
        <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold flex items-center">
          <span>Profit / Loss (Priced Assets)</span>
          <MetricInfo
            title="Profit / Loss (Gain / Loss)"
            explanation="The total unrealized profit or loss calculated strictly across holdings with verified current prices. Missing or unpriced assets are never treated as zero value or as losses."
            example="Current Market Value (₹12,000) minus Cost Basis (₹10,000) = ₹2,000 profit (+20%)."
          />
        </p>
        {pricedInv > 0 ? (
          <>
            <p className={`font-figure text-2xl font-bold mt-1 ${returnsPos ? "text-signal-pos" : "text-signal-neg"}`}>
              {returnsPos ? "+" : ""}{fmt(returns)}
            </p>
            <p className="text-[11px] text-ink-soft mt-1">
              {returnsPos ? "+" : ""}{returnsPct?.toFixed(1)}% on priced assets
            </p>
          </>
        ) : (
          <>
            <p className="font-figure text-2xl font-bold text-ink-soft mt-1">—</p>
            <p className="text-[11px] text-ink-soft mt-1">Price not added yet</p>
          </>
        )}
      </div>

      {/* 4. Investments Without Price */}
      <div className="rounded-xl border border-line bg-paper-raised p-4 transition-all">
        <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold flex items-center">
          <span>Investments Without Price</span>
          <MetricInfo
            title="Unpriced Holdings"
            explanation="Assets where you haven't yet entered a current market valuation. FinSight tracks them safely at their original purchase cost basis so your net worth is never artificially depressed."
            example="If you bought a mutual fund but haven't updated today's NAV, it remains tracked at cost basis until you enter the latest valuation."
          />
        </p>
        <p className="font-figure text-2xl font-bold text-ink mt-1">{unpriced}</p>
        <p className="text-[11px] text-ink-soft mt-1">
          {unpriced > 0
            ? "Add current price to calculate exact returns"
            : "All holdings fully priced"}
        </p>
      </div>
    </div>
  );
}

// ─── Category Filter Cards ────────────────────────────────────────────────────

function CategoryCards({ holdings, activeCategory, onSelectCategory }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
      {SUPPORTED_TYPES.map((type) => {
        const meta     = CATEGORY_META[type];
        const Icon     = meta.icon;
        const filtered = holdings.filter((h) => h.type === type);
        const invested = filtered.reduce((s, h) => s + (h.investedAmount ?? 0), 0);
        const knownVal = filtered
          .filter((h) => h.currentValue !== null)
          .reduce((s, h) => s + h.currentValue, 0);
        const profitLoss = filtered
          .filter((h) => h.profitLoss !== null)
          .reduce((s, h) => s + h.profitLoss, 0);
        const valuedCount = filtered.filter((h) => h.currentValue !== null).length;
        const active   = activeCategory === type;

        const hasHoldings = filtered.length > 0;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelectCategory(active ? "ALL" : type)}
            className={`text-left rounded-xl border p-4 transition-all cursor-pointer ${
              active
                ? "border-horizon bg-horizon/10 shadow-sm"
                : "border-line bg-paper-raised hover:border-horizon/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`h-4 w-4 ${meta.color}`} />
              <span className="text-[11px] font-mono text-ink-soft">
                {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs font-semibold text-ink">{meta.label}</p>
            {hasHoldings ? (
              <>
                <p className="font-figure text-sm font-bold text-ink mt-1">{fmt(invested)}</p>
                <div className="flex items-center justify-between mt-1 text-[11px] text-ink-soft">
                  <span>{valuedCount > 0 ? `Val: ${fmt(knownVal)}` : "Price not added"}</span>
                  {valuedCount > 0 && (
                    <span className={`font-figure font-medium ${profitLoss >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                      {profitLoss >= 0 ? "+" : ""}{fmt(profitLoss)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-ink-soft mt-1 italic">No holdings yet</p>
                <div className="mt-1 text-[11px] text-ink-soft opacity-0">—</div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Portfolio Analytics Component ───────────────────────────────────────────

function PortfolioAnalytics({ holdings, chartColors }) {
  const valuedHoldings = useMemo(() => {
    return holdings.filter((h) => isSupportedType(h.type) && h.currentValue !== null && h.currentValue > 0);
  }, [holdings]);

  const allocationData = useMemo(() => {
    if (valuedHoldings.length === 0) return [];
    const totals = {};
    for (const h of valuedHoldings) {
      totals[h.type] = (totals[h.type] || 0) + h.currentValue;
    }
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
    if (grandTotal <= 0) return [];

    return Object.entries(totals).map(([type, value], idx) => ({
      name: CATEGORY_META[type]?.label || type,
      type,
      value,
      percentage: (value / grandTotal) * 100,
      color: chartColors[idx % chartColors.length],
    }));
  }, [valuedHoldings, chartColors]);

  const categoryComparison = useMemo(() => {
    return SUPPORTED_TYPES.map((type) => {
      const items = holdings.filter((h) => h.type === type);
      const invested = items.reduce((s, h) => s + (h.investedAmount ?? 0), 0);
      const current = items
        .filter((h) => h.currentValue !== null)
        .reduce((s, h) => s + h.currentValue, 0);
      return {
        category: CATEGORY_META[type]?.label || type,
        invested,
        current,
      };
    }).filter((c) => c.invested > 0 || c.current > 0);
  }, [holdings]);

  const unpricedCount = holdings.filter((h) => isSupportedType(h.type) && h.currentValue === null).length;

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-screamer text-lg uppercase tracking-wide text-ink flex items-center">
                <span>Asset Allocation</span>
                <MetricInfo
                  title="Asset Allocation"
                  explanation="How your total investment capital is distributed across asset classes (Stocks, Mutual Funds, Fixed Deposits, Gold). Proper diversification protects against market downturns."
                  example="A 60% Equity / 30% Fixed Deposit / 10% Gold mix balances long-term inflation-beating growth with stability."
                />
              </h3>
              <p className="text-xs text-ink-soft">By known current market valuation</p>
            </div>
            <PieIcon className="h-5 w-5 text-horizon" />
          </div>

          {allocationData.length === 0 ? (
            <div className="text-center py-10 text-ink-soft text-xs">
              No valued holdings to display allocation chart. Add valuations to view mix.
            </div>
          ) : (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {allocationData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [fmt(val), "Current Value"]}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-line">
                {allocationData.map((item) => (
                  <div key={item.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-ink font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-figure">
                      <span className="text-ink font-semibold">{fmt(item.value)}</span>
                      <span className="text-ink-soft w-12 text-right">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {unpricedCount > 0 && (
                <p className="mt-3 text-[11px] text-ink-soft border-t border-line/40 pt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>{unpricedCount} asset(s) without current price are excluded from this chart.</span>
                </p>
              )}
            </>
          )}
        </Card>

        {/* Invested vs Current Comparison Bar Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-screamer text-lg uppercase tracking-wide text-ink flex items-center">
                <span>Invested vs. Current Value</span>
                <MetricInfo
                  title="Invested vs. Current Value"
                  explanation="Visual comparison comparing the original capital you deployed in each category versus its current verified market valuation."
                />
              </h3>
              <p className="text-xs text-ink-soft">Category-wise capital comparison</p>
            </div>
            <BarChart3 className="h-5 w-5 text-horizon" />
          </div>

          {categoryComparison.length === 0 ? (
            <div className="text-center py-10 text-ink-soft text-xs">
              No category data available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" opacity={0.6} />
                  <XAxis dataKey="category" stroke="var(--color-ink-soft)" fontSize={11} />
                  <YAxis stroke="var(--color-ink-soft)" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    formatter={(val) => [fmt(val)]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="invested" name="Invested Basis" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="current" name="Current Value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* P&L Breakdown Table by Asset */}
      <Card className="p-6">
        <h3 className="font-screamer text-lg uppercase tracking-wide text-ink mb-1 flex items-center">
          <span>Investment Performance</span>
          <MetricInfo
            title="Investment Performance"
            explanation="Detailed holding-by-holding ledger of every asset you own, detailing purchase basis, current valuation, unrealized gain/loss, and percentage return."
          />
        </h3>
        <p className="text-xs text-ink-soft mb-4">
          Detailed performance breakdown showing invested basis, current valuation, and percentage return per holding.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-editorial">
            <thead>
              <tr className="border-b border-line text-ink-soft uppercase tracking-wider text-[10px]">
                <th className="text-left py-2.5 px-3">Asset</th>
                <th className="text-left py-2.5 px-3">Category</th>
                <th className="text-right py-2.5 px-3">
                  <span className="inline-flex items-center justify-end">
                    <span>Invested Basis</span>
                    <MetricInfo
                      title="Weighted Average Cost Basis (WAVAC)"
                      explanation="The total amount paid for your current holding calculated using running weighted average cost. When you sell units, this cost basis proportionally decreases without distorting past performance."
                      example="Buying 10 units at ₹100 and 10 units at ₹200 gives an average cost of ₹150 per unit."
                    />
                  </span>
                </th>
                <th className="text-right py-2.5 px-3">
                  <span className="inline-flex items-center justify-end">
                    <span>Current Value</span>
                    <MetricInfo
                      title="Current Market Value"
                      explanation="Latest verified valuation (unit quantity × current market price or NAV)."
                    />
                  </span>
                </th>
                <th className="text-right py-2.5 px-3">
                  <span className="inline-flex items-center justify-end">
                    <span>Unrealized P&L</span>
                    <MetricInfo
                      title="Unrealized Profit & Loss"
                      explanation="Current Market Value minus Invested Basis. It becomes a realized gain or loss only after you actually sell the asset."
                    />
                  </span>
                </th>
                <th className="text-right py-2.5 px-3">
                  <span className="inline-flex items-center justify-end">
                    <span>Return %</span>
                    <MetricInfo
                      title="Return Percentage"
                      explanation="The percentage gain or loss generated on your invested basis since purchase."
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {holdings.map((h) => {
                const hasVal = h.currentValue !== null;
                const pnl = h.profitLoss;
                const pnlPos = pnl !== null && pnl >= 0;

                return (
                  <tr key={h.id} className="hover:bg-paper-raised/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-ink">
                      {h.name}
                      {h.symbol && <span className="ml-1.5 text-[10px] text-ink-soft font-mono">({h.symbol})</span>}
                    </td>
                    <td className="py-2.5 px-3 text-ink-soft">
                      {CATEGORY_META[h.type]?.label || h.type}
                    </td>
                    <td className="py-2.5 px-3 text-right font-figure font-semibold text-ink">
                      {fmt(h.investedAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-figure">
                      {hasVal ? fmt(h.currentValue) : <span className="text-ink-soft italic">Price not added</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-figure font-semibold">
                      {pnl !== null ? (
                        <span className={pnlPos ? "text-signal-pos" : "text-signal-neg"}>
                          {pnlPos ? "+" : ""}{fmt(pnl)}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-figure font-bold">
                      {h.returnPct !== null ? (
                        <span className={pnlPos ? "text-signal-pos" : "text-signal-neg"}>
                          {pnlPos ? "+" : ""}{h.returnPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Edit Valuation Modal ─────────────────────────────────────────────────────

function EditValuationModal({ holding, onClose, onUpdate }) {
  const [val, setVal]         = useState(holding.currentValue ?? "");
  const [submitting, setSub]  = useState(false);
  const [err, setErr]         = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const numVal = Number(val);
    if (!val || numVal < 0) { setErr("Please enter a valid amount."); return; }
    setSub(true);
    try {
      await onUpdate(holding.id, {
        currentValue: numVal,
        price: holding.quantity && holding.quantity > 0 ? numVal / holding.quantity : numVal,
      });
      onClose();
    } catch (ex) {
      setErr(ex.message || "Failed to update.");
    } finally {
      setSub(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-editorial">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-screamer text-lg uppercase tracking-wide text-ink">
            Update Valuation
          </h3>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-ink-soft mb-4">
          Enter the latest verified value for <strong className="text-ink">{holding.name}</strong>.
          Use your statement or brokerage app — never guess.
        </p>
        {err && <p className="text-xs text-signal-neg mb-3">{err}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-val" className="block text-xs font-medium text-ink-soft mb-1">
              Current Market Value (₹) *
            </label>
            <input
              id="edit-val"
              type="number"
              step="0.01"
              min="0"
              required
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
              placeholder="e.g. 75000"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-line">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "Saving…" : "Save Valuation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ holding, onClose, onConfirm }) {
  const [submitting, setSub] = useState(false);

  async function handleDelete() {
    setSub(true);
    try { await onConfirm(holding.id); onClose(); }
    catch { setSub(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-editorial">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper shadow-2xl p-6">
        <h3 className="font-screamer text-lg uppercase tracking-wide text-ink mb-2">
          Delete Investment
        </h3>
        <p className="text-sm text-ink-soft mb-6">
          Are you sure you want to delete <strong className="text-ink">{holding.name}</strong>?
          This will permanently remove all associated transactions and realized gains records.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-signal-neg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Statement Modal ──────────────────────────────────────────────────────────

function StatementModal({ onClose, onSuccess }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-editorial">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-paper-raised">
          <div>
            <h2 className="font-screamer text-xl uppercase tracking-wide text-ink">
              Import Investment Statement
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Supported: Zerodha, Groww, CAMS, Angel One CSV / PDF
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <InvestmentStatementUploader onProcessed={onSuccess} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Asset Table ─────────────────────────────────────────────────────────

function AssetTable({
  holdings,
  onEditValuation,
  onEditDetails,
  onAddTransaction,
  onViewHistory,
  onDelete,
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (holdings.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-line overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-editorial">
          <thead className="bg-paper-raised border-b border-line">
            <tr className="text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="text-left px-4 py-3">Asset</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
              <th className="text-right px-4 py-3">
                <span className="inline-flex items-center justify-end">
                  <span>Invested</span>
                  <MetricInfo
                    title="Invested (Cost Basis)"
                    explanation="The exact purchase cost of this holding based on your recorded transactions and weighted average cost."
                  />
                </span>
              </th>
              <th className="text-right px-4 py-3">
                <span className="inline-flex items-center justify-end">
                  <span>Current Value</span>
                  <MetricInfo
                    title="Current Market Value"
                    explanation="What this holding is worth today based on the latest verified market price or NAV."
                  />
                </span>
              </th>
              <th className="text-right px-4 py-3 hidden md:table-cell">
                <span className="inline-flex items-center justify-end">
                  <span>Gain / Loss</span>
                  <MetricInfo
                    title="Gain / Loss"
                    explanation="Unrealized profit or loss (Current Value minus Invested Basis). Unpriced holdings show '—'."
                  />
                </span>
              </th>
              <th className="text-right px-4 py-3 hidden lg:table-cell">Last Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {holdings.map((h) => {
              const meta    = CATEGORY_META[h.type] || { label: h.type, Icon: Layers, color: "" };
              const Icon    = meta.icon || Layers;
              const hasVal  = h.currentValue !== null;
              const profit  = h.profitLoss;
              const profPos = profit !== null && profit >= 0;
              const badge   = maturityBadge(h);
              const isExp   = expandedId === h.id;
              const isFD    = h.type === "FIXED_DEPOSIT";

              return (
                <React.Fragment key={h.id}>
                  <tr
                    className="hover:bg-paper-raised/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExp ? null : h.id)}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChevronRight
                          className={`h-3.5 w-3.5 text-ink-soft shrink-0 transition-transform ${isExp ? "rotate-90" : ""}`}
                        />
                        <div>
                          <p className="font-medium text-ink text-sm">{h.name}</p>
                          {badge && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold border ${badge.cls} mt-0.5`}>
                              <badge.Icon className="h-2.5 w-2.5" />{badge.label}
                            </span>
                          )}
                          {h.symbol && (
                            <p className="text-[10px] text-ink-soft font-mono">{h.symbol}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        <span className="text-xs text-ink-soft">{meta.label}</span>
                      </div>
                    </td>

                    {/* Invested */}
                    <td className="px-4 py-3 text-right font-figure font-semibold text-ink">
                      {fmt(h.investedAmount)}
                    </td>

                    {/* Current Value */}
                    <td className="px-4 py-3 text-right font-figure">
                      {hasVal ? (
                        <span className="font-semibold text-ink">{fmt(h.currentValue)}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-paper-raised text-ink-soft italic border border-line">
                          Price not added
                        </span>
                      )}
                    </td>

                    {/* Gain / Loss */}
                    <td className="px-4 py-3 text-right font-figure hidden md:table-cell">
                      {profit !== null ? (
                        <span className={`font-semibold ${profPos ? "text-signal-pos" : "text-signal-neg"}`}>
                          {profPos ? "+" : ""}{fmt(profit)}
                          {h.returnPct !== null && (
                            <span className="ml-1 text-[10px] opacity-70">
                              ({profPos ? "+" : ""}{h.returnPct.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-ink-soft text-xs">—</span>
                      )}
                    </td>

                    {/* Last Updated */}
                    <td className="px-4 py-3 text-right text-xs text-ink-soft hidden lg:table-cell">
                      {h.valuationDate
                        ? new Date(h.valuationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* BUY / SELL Action (for tradeables) */}
                        {!isFD && (
                          <button
                            type="button"
                            title="Add BUY or SELL transaction"
                            onClick={() => onAddTransaction(h)}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-horizon/10 text-horizon hover:bg-horizon/20 border border-horizon/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <ArrowUpDown className="h-3 w-3" />
                            <span>Trade</span>
                          </button>
                        )}

                        {/* Update Valuation */}
                        <button
                          type="button"
                          title="Update current price valuation"
                          onClick={() => onEditValuation(h)}
                          className="p-1.5 rounded text-ink-soft hover:text-horizon hover:bg-horizon/10 transition-colors cursor-pointer"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit details */}
                        <button
                          type="button"
                          title="Edit asset details"
                          onClick={() => onEditDetails(h)}
                          className="p-1.5 rounded text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Transaction History (for tradeables) */}
                        {!isFD && (
                          <button
                            type="button"
                            title="View transaction history"
                            onClick={() => onViewHistory(h)}
                            className="p-1.5 rounded text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          title="Delete holding"
                          onClick={() => onDelete(h)}
                          className="p-1.5 rounded text-ink-soft hover:text-signal-neg hover:bg-signal-neg/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExp && (
                    <tr className="bg-paper-raised/40">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          {h.quantity !== null && (
                            <div>
                              <p className="text-ink-soft uppercase tracking-wider text-[10px]">
                                {h.type === "GOLD" ? "Weight (g)" : "Quantity / Units"}
                              </p>
                              <p className="font-figure font-semibold text-ink mt-0.5">{h.quantity}</p>
                            </div>
                          )}
                          {h.avgBuyPrice !== null && (
                            <div>
                              <p className="text-ink-soft uppercase tracking-wider text-[10px] flex items-center">
                                <span>Weighted Avg Buy Price</span>
                                <MetricInfo
                                  title="Weighted Average Cost (WAVAC)"
                                  explanation="The running average purchase price of your units across all buy transactions. Partial sales preserve this average cost."
                                  example="Buying 10 units at ₹100 and 10 units at ₹200 yields a WAVAC of ₹150 per unit."
                                />
                              </p>
                              <p className="font-figure font-semibold text-ink mt-0.5">{fmt(h.avgBuyPrice)}</p>
                            </div>
                          )}
                          {h.type === "MUTUAL_FUND" && h.quantity && h.quantity > 0 && h.currentValue && (
                            <div>
                              <p className="text-ink-soft uppercase tracking-wider text-[10px] flex items-center">
                                <span>Unit NAV</span>
                                <MetricInfo
                                  title="Net Asset Value (NAV)"
                                  explanation="The per-unit market value of the mutual fund scheme, updated each business day."
                                  example="If a fund NAV is ₹50 and you invest ₹5,000, you are allotted 100 units."
                                />
                              </p>
                              <p className="font-figure font-semibold text-ink mt-0.5">
                                {fmt(h.currentValue / h.quantity)}
                              </p>
                            </div>
                          )}
                          {isFD && h.interestRate !== null && (
                            <div>
                              <p className="text-ink-soft uppercase tracking-wider text-[10px] flex items-center">
                                <span>Interest Rate (p.a.)</span>
                                <MetricInfo
                                  title="Annual Return (% p.a.)"
                                  explanation="The annualized rate of interest accrued per year. Compounded across your deposit tenor to compute the final maturity amount."
                                  example="A 7% p.a. Fixed Deposit yields ₹70 for every ₹1,000 held for one full year."
                                />
                              </p>
                              <p className="font-figure font-semibold text-ink mt-0.5">{h.interestRate}% p.a.</p>
                            </div>
                          )}
                          <div>
                            <p className="text-ink-soft uppercase tracking-wider text-[10px] flex items-center">
                              <span>Liquidity</span>
                              <MetricInfo
                                title="Liquidity"
                                explanation="How quickly and easily you can convert this investment into cash in your bank account without severe loss."
                                example="Liquid funds and stocks settle in 1–2 days; FDs can be closed prematurely online with a small interest penalty."
                              />
                            </p>
                            <p className="font-medium text-ink mt-0.5">
                              {isFD
                                ? "Premature close online"
                                : h.type === "MUTUAL_FUND"
                                ? "T+2 business days"
                                : h.type === "STOCK"
                                ? "T+1 exchange settlement"
                                : "Liquid during market hours"}
                            </p>
                          </div>
                          {isFD && h.maturityDate && (
                            <div>
                              <p className="text-ink-soft uppercase tracking-wider text-[10px]">Maturity Date</p>
                              <p className="font-semibold text-ink mt-0.5">
                                {new Date(h.maturityDate).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          )}
                          {isFD && h.maturityAmount !== null && (
                            <div>
                              <p className="text-ink-soft uppercase tracking-wider text-[10px]">Maturity Amount</p>
                              <p className="font-figure font-semibold text-ink mt-0.5">{fmt(h.maturityAmount)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-ink-soft uppercase tracking-wider text-[10px]">Valuation Source</p>
                            <p className="font-medium text-ink mt-0.5">
                              {{
                                MANUAL: "Manual entry",
                                STATEMENT: "Statement import",
                                FIXED_DEPOSIT: "Accrual calculation",
                                UNAVAILABLE: "Awaiting update",
                              }[h.priceSource] || h.valuationSource || "Manual"}
                            </p>
                          </div>
                          {h.notes && (
                            <div className="col-span-2">
                              <p className="text-ink-soft uppercase tracking-wider text-[10px]">Notes</p>
                              <p className="text-ink mt-0.5 italic">"{h.notes}"</p>
                            </div>
                          )}
                        </div>

                        {/* Quick Action Footer in expanded row */}
                        {!isFD && (
                          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                            <span className="text-[11px] text-ink-soft">
                              Running Weighted Average Cost accounting applies to all BUY and SELL transactions.
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => onViewHistory(h)}
                                className="px-3 py-1 rounded-lg text-xs font-medium border border-line bg-paper text-ink hover:text-horizon cursor-pointer transition-colors"
                              >
                                View History
                              </button>
                              <button
                                type="button"
                                onClick={() => onAddTransaction(h)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-horizon text-[#0f1b33] cursor-pointer"
                              >
                                Record Transaction
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const {
    portfolio,
    loading,
    error,
    refetch,
    addHolding,
    updateHolding,
    updateManualHolding,
    addPortfolioTransaction,
    deleteHolding,
  } = useFinance();

  const { theme } = useTheme();
  const chartColors = useMemo(() => getChartColors(theme), [theme]);

  // Main Section Navigation: "PORTFOLIO" vs "EXPLORE"
  const [activeMainTab, setActiveMainTab] = useState("PORTFOLIO"); // "PORTFOLIO" | "EXPLORE"
  const [portfolioSubView, setPortfolioSubView] = useState("HOLDINGS"); // "HOLDINGS" | "ANALYTICS"

  // Filter & Search
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery]       = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalCategory, setAddModalCategory] = useState(null);
  const [isUploadOpen, setIsUploadOpen]     = useState(false);
  const [editValuationHolding, setEditValuationHolding] = useState(null);
  const [editDetailsHolding, setEditDetailsHolding]     = useState(null);
  const [transactionHolding, setTransactionHolding]     = useState(null);
  const [historyHolding, setHistoryHolding]             = useState(null);
  const [deleteTarget, setDeleteTarget]                 = useState(null);

  // Supported holdings filter
  const supportedHoldings = useMemo(() => {
    if (!portfolio?.holdings) return [];
    return portfolio.holdings.filter((h) => isSupportedType(h.type));
  }, [portfolio?.holdings]);

  const filteredHoldings = useMemo(() => {
    let list = supportedHoldings;

    if (activeCategory !== "ALL") {
      list = list.filter((h) => h.type === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.name?.toLowerCase().includes(q) ||
          h.symbol?.toLowerCase().includes(q) ||
          h.notes?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [supportedHoldings, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: supportedHoldings.length };
    for (const h of supportedHoldings) {
      counts[h.type] = (counts[h.type] || 0) + 1;
    }
    return counts;
  }, [supportedHoldings]);

  // Verified summary
  const summary = useMemo(() => {
    if (!portfolio?.summary) return null;
    const sup = supportedHoldings;
    const totalInvested = sup.reduce((s, h) => s + (h.investedAmount ?? 0), 0);
    const valued = sup.filter((h) => h.currentValue !== null);
    const totalKnownCurrent = valued.reduce((s, h) => s + h.currentValue, 0);
    const pricedInvested = valued.reduce((s, h) => s + (h.investedAmount ?? 0), 0);
    const returns = valued.reduce((s, h) => s + (h.profitLoss ?? 0), 0);
    const unpricedCount = sup.filter((h) => h.currentValue === null).length;
    return { totalInvested, totalKnownCurrent, pricedInvested, returns, unpricedCount };
  }, [supportedHoldings, portfolio?.summary]);

  async function handleDelete(holdingId) {
    await deleteHolding(holdingId);
    await refetch?.();
  }

  function handleOpenAddAssetWithCategory(category) {
    setAddModalCategory(category);
    setIsAddModalOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 font-editorial">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-line">
        <div>
          <h1 className="font-screamer text-3xl sm:text-4xl uppercase tracking-wide text-ink">
            Investments
          </h1>
          <p className="text-sm text-ink-soft mt-1 max-w-xl">
            Track Stocks, Mutual Funds, Gold, and Fixed Deposits, or plan an educational asset allocation in the Investment Planner.
          </p>
        </div>

        {activeMainTab === "PORTFOLIO" && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Import Statement */}
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-line bg-paper-raised px-4 py-2 text-xs font-semibold text-ink hover:border-horizon/60 hover:text-horizon transition-colors font-screamer tracking-wider uppercase"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Import Investment Statements</span>
            </button>

            {/* Add Asset */}
            <Button
              variant="accent"
              onClick={() => {
                setAddModalCategory(null);
                setIsAddModalOpen(true);
              }}
              className="cursor-pointer text-xs py-2 px-4 inline-flex items-center gap-2 font-screamer tracking-wider uppercase"
            >
              <Plus className="h-4 w-4" />
              <span>Add Asset</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Top Main Navigation: 40:40:20 Layout (My Portfolio, Investment Planner, FD Calculator) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        {/* Card 1: My Portfolio (40% on desktop) */}
        <button
          type="button"
          onClick={() => setActiveMainTab("PORTFOLIO")}
          className={`sm:col-span-1 lg:col-span-2 group relative text-left p-5 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[125px] sm:min-h-[135px] ${
            activeMainTab === "PORTFOLIO"
              ? "bg-gradient-to-br from-[#E5A93C] via-[#deb04c] to-[#c78d22] text-[#0f1b33] border-[#b87d15] shadow-lg shadow-amber-900/10 ring-2 ring-horizon/40 dark:from-[#d6ff62] dark:via-[#c8f249] dark:to-[#b5e32b] dark:text-[#080b12] dark:border-[#d6ff62] dark:shadow-lime-950/30"
              : "bg-paper-raised text-ink border-line hover:border-horizon/60 hover:bg-paper-raised/80 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl transition-colors ${
                  activeMainTab === "PORTFOLIO"
                    ? "bg-[#0f1b33] text-horizon dark:bg-[#080b12] dark:text-[#d6ff62]"
                    : "bg-horizon/10 text-horizon group-hover:bg-horizon/20"
                }`}
              >
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2
                  className={`font-screamer text-xl sm:text-2xl uppercase tracking-wide leading-tight ${
                    activeMainTab === "PORTFOLIO" ? "text-[#0f1b33] dark:text-[#080b12]" : "text-ink"
                  }`}
                >
                  My Portfolio
                </h2>
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                    activeMainTab === "PORTFOLIO"
                      ? "bg-[#0f1b33]/15 text-[#0f1b33] dark:bg-[#080b12]/15 dark:text-[#080b12]"
                      : "bg-ink/5 text-ink-soft"
                  }`}
                >
                  {supportedHoldings.length} {supportedHoldings.length === 1 ? "Holding" : "Holdings"}
                </span>
              </div>
            </div>
            <div
              className={`h-3 w-3 rounded-full transition-all ${
                activeMainTab === "PORTFOLIO"
                  ? "bg-[#0f1b33] ring-4 ring-[#0f1b33]/20 dark:bg-[#080b12] dark:ring-[#080b12]/20"
                  : "border border-line bg-transparent group-hover:border-horizon"
              }`}
            />
          </div>
          <p
            className={`text-xs sm:text-sm mt-3 font-editorial leading-relaxed ${
              activeMainTab === "PORTFOLIO" ? "text-[#0f1b33]/90 dark:text-[#080b12]/90 font-medium" : "text-ink-soft"
            }`}
          >
            Track your existing investments.
          </p>
        </button>

        {/* Card 2: Investment Planner (40% on desktop) */}
        <button
          type="button"
          onClick={() => setActiveMainTab("EXPLORE")}
          className={`sm:col-span-1 lg:col-span-2 group relative text-left p-5 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[125px] sm:min-h-[135px] ${
            activeMainTab === "EXPLORE"
              ? "bg-gradient-to-br from-[#E5A93C] via-[#deb04c] to-[#c78d22] text-[#0f1b33] border-[#b87d15] shadow-lg shadow-amber-900/10 ring-2 ring-horizon/40 dark:from-[#d6ff62] dark:via-[#c8f249] dark:to-[#b5e32b] dark:text-[#080b12] dark:border-[#d6ff62] dark:shadow-lime-950/30"
              : "bg-paper-raised text-ink border-line hover:border-horizon/60 hover:bg-paper-raised/80 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl transition-colors ${
                  activeMainTab === "EXPLORE"
                    ? "bg-[#0f1b33] text-horizon dark:bg-[#080b12] dark:text-[#d6ff62]"
                    : "bg-horizon/10 text-horizon group-hover:bg-horizon/20"
                }`}
              >
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h2
                  className={`font-screamer text-xl sm:text-2xl uppercase tracking-wide leading-tight ${
                    activeMainTab === "EXPLORE" ? "text-[#0f1b33] dark:text-[#080b12]" : "text-ink"
                  }`}
                >
                  Investment Planner
                </h2>
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                    activeMainTab === "EXPLORE"
                      ? "bg-[#0f1b33]/15 text-[#0f1b33] dark:bg-[#080b12]/15 dark:text-[#080b12]"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  Beginner Friendly
                </span>
              </div>
            </div>
            <div
              className={`h-3 w-3 rounded-full transition-all ${
                activeMainTab === "EXPLORE"
                  ? "bg-[#0f1b33] ring-4 ring-[#0f1b33]/20 dark:bg-[#080b12] dark:ring-[#080b12]/20"
                  : "border border-line bg-transparent group-hover:border-horizon"
              }`}
            />
          </div>
          <p
            className={`text-xs sm:text-sm mt-3 font-editorial leading-relaxed ${
              activeMainTab === "EXPLORE" ? "text-[#0f1b33]/90 dark:text-[#080b12]/90 font-medium" : "text-ink-soft"
            }`}
          >
            Explore investment options based on your preferences.
          </p>
        </button>

        {/* Card 3: FD Calculator (20% on desktop) */}
        <button
          type="button"
          onClick={() => setActiveMainTab("FD_CALCULATOR")}
          className={`sm:col-span-2 lg:col-span-1 group relative text-left p-5 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[125px] sm:min-h-[135px] ${
            activeMainTab === "FD_CALCULATOR"
              ? "bg-gradient-to-br from-[#E5A93C] via-[#deb04c] to-[#c78d22] text-[#0f1b33] border-[#b87d15] shadow-lg shadow-amber-900/10 ring-2 ring-horizon/40 dark:from-[#d6ff62] dark:via-[#c8f249] dark:to-[#b5e32b] dark:text-[#080b12] dark:border-[#d6ff62] dark:shadow-lime-950/30"
              : "bg-paper-raised text-ink border-line hover:border-horizon/60 hover:bg-paper-raised/80 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl transition-colors ${
                  activeMainTab === "FD_CALCULATOR"
                    ? "bg-[#0f1b33] text-horizon dark:bg-[#080b12] dark:text-[#d6ff62]"
                    : "bg-horizon/10 text-horizon group-hover:bg-horizon/20"
                }`}
              >
                <Calculator className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2
                  className={`font-screamer text-lg sm:text-xl uppercase tracking-wide leading-tight ${
                    activeMainTab === "FD_CALCULATOR" ? "text-[#0f1b33] dark:text-[#080b12]" : "text-ink"
                  }`}
                >
                  FD Calculator
                </h2>
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${
                    activeMainTab === "FD_CALCULATOR"
                      ? "bg-[#0f1b33]/15 text-[#0f1b33] dark:bg-[#080b12]/15 dark:text-[#080b12]"
                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  }`}
                >
                  Interest Tool
                </span>
              </div>
            </div>
            <div
              className={`h-3 w-3 rounded-full transition-all ${
                activeMainTab === "FD_CALCULATOR"
                  ? "bg-[#0f1b33] ring-4 ring-[#0f1b33]/20 dark:bg-[#080b12] dark:ring-[#080b12]/20"
                  : "border border-line bg-transparent group-hover:border-horizon"
              }`}
            />
          </div>
          <p
            className={`text-xs mt-3 font-editorial leading-relaxed ${
              activeMainTab === "FD_CALCULATOR" ? "text-[#0f1b33]/90 dark:text-[#080b12]/90 font-medium" : "text-ink-soft"
            }`}
          >
            Estimate fixed deposit returns.
          </p>
        </button>
      </div>

      <ErrorState message={error} onRetry={refetch} />

      {loading ? (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-ink/5" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-xl bg-ink/5 mt-4" />
        </div>
      ) : activeMainTab === "FD_CALCULATOR" ? (
        /* ── SECTION C: FD CALCULATOR ── */
        <div className="mt-6">
          <FDCalculatorView />
        </div>
      ) : activeMainTab === "EXPLORE" ? (
        /* ── SECTION B: INVESTMENT PLANNER ── */
        <div className="mt-6">
          <ExploreInvestmentsView />
        </div>
      ) : (
        /* ── SECTION A: MY PORTFOLIO ── */
        <>
          {/* Summary Cards */}
          <SummaryCards summary={summary} />

          {/* Unpriced assets alert notification */}
          {summary?.unpricedCount > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-ink-soft leading-relaxed">
                <strong className="text-ink font-semibold">
                  {summary.unpricedCount} investment{summary.unpricedCount !== 1 ? "s" : ""} without current market price:{" "}
                </strong>
                Displayed portfolio returns and current value cover only assets with verified valuations. Unpriced assets are tracked at cost basis until updated.
              </div>
            </div>
          )}

          {/* Sub-view switcher: My Holdings vs Analytics */}
          <div className="flex items-center justify-between mt-6 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPortfolioSubView("HOLDINGS")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  portfolioSubView === "HOLDINGS"
                    ? "bg-paper-raised text-ink border border-line"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>My Holdings</span>
              </button>
              <button
                type="button"
                onClick={() => setPortfolioSubView("ANALYTICS")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  portfolioSubView === "ANALYTICS"
                    ? "bg-paper-raised text-ink border border-line"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <PieIcon className="h-3.5 w-3.5" />
                <span>Portfolio Analytics</span>
              </button>
            </div>
          </div>

          {portfolioSubView === "ANALYTICS" ? (
            /* Analytics View */
            <PortfolioAnalytics holdings={supportedHoldings} chartColors={chartColors} />
          ) : (
            /* Holdings View */
            <>
              {/* Category Cards */}
              <CategoryCards
                holdings={supportedHoldings}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
              />

              {/* Asset List Section */}
              <div className="mt-8">
                {/* Filter bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                  {/* Category tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {CATEGORY_TABS.map(({ id, label }) => {
                      const count  = categoryCounts[id] ?? 0;
                      const active = activeCategory === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActiveCategory(id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? "bg-horizon text-[#0f1b33] font-semibold"
                              : "bg-paper-raised text-ink-soft hover:text-ink hover:bg-paper"
                          }`}
                        >
                          <span>{label}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            active ? "bg-black/20 text-[#0f1b33]" : "bg-paper border border-line text-ink-soft"
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-60">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-ink-soft" />
                    <input
                      type="text"
                      placeholder="Search investments…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 bg-paper-raised border border-line rounded-lg text-xs text-ink focus:border-horizon outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2 text-ink-soft hover:text-ink cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Table or Empty state */}
                {filteredHoldings.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
                    <Layers className="h-10 w-10 text-ink-soft/30 mx-auto mb-3" />
                    <p className="font-screamer text-xl uppercase tracking-wide text-ink">
                      {searchQuery ? "No matching investments" : "No investments recorded yet"}
                    </p>
                    <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? `No assets matched "${searchQuery}". Try a different keyword.`
                        : "Add your first asset or explore risk-based recommendations."}
                    </p>
                    <div className="flex justify-center gap-3 mt-4">
                      <Button
                        variant="accent"
                        onClick={() => setIsAddModalOpen(true)}
                        className="cursor-pointer text-xs inline-flex items-center gap-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Asset
                      </Button>
                      <button
                        type="button"
                        onClick={() => setActiveMainTab("EXPLORE")}
                        className="px-4 py-2 rounded-lg border border-line bg-paper-raised text-xs font-semibold text-ink hover:border-horizon/60 transition-colors cursor-pointer"
                      >
                        Explore Recommendations
                      </button>
                    </div>
                  </div>
                ) : (
                  <AssetTable
                    holdings={filteredHoldings}
                    onEditValuation={setEditValuationHolding}
                    onEditDetails={setEditDetailsHolding}
                    onAddTransaction={setTransactionHolding}
                    onViewHistory={setHistoryHolding}
                    onDelete={setDeleteTarget}
                  />
                )}

                {/* Statement import notice */}
                <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper-raised/30 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-paper-raised">
                        <UploadCloud className="h-5 w-5 text-horizon" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink">Import Investment Statements</p>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-paper border border-line text-ink-soft">
                            Beta
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft mt-1 max-w-md">
                          Import holdings and tradebook records directly from Zerodha, Groww, CAMS CAS, Angel One, and Upstox statements.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(true)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink hover:border-horizon/60 hover:text-horizon transition-colors cursor-pointer font-screamer tracking-wider uppercase"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Upload Statement
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Modals ── */}

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <AddAssetModal
          isOpen={isAddModalOpen}
          defaultCategory={addModalCategory}
          onClose={() => {
            setIsAddModalOpen(false);
            setAddModalCategory(null);
          }}
          onAddHolding={async (payload) => {
            const ok = await addHolding(payload);
            if (ok) await refetch?.();
            return ok;
          }}
        />
      )}

      {/* Record BUY / SELL Transaction Modal */}
      {transactionHolding && (
        <AddTransactionModal
          holding={transactionHolding}
          onClose={() => setTransactionHolding(null)}
          onAddTransaction={async (holdingId, payload) => {
            const ok = await addPortfolioTransaction(holdingId, payload);
            if (ok) await refetch?.();
            return ok;
          }}
        />
      )}

      {/* Edit Details Modal */}
      {editDetailsHolding && (
        <EditAssetModal
          holding={editDetailsHolding}
          onClose={() => setEditDetailsHolding(null)}
          onUpdate={async (holdingId, payload) => {
            const ok = await updateHolding(holdingId, payload);
            if (ok) await refetch?.();
            return ok;
          }}
        />
      )}

      {/* Edit Valuation Modal */}
      {editValuationHolding && (
        <EditValuationModal
          holding={editValuationHolding}
          onClose={() => setEditValuationHolding(null)}
          onUpdate={async (id, payload) => {
            await updateManualHolding(id, payload);
            await refetch?.();
          }}
        />
      )}

      {/* Transaction History Modal */}
      {historyHolding && (
        <TransactionHistoryModal
          holding={historyHolding}
          onClose={() => setHistoryHolding(null)}
          onAddTxClick={(holding) => setTransactionHolding(holding)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          holding={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Statement Upload Modal */}
      {isUploadOpen && (
        <StatementModal
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => { refetch?.(); setIsUploadOpen(false); }}
        />
      )}
    </div>
  );
}
