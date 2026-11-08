"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

export default function EditAssetModal({ holding, onClose, onUpdate }) {
  const isFD = holding?.type === "FIXED_DEPOSIT";

  const [name, setName] = useState(holding?.name ?? "");
  const [symbol, setSymbol] = useState(holding?.symbol ?? "");
  const [notes, setNotes] = useState(holding?.notes ?? "");

  // FD specific
  const [principal, setPrincipal] = useState(holding?.principal ?? "");
  const [interestRate, setInterestRate] = useState(holding?.interestRate ?? "");
  const [startDate, setStartDate] = useState(
    holding?.startDate ? new Date(holding.startDate).toISOString().split("T")[0] : ""
  );
  const [maturityDate, setMaturityDate] = useState(
    holding?.maturityDate ? new Date(holding.maturityDate).toISOString().split("T")[0] : ""
  );
  const [maturityAmount, setMaturityAmount] = useState(holding?.maturityAmount ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Asset name is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        symbol: symbol.trim() || null,
        notes: notes.trim() || null,
      };

      if (isFD) {
        if (principal) payload.principal = Number(principal);
        if (interestRate !== "") payload.interestRate = Number(interestRate);
        if (startDate) payload.startDate = new Date(startDate).toISOString();
        if (maturityDate) payload.maturityDate = new Date(maturityDate).toISOString();
        if (maturityAmount) payload.maturityAmount = Number(maturityAmount);
      }

      await onUpdate(holding.id, payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update asset.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-editorial">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-screamer text-xl uppercase tracking-wide text-ink">
            Edit Asset Details
          </h3>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              Asset / Institution Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink focus:border-horizon outline-none"
            />
          </div>

          {!isFD && (
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">
                Symbol / Ticker / Folio
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. RELIANCE, INFOSYS, 10293847"
                className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-mono focus:border-horizon outline-none"
              />
            </div>
          )}

          {isFD && (
            <div className="space-y-3 pt-2 border-t border-line">
              <p className="text-xs font-semibold text-ink uppercase tracking-wider">
                Fixed Deposit Details
              </p>
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Principal Amount (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Interest Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="30"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Maturity Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={maturityAmount}
                    onChange={(e) => setMaturityAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">
                    Maturity Date
                  </label>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink font-figure focus:border-horizon outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              Personal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Long term retirement holding"
              className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-ink focus:border-horizon outline-none"
            />
          </div>

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
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

