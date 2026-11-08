"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  CheckCircle,
  ChevronDown,
  Tag,
  Loader2,
  InboxIcon,
  AlertTriangle,
  Plus,
  X,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { useFinance } from "@/context/FinanceContext";

function formatDate(dateStr) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/** Create Category Modal */
function CreateCategoryModal({ isOpen, onClose, transactionType, onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isExpense = transactionType === "EXPENSE";

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError("Please enter a category name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.addCategory({
        name: name.trim(),
        type: transactionType,
      });
      setName("");
      onCreated(res.category);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md rounded-2xl border border-line bg-paper-raised p-6 shadow-xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-horizon" />
            <h3 className="font-screamer text-lg tracking-wide text-ink">
              Create New Category
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-ink-soft hover:bg-paper hover:text-ink transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder={isExpense ? "e.g., Pet Care, Gym, Subscriptions" : "e.g., Consulting, Dividends"}
              autoFocus
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-horizon focus:outline-none focus:ring-1 focus:ring-horizon/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Inherited Type
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  isExpense
                    ? "bg-signal-neg/10 text-signal-neg border border-signal-neg/20"
                    : "bg-signal-pos/10 text-signal-pos border border-signal-pos/20"
                }`}
              >
                {isExpense ? "● EXPENSE (Debit / DR)" : "● INCOME (Credit / CR)"}
              </span>
              <span className="text-xs text-ink-soft">
                Inherited from the active transaction
              </span>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-signal-neg">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-horizon px-5 py-2 text-xs font-semibold text-[#0f1b33] transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</>
              ) : (
                <><Plus className="h-3.5 w-3.5" /> Create &amp; Select</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/** A single animated Review Queue row */
function QueueRow({ item, categories, onApprove, onNewCategoryCreated }) {
  const [categoryId, setCategoryId] = useState("");
  const [saveRule, setSaveRule] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const isExpense = item.type === "EXPENSE";

  // Strictly filter categories based on transaction type (INCOME vs EXPENSE), plus TRANSFER categories
  const filteredCategories = (categories || []).filter(
    (cat) => cat.type === item.type || cat.type === "TRANSFER"
  );

  const handleApprove = () => {
    if (!categoryId) {
      setError("Please select a category first.");
      return;
    }
    setError("");
    const chosenCat = (categories || []).find((c) => String(c.id) === String(categoryId));
    const isTransfer = chosenCat?.type === "TRANSFER";
    // Optimistic UI: notify parent immediately to animate out the row
    onApprove(item, Number(categoryId), saveRule, isTransfer ? { type: "TRANSFER" } : undefined);
  };

  const handleCategorySelectChange = (e) => {
    const val = e.target.value;
    if (val === "__CREATE_NEW__") {
      setShowModal(true);
    } else {
      setCategoryId(val);
      setError("");
    }
  };

  const handleCategoryCreated = (newCat) => {
    onNewCategoryCreated?.(newCat);
    setCategoryId(String(newCat.id));
    setError("");
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 40, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="group relative rounded-xl border border-line bg-paper-raised p-4 transition-shadow hover:shadow-sm"
      >
        {/* Top row: Date + Badge + Description + Amount */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Type badge */}
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                isExpense
                  ? "bg-signal-neg/10 text-signal-neg border border-signal-neg/20"
                  : "bg-signal-pos/10 text-signal-pos border border-signal-pos/20"
              }`}
            >
              {isExpense ? "DR (Expense)" : "CR (Income)"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink leading-tight" title={item.description}>
                {item.description || "Unknown Transaction"}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{formatDate(item.date)}</p>
            </div>
          </div>
          <p
            className={`font-figure text-base font-semibold shrink-0 ${
              isExpense ? "text-signal-neg" : "text-signal-pos"
            }`}
          >
            {isExpense ? "−" : "+"}
            {formatCurrency(item.amount)}
          </p>
        </div>

        {/* Action row */}
        <div className="mt-3.5 flex flex-wrap items-end gap-2.5">
          {/* Category dropdown with strict type filtering */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                {isExpense ? "Expense Category (Debit)" : "Income Category (Credit)"}
              </span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-horizon hover:underline cursor-pointer"
              >
                <Plus className="h-2.5 w-2.5" /> New
              </button>
            </div>
            <div className="relative">
              <select
                id={`category-select-${item.id}`}
                value={categoryId}
                onChange={handleCategorySelectChange}
                className="w-full appearance-none rounded-lg border border-line bg-paper px-3 py-2 pr-8 text-sm text-ink focus:border-horizon focus:outline-none focus:ring-1 focus:ring-horizon/30 cursor-pointer"
              >
                <option value="" disabled>
                  Select {isExpense ? "Expense" : "Income"} category…
                </option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="__CREATE_NEW__" className="font-semibold text-horizon">
                  ＋ Create New Category…
                </option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            </div>
          </div>

          {/* Save rule checkbox */}
          <label
            htmlFor={`save-rule-${item.id}`}
            className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-ink-soft whitespace-nowrap pb-2"
          >
            <div
              className={`relative h-4 w-4 rounded border transition-colors ${
                saveRule ? "border-horizon bg-horizon" : "border-line bg-paper"
              }`}
            >
              <input
                type="checkbox"
                id={`save-rule-${item.id}`}
                checked={saveRule}
                onChange={(e) => setSaveRule(e.target.checked)}
                className="sr-only"
              />
              {saveRule && (
                <svg viewBox="0 0 10 8" className="absolute inset-0 m-auto h-2.5 w-2.5 text-[#0f1b33] fill-none stroke-current stroke-[1.8]">
                  <path d="M1 4l2.5 2.5L9 1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <Tag className="h-3 w-3" />
            Save Rule
          </label>

          {/* Approve button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleApprove}
            disabled={!categoryId}
            id={`approve-btn-${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-horizon px-4 py-2 text-sm font-semibold text-[#0f1b33] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="h-4 w-4" /> Save &amp; Categorize
          </motion.button>
        </div>

        {/* Inline error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex items-center gap-1 text-xs text-signal-neg"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Inline Create Category Modal */}
      <AnimatePresence>
        {showModal && (
          <CreateCategoryModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            transactionType={item.type}
            onCreated={handleCategoryCreated}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * ReviewQueue: Interactive Review Queue with strictly filtered type-aware
 * categories (Expense vs Income), real-time revalidation, and dynamic category creation.
 */
export default function ReviewQueue({ categories: initialCategories, onQueueEmpty, onRowApproved }) {
  const router = useRouter();
  const { refetch, categories: contextCategories } = useFinance();
  const [createdCategories, setCreatedCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const categories = useMemo(() => {
    const base = contextCategories && contextCategories.length > 0 ? contextCategories : (initialCategories || []);
    if (createdCategories.length === 0) return base;
    const existingIds = new Set(base.map((c) => c.id));
    const uniqueCreated = createdCategories.filter((c) => !existingIds.has(c.id));
    return [...base, ...uniqueCreated];
  }, [contextCategories, initialCategories, createdCategories]);

  // Strict deduplication guarantee: prevent duplicate rows from ever appearing in the UI
  const deduplicatedItems = useMemo(() => {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.transactionHash || `${item.date}_${item.amount}_${(item.description || '').trim().toLowerCase()}_${item.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    setActionError("");
    try {
      const data = await api.statements.getReviewQueue();
      setItems(data.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initQueue() {
      try {
        const data = await api.statements.getReviewQueue();
        if (active) {
          setItems(data.data ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load review queue.");
          setLoading(false);
        }
      }
    }
    void initQueue();
    return () => {
      active = false;
    };
  }, []);

  const handleApprove = useCallback(
    (itemToApprove, selectedCategoryId, shouldSaveRule, overrides) => {
      // 1. Optimistic removal: remove row immediately so Framer Motion plays exit animation instantly
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== itemToApprove.id);
        if (next.length === 0) {
          setTimeout(() => onQueueEmpty?.(), 400);
        }
        return next;
      });
      setActionError("");

      // 2. Background API call
      api.statements
        .approveQueueItem(itemToApprove.id, {
          categoryId: selectedCategoryId,
          createRule: shouldSaveRule,
          ...overrides,
        })
        .then(() => {
          // 3. State Sync: trigger global context refresh and router refresh without full page reload
          refetch?.();
          router.refresh();
          onRowApproved?.(itemToApprove.id);
        })
        .catch((err) => {
          // 4. Rollback: restore item to queue and display error banner
          setItems((prev) => {
            if (prev.some((i) => i.id === itemToApprove.id)) return prev;
            return [itemToApprove, ...prev];
          });
          setActionError(
            `Failed to categorize "${itemToApprove.description || "Transaction"}": ${
              err.message || "Server error"
            }. Restored to queue.`
          );
        });
    },
    [refetch, router, onRowApproved, onQueueEmpty]
  );

  const handleNewCategoryCreated = useCallback(
    (newCat) => {
      setCreatedCategories((prev) => {
        if (prev.some((c) => c.id === newCat.id)) return prev;
        return [...prev, newCat];
      });
      refetch?.();
    },
    [refetch]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-screamer text-lg tracking-wide text-ink">
            Review Queue
          </h2>
          {!loading && (
            <p className="mt-0.5 font-editorial text-xs text-ink-soft">
              {deduplicatedItems.length === 0
                ? "All transactions categorized ✓"
                : `${deduplicatedItems.length} transaction${deduplicatedItems.length !== 1 ? "s" : ""} need your attention`}
            </p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={fetchQueue}
          id="refresh-queue-btn"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:text-ink hover:border-horizon/60 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </motion.button>
      </div>

      {/* Background action error banner with dismiss */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-signal-neg/30 bg-signal-neg/10 px-4 py-3 text-xs text-signal-neg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError("")}
              className="text-signal-neg hover:opacity-75 cursor-pointer p-0.5 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-ink/5" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-signal-neg/30 bg-signal-neg/5 px-4 py-4 text-sm text-signal-neg">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchQueue}
            className="ml-auto font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && deduplicatedItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-8 py-12 text-center"
        >
          <InboxIcon className="h-10 w-10 text-ink-soft/30" strokeWidth={1.25} />
          <p className="font-editorial text-sm font-semibold text-ink">Queue is empty</p>
          <p className="max-w-xs font-editorial text-xs text-ink-soft">
            Upload a bank statement above. Unknown vendors will appear here for manual categorization.
          </p>
        </motion.div>
      )}

      {/* Transaction rows */}
      {!loading && !error && deduplicatedItems.length > 0 && (
        <AnimatePresence mode="popLayout">
          {deduplicatedItems.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              categories={categories}
              onApprove={handleApprove}
              onNewCategoryCreated={handleNewCategoryCreated}
            />
          ))}
        </AnimatePresence>
      )}

      {/* All done banner */}
      <AnimatePresence>
        {!loading && !error && deduplicatedItems.length === 0 && (
          <motion.p
            key="all-done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center font-editorial text-xs text-signal-pos"
          >
            🎉 Dashboard charts & Health Score updated with your new transactions.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
