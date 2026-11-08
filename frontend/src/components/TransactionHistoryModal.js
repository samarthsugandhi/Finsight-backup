"use client";

import { useEffect, useState } from "react";
import { X, ArrowDownLeft, ArrowUpRight, Clock, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";

function fmt(n) {
  if (n === null || n === undefined) return "—";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function TransactionHistoryModal({ holding, onClose, onAddTxClick }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!holding?.id) return;
    setLoading(true);
    api.portfolioTransactions(holding.id)
      .then((data) => {
        setTransactions(data.transactions || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load transactions.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [holding?.id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-editorial">
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-line bg-paper shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line bg-paper-raised">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-screamer text-xl uppercase tracking-wide text-ink">
                Transaction History
              </h3>
              <span className="text-xs px-2 py-0.5 rounded font-mono uppercase bg-horizon/10 text-horizon border border-horizon/20">
                {holding?.type?.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-0.5 font-medium">{holding?.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-soft hover:text-ink cursor-pointer p-1.5 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/5" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-signal-neg text-xs">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-ink-soft">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-ink">No transactions recorded yet</p>
              <p className="text-xs mt-1">Add a BUY or SELL transaction to start tracking history.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isBuy = tx.side === "BUY";
                const total = Number(tx.quantity) * Number(tx.price);
                const txDate = tx.date
                  ? new Date(tx.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-paper-raised/40 hover:bg-paper-raised transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                          isBuy
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        }`}
                      >
                        {isBuy ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-screamer text-sm tracking-wider uppercase ${
                              isBuy ? "text-emerald-500" : "text-amber-500"
                            }`}
                          >
                            {tx.side}
                          </span>
                          <span className="text-xs text-ink-soft font-figure">{txDate}</span>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {Number(tx.quantity)} units @ {fmt(tx.price)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-figure font-bold text-ink text-sm">{fmt(total)}</p>
                      <p className="text-[10px] text-ink-soft uppercase tracking-wider">
                        {isBuy ? "Total Cost" : "Sale Proceeds"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-paper-raised/50 flex justify-between items-center">
          <p className="text-xs text-ink-soft">
            {transactions.length} total transaction{transactions.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="text-xs">
              Close
            </Button>
            {holding?.type !== "FIXED_DEPOSIT" && onAddTxClick && (
              <Button
                variant="accent"
                onClick={() => {
                  onClose();
                  onAddTxClick(holding);
                }}
                className="text-xs font-screamer uppercase tracking-wider inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Transaction
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

