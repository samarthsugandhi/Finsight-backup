"use client";

import { useState } from "react";
import { X, ArrowUpRight, ArrowDownLeft, AlertCircle } from "lucide-react";
import { Button, Input } from "@/components/ui";

const today = () => new Date().toISOString().split("T")[0];

export default function AddTransactionModal({ holding, onClose, onAddTransaction }) {
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableQty = holding?.quantity ?? 0;
  const avgCost = holding?.avgBuyPrice ?? 0;
  const numQty = Number(quantity) || 0;
  const numPrice = Number(price) || 0;
  const totalAmount = numQty * numPrice;

  // Realized P&L preview for SELL
  const estimatedPnl = side === "SELL" && numQty > 0 && numPrice > 0
    ? (numPrice - avgCost) * numQty
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (numQty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    if (numPrice <= 0) {
      setError("Price per unit must be greater than 0.");
      return;
    }

    if (side === "SELL" && numQty > availableQty) {
      setError(`Cannot sell ${numQty} units. You currently hold ${availableQty} units.`);
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onAddTransaction(holding.id, {
        side,
        quantity: numQty,
        price: numPrice,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
      });
      if (ok) onClose();
    } catch (err) {
      setError(err.message || "Failed to record transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-editorial">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-screamer text-xl uppercase tracking-wide text-ink">
              Record Transaction
            </h3>
            <p className="text-xs text-ink-soft mt-0.5 font-medium">{holding?.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-soft hover:text-ink cursor-pointer p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-signal-neg/30 bg-signal-neg/10 p-3 text-xs text-signal-neg">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-paper-raised border border-line">
          <button
            type="button"
            onClick={() => { setSide("BUY"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              side === "BUY"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            BUY (Add Units)
          </button>
          <button
            type="button"
            onClick={() => { setSide("SELL"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              side === "SELL"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            SELL (Reduce Units)
          </button>
        </div>

        {side === "SELL" && (
          <div className="mb-4 rounded-xl border border-line bg-paper-raised/60 p-3 text-xs">
            <div className="flex justify-between items-center text-ink-soft mb-1">
              <span>Available Holding:</span>
              <span className="font-figure font-semibold text-ink">{availableQty} units</span>
            </div>
            <div className="flex justify-between items-center text-ink-soft">
              <span>Cost Basis (Avg):</span>
              <span className="font-figure font-semibold text-ink">
                ₹{Number(avgCost).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>
            {estimatedPnl !== null && (
              <div className="mt-2 pt-2 border-t border-line/60 flex justify-between items-center">
                <span>Estimated Realized P&L:</span>
                <span className={`font-figure font-bold ${estimatedPnl >= 0 ? "text-signal-pos" : "text-signal-neg"}`}>
                  {estimatedPnl >= 0 ? "+" : ""}₹{Number(estimatedPnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              Quantity / Units *
            </label>
            <input
              type="number"
              step="any"
              min="0.000001"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              {side === "BUY" ? "Purchase Price per Unit (₹) *" : "Sale Price per Unit (₹) *"}
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 150.00"
              className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              Transaction Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
            />
          </div>

          {totalAmount > 0 && (
            <div className="rounded-xl border border-line bg-paper-raised p-3 text-xs flex justify-between items-center">
              <span className="text-ink-soft font-medium">Total Transaction Value:</span>
              <span className="font-figure font-bold text-ink text-sm">
                ₹{Number(totalAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={submitting}
              className="font-screamer uppercase tracking-wider"
            >
              {submitting ? "Saving..." : side === "BUY" ? "Record Purchase" : "Record Sale"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

