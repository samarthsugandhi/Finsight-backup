"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Coins,
  Building,
  TrendingUp,
  PieChart as PieIcon,
} from "lucide-react";
import { Button, Input, Select } from "@/components/ui";

const TABS = [
  { id: "STOCK",        label: "Stocks",        icon: TrendingUp },
  { id: "MUTUAL_FUND",  label: "Mutual Funds",  icon: PieIcon    },
  { id: "GOLD",         label: "Gold",          icon: Coins       },
  { id: "FIXED_DEPOSIT",label: "Fixed Deposit", icon: Building   },
];

const today = () => new Date().toISOString().split("T")[0];

export default function AddAssetModal({ isOpen, onClose, onAddHolding, defaultCategory }) {
  const [activeTab, setActiveTab] = useState(defaultCategory || "STOCK");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState("");

  // ── Stock / ETF ──────────────────────────────────────────────────────────────
  const [stockForm, setStockForm] = useState({
    name: "", symbol: "", quantity: "", averageBuyPrice: "",
    currentValue: "", purchaseDate: today(),
  });

  // ── Mutual Fund ───────────────────────────────────────────────────────────────
  const [mfForm, setMfForm] = useState({
    name: "", folio: "", units: "", nav: "",
    currentValue: "", purchaseDate: today(),
  });

  // ── Gold ──────────────────────────────────────────────────────────────────────
  const [goldForm, setGoldForm] = useState({
    subType: "PHYSICAL_GOLD", name: "Physical Gold",
    quantity: "", purchaseValue: "", purchaseDate: today(),
    currentValue: "", notes: "",
  });

  // ── Fixed Deposit ─────────────────────────────────────────────────────────────
  const [fdForm, setFdForm] = useState({
    name: "", principal: "", interestRate: "",
    startDate: today(), maturityDate: "", maturityAmount: "",
  });

  if (!isOpen) return null;

  function switchTab(id) {
    setActiveTab(id);
    setError("");
  }

  // ── Submit helpers ────────────────────────────────────────────────────────────

  async function wrap(fn) {
    setSubmitting(true);
    setError("");
    try {
      const ok = await fn();
      if (ok) onClose();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStockSubmit(e) {
    e.preventDefault();
    await wrap(async () => {
      const qty      = Number(stockForm.quantity);
      const buyPrice = Number(stockForm.averageBuyPrice);
      if (qty <= 0)      throw new Error("Quantity must be greater than 0.");
      if (buyPrice <= 0) throw new Error("Average buy price must be greater than 0.");

      const payload = {
        type: "STOCK",
        name: stockForm.name.trim(),
        symbol: stockForm.symbol.trim().toUpperCase() || undefined,
        quantity: qty,
        averageBuyPrice: buyPrice,
        investedAmount: qty * buyPrice,
        purchaseDate: stockForm.purchaseDate ? new Date(stockForm.purchaseDate).toISOString() : undefined,
        manualCurrentValue: stockForm.currentValue ? Number(stockForm.currentValue) : undefined,
      };
      return onAddHolding(payload);
    });
  }

  async function handleMfSubmit(e) {
    e.preventDefault();
    await wrap(async () => {
      const units = Number(mfForm.units);
      const nav   = Number(mfForm.nav);
      if (units <= 0) throw new Error("Units must be greater than 0.");
      if (nav   <= 0) throw new Error("Average purchase NAV must be greater than 0.");

      const payload = {
        type: "MUTUAL_FUND",
        name: mfForm.name.trim(),
        symbol: mfForm.folio.trim() || undefined,
        quantity: units,
        averageBuyPrice: nav,
        investedAmount: units * nav,
        purchaseDate: mfForm.purchaseDate ? new Date(mfForm.purchaseDate).toISOString() : undefined,
        manualCurrentValue: mfForm.currentValue ? Number(mfForm.currentValue) : undefined,
      };
      return onAddHolding(payload);
    });
  }

  async function handleGoldSubmit(e) {
    e.preventDefault();
    await wrap(async () => {
      const qty = Number(goldForm.quantity);
      const val = Number(goldForm.purchaseValue);
      if (qty <= 0) throw new Error("Weight must be greater than 0.");
      if (val <= 0) throw new Error("Purchase amount must be greater than 0.");

      const payload = {
        type: "GOLD",
        subType: goldForm.subType,
        name: goldForm.name.trim() || "Gold Holding",
        quantity: qty,
        averageBuyPrice: val / qty,
        investedAmount: val,
        purchaseDate: goldForm.purchaseDate ? new Date(goldForm.purchaseDate).toISOString() : undefined,
        manualCurrentValue: goldForm.currentValue ? Number(goldForm.currentValue) : undefined,
        notes: goldForm.notes || undefined,
      };
      return onAddHolding(payload);
    });
  }

  async function handleFdSubmit(e) {
    e.preventDefault();
    await wrap(async () => {
      const principal = Number(fdForm.principal);
      if (!fdForm.name.trim()) throw new Error("Bank / institution name is required.");
      if (principal <= 0)      throw new Error("Principal amount must be greater than 0.");
      if (!fdForm.maturityDate) throw new Error("Maturity date is required.");

      const payload = {
        type: "FIXED_DEPOSIT",
        name: fdForm.name.trim(),
        principal,
        interestRate: fdForm.interestRate ? Number(fdForm.interestRate) : undefined,
        startDate: fdForm.startDate ? new Date(fdForm.startDate).toISOString() : undefined,
        maturityDate: new Date(fdForm.maturityDate).toISOString(),
        maturityAmount: fdForm.maturityAmount ? Number(fdForm.maturityAmount) : undefined,
      };
      return onAddHolding(payload);
    });
  }

  const formProps = {
    STOCK:        { onSubmit: handleStockSubmit },
    MUTUAL_FUND:  { onSubmit: handleMfSubmit    },
    GOLD:         { onSubmit: handleGoldSubmit  },
    FIXED_DEPOSIT:{ onSubmit: handleFdSubmit    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-editorial">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.96, y: 10  }}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-paper-raised">
          <div>
            <h2 className="font-screamer text-xl uppercase tracking-wide text-ink">
              Add Asset
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Record your investment to track performance and financial health.
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

        {/* ── Category Tabs ── */}
        <div className="flex border-b border-line bg-paper overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-horizon text-ink font-semibold bg-horizon/5"
                    : "border-transparent text-ink-soft hover:text-ink hover:bg-paper-raised"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-horizon" : "text-ink-soft"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-signal-neg/30 bg-signal-neg/10 px-4 py-2.5 text-xs text-signal-neg">
            {error}
          </div>
        )}

        {/* ── Forms ── */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">

          {/* STOCKS */}
          {activeTab === "STOCK" && (
            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="stockName"
                  label="Company / Security Name *"
                  placeholder="e.g. Tata Consultancy Services"
                  required
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                />
                <Input
                  id="stockSymbol"
                  label="NSE / BSE Symbol (optional)"
                  placeholder="e.g. TCS, RELIANCE"
                  value={stockForm.symbol}
                  onChange={(e) => setStockForm({ ...stockForm, symbol: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="stockQty"
                  label="Number of Shares *"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="e.g. 25"
                  required
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                />
                <Input
                  id="stockPrice"
                  label="Average Buy Price per Share (₹) *"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 3450.00"
                  required
                  value={stockForm.averageBuyPrice}
                  onChange={(e) => setStockForm({ ...stockForm, averageBuyPrice: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="stockDate"
                  label="Purchase Date"
                  type="date"
                  value={stockForm.purchaseDate}
                  onChange={(e) => setStockForm({ ...stockForm, purchaseDate: e.target.value })}
                />
                <Input
                  id="stockCurrentVal"
                  label="Current Value (₹) — optional"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Leave empty if unknown"
                  value={stockForm.currentValue}
                  onChange={(e) => setStockForm({ ...stockForm, currentValue: e.target.value })}
                />
              </div>
              {stockForm.quantity && stockForm.averageBuyPrice && (
                <p className="text-xs text-ink-soft">
                  Invested amount: <strong className="text-ink">
                    ₹{(Number(stockForm.quantity) * Number(stockForm.averageBuyPrice)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </strong>
                </p>
              )}
              <FormActions onClose={onClose} submitting={submitting} label="Save Stock" />
            </form>
          )}

          {/* MUTUAL FUNDS */}
          {activeTab === "MUTUAL_FUND" && (
            <form onSubmit={handleMfSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="mfName"
                  label="Scheme Name *"
                  placeholder="e.g. Parag Parikh Flexi Cap Fund"
                  required
                  value={mfForm.name}
                  onChange={(e) => setMfForm({ ...mfForm, name: e.target.value })}
                />
                <Input
                  id="mfFolio"
                  label="Folio / Fund Code (optional)"
                  placeholder="e.g. Folio 12345"
                  value={mfForm.folio}
                  onChange={(e) => setMfForm({ ...mfForm, folio: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="mfUnits"
                  label="Units Held *"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="e.g. 154.234"
                  required
                  value={mfForm.units}
                  onChange={(e) => setMfForm({ ...mfForm, units: e.target.value })}
                />
                <Input
                  id="mfNav"
                  label="Average Purchase NAV (₹) *"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="e.g. 56.40"
                  required
                  value={mfForm.nav}
                  onChange={(e) => setMfForm({ ...mfForm, nav: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="mfDate"
                  label="Purchase / SIP Start Date"
                  type="date"
                  value={mfForm.purchaseDate}
                  onChange={(e) => setMfForm({ ...mfForm, purchaseDate: e.target.value })}
                />
                <Input
                  id="mfCurrentVal"
                  label="Current Value (₹) — optional"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Leave empty if unknown"
                  value={mfForm.currentValue}
                  onChange={(e) => setMfForm({ ...mfForm, currentValue: e.target.value })}
                />
              </div>
              {mfForm.units && mfForm.nav && (
                <p className="text-xs text-ink-soft">
                  Invested amount: <strong className="text-ink">
                    ₹{(Number(mfForm.units) * Number(mfForm.nav)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </strong>
                </p>
              )}
              <FormActions onClose={onClose} submitting={submitting} label="Save Mutual Fund" />
            </form>
          )}

          {/* GOLD */}
          {activeTab === "GOLD" && (
            <form onSubmit={handleGoldSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  id="goldSubType"
                  label="Gold Type"
                  value={goldForm.subType}
                  onChange={(e) => {
                    const labels = {
                      PHYSICAL_GOLD: "Physical Gold",
                      DIGITAL_GOLD: "Digital Gold",
                      GOLD_ETF: "Gold ETF",
                      SGB: "Sovereign Gold Bond",
                    };
                    setGoldForm({ ...goldForm, subType: e.target.value, name: labels[e.target.value] || goldForm.name });
                  }}
                >
                  <option value="PHYSICAL_GOLD">Physical Gold (Coins / Bars / Jewellery)</option>
                  <option value="DIGITAL_GOLD">Digital Gold</option>
                  <option value="GOLD_ETF">Gold ETF</option>
                  <option value="SGB">Sovereign Gold Bond (SGB)</option>
                </Select>
                <Input
                  id="goldName"
                  label="Description / Label *"
                  placeholder="e.g. Tanishq 24K Coin, MMTC-PAMP 10g"
                  required
                  value={goldForm.name}
                  onChange={(e) => setGoldForm({ ...goldForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="goldQty"
                  label="Weight in Grams (g) *"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="e.g. 10.0"
                  required
                  value={goldForm.quantity}
                  onChange={(e) => setGoldForm({ ...goldForm, quantity: e.target.value })}
                />
                <Input
                  id="goldVal"
                  label="Purchase Amount (₹) *"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 65000"
                  required
                  value={goldForm.purchaseValue}
                  onChange={(e) => setGoldForm({ ...goldForm, purchaseValue: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="goldDate"
                  label="Purchase Date"
                  type="date"
                  value={goldForm.purchaseDate}
                  onChange={(e) => setGoldForm({ ...goldForm, purchaseDate: e.target.value })}
                />
                <Input
                  id="goldCurrentVal"
                  label="Current Value (₹) — optional"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Leave empty if unknown"
                  value={goldForm.currentValue}
                  onChange={(e) => setGoldForm({ ...goldForm, currentValue: e.target.value })}
                />
              </div>
              <Input
                id="goldNotes"
                label="Storage Notes (optional)"
                placeholder="e.g. Bank locker #14, Certificate in safe"
                value={goldForm.notes}
                onChange={(e) => setGoldForm({ ...goldForm, notes: e.target.value })}
              />
              <FormActions onClose={onClose} submitting={submitting} label="Save Gold" />
            </form>
          )}

          {/* FIXED DEPOSIT */}
          {activeTab === "FIXED_DEPOSIT" && (
            <form onSubmit={handleFdSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="fdBank"
                  label="Bank / Institution Name *"
                  placeholder="e.g. HDFC Bank, SBI, Bajaj Finance"
                  required
                  value={fdForm.name}
                  onChange={(e) => setFdForm({ ...fdForm, name: e.target.value })}
                />
                <Input
                  id="fdPrincipal"
                  label="Principal Amount (₹) *"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 100000"
                  required
                  value={fdForm.principal}
                  onChange={(e) => setFdForm({ ...fdForm, principal: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  id="fdRate"
                  label="Interest Rate (% p.a.)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="30"
                  placeholder="e.g. 7.25"
                  value={fdForm.interestRate}
                  onChange={(e) => setFdForm({ ...fdForm, interestRate: e.target.value })}
                />
                <Input
                  id="fdStartDate"
                  label="Deposit Start Date"
                  type="date"
                  value={fdForm.startDate}
                  onChange={(e) => setFdForm({ ...fdForm, startDate: e.target.value })}
                />
                <Input
                  id="fdMaturityDate"
                  label="Maturity Date *"
                  type="date"
                  required
                  value={fdForm.maturityDate}
                  onChange={(e) => setFdForm({ ...fdForm, maturityDate: e.target.value })}
                />
              </div>
              <Input
                id="fdMaturityAmt"
                label="Maturity Amount (₹) — optional"
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 107450 — leave empty to calculate automatically"
                value={fdForm.maturityAmount}
                onChange={(e) => setFdForm({ ...fdForm, maturityAmount: e.target.value })}
              />
              <FormActions onClose={onClose} submitting={submitting} label="Save Fixed Deposit" />
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function FormActions({ onClose, submitting, label }) {
  return (
    <div className="flex justify-end gap-3 pt-3 border-t border-line">
      <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button type="submit" variant="accent" disabled={submitting}>
        {submitting ? "Saving…" : label}
      </Button>
    </div>
  );
}
