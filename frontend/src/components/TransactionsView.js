"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatedLedgerValue, Button, Card, EmptyState, ErrorState, Input, Select, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { X } from "lucide-react";

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

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    categoryName: transaction.category?.name || transaction.Category?.name || "Uncategorized",
  };
}

/**
 * Full transaction ledger UI. When `fixedType` is set ("INCOME" | "EXPENSE"),
 * this becomes the Income or Expenses page: the type selector/filter is
 * hidden, every write is forced to that type, and a category-breakdown +
 * total is shown.
 */
export default function TransactionsView({ store, fixedType }) {
  const {
    transactions,
    categories,
    loading,
    error,
    pendingDeleteIds,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch,
  } = store;

  const now = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly" | "all_time"
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [periodSummary, setPeriodSummary] = useState(null);
  const [periodTransactions, setPeriodTransactions] = useState([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState("");

  const [form, setForm] = useState({
    amount: "",
    type: fixedType || "EXPENSE",
    categoryId: "",
    description: "",
    sourceAccount: "",
    destinationAccount: "",
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Transfer Candidate Matching Modal state
  const [candidateModalTx, setCandidateModalTx] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [linkingId, setLinkingId] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ categoryId: "ALL", type: "ALL" });
  const [sortBy, setSortBy] = useState("date_desc");

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
    if (fixedType) {
      query += `${query ? "&" : "?"}type=${fixedType}`;
    }

    try {
      const [sumRes, txRes] = await Promise.all([
        api.summary(query),
        api.transactions(query),
      ]);
      setPeriodSummary(sumRes);
      setPeriodTransactions(txRes.transactions.map(normalizeTransaction));
    } catch (err) {
      setPeriodError(err.message || "Failed to load data for selected period.");
    } finally {
      setPeriodLoading(false);
    }
  }, [fixedType]);

  useEffect(() => {
    if (!loading) {
      fetchPeriodData(periodMode, selectedMonth, selectedYear);
    }
  }, [loading, periodMode, selectedMonth, selectedYear, fetchPeriodData]);

  const activeTransactions = periodTransactions.length > 0 || periodMode !== "monthly" ? periodTransactions : transactions;

  const scopedTransactions = fixedType
    ? activeTransactions.filter((tx) => tx.type === fixedType)
    : activeTransactions;

  const filteredCategories = categories.filter((category) => {
    if (form.type === "TRANSFER") {
      return category.type === "TRANSFER" || category.name.toLowerCase().includes("transfer");
    }
    return category.type === form.type;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      amount: Number(form.amount),
      type: fixedType || form.type,
      categoryId: Number(form.categoryId),
      description: form.description || undefined,
      sourceAccount: form.type === "TRANSFER" ? (form.sourceAccount || null) : undefined,
      destinationAccount: form.type === "TRANSFER" ? (form.destinationAccount || null) : undefined,
    };
    const ok = editingTransaction
      ? await updateTransaction(editingTransaction.id, { ...payload, description: form.description || null })
      : await addTransaction(payload);
    if (ok) {
      setEditingTransaction(null);
      setForm({ amount: "", type: fixedType || "EXPENSE", categoryId: "", description: "", sourceAccount: "", destinationAccount: "" });
      await fetchPeriodData(periodMode, selectedMonth, selectedYear);
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    await deleteTransaction(id);
    await fetchPeriodData(periodMode, selectedMonth, selectedYear);
  }

  function handleStartEdit(tx) {
    setEditingTransaction(tx);
    setForm({
      amount: String(tx.amount),
      type: tx.type,
      categoryId: String(tx.categoryId),
      description: tx.description || "",
      sourceAccount: tx.sourceAccount || "",
      destinationAccount: tx.destinationAccount || "",
    });
  }

  function handleCancelEdit() {
    setEditingTransaction(null);
    setForm({ amount: "", type: fixedType || "EXPENSE", categoryId: "", description: "", sourceAccount: "", destinationAccount: "" });
  }

  async function handleOpenCandidateModal(tx) {
    setCandidateModalTx(tx);
    setLoadingCandidates(true);
    setCandidates([]);
    try {
      const res = await api.getTransferCandidates(tx.id);
      setCandidates(res.candidates || []);
    } catch (err) {
      console.error("Failed to fetch transfer candidates:", err);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function handleLinkPair(cand) {
    if (!candidateModalTx) return;
    setLinkingId(cand.transaction.id);
    try {
      const isTargetDebit = candidateModalTx.type === "EXPENSE" || candidateModalTx.type === "TRANSFER";
      await api.linkTransfer({
        outgoingTransactionId: isTargetDebit ? candidateModalTx.id : cand.transaction.id,
        incomingTransactionId: isTargetDebit ? cand.transaction.id : candidateModalTx.id,
      });
      setCandidateModalTx(null);
      await fetchPeriodData(periodMode, selectedMonth, selectedYear);
      await refetch?.();
    } catch (err) {
      alert(err.message || "Failed to link transfer pair");
    } finally {
      setLinkingId(null);
    }
  }

  async function handleUnlink(txId) {
    if (!confirm("Unlink this transfer pair? Both original transactions will remain in your ledger.")) return;
    try {
      await api.unlinkTransfer({ transactionId: txId });
      await fetchPeriodData(periodMode, selectedMonth, selectedYear);
      await refetch?.();
    } catch (err) {
      alert(err.message || "Failed to unlink transfer");
    }
  }

  let visible = scopedTransactions.filter((tx) => {
    if (!fixedType && filter.type !== "ALL" && tx.type !== filter.type) return false;
    if (filter.categoryId !== "ALL" && String(tx.categoryId) !== filter.categoryId) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${tx.description || ""} ${tx.categoryName}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  visible = [...visible].sort((a, b) => {
    switch (sortBy) {
      case "date_asc":
        return new Date(a.date) - new Date(b.date);
      case "amount_desc":
        return Number(b.amount) - Number(a.amount);
      case "amount_asc":
        return Number(a.amount) - Number(b.amount);
      case "date_desc":
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  const total = fixedType === "INCOME"
    ? (periodSummary ? periodSummary.income : scopedTransactions.reduce((s, t) => s + Number(t.amount), 0))
    : (periodSummary ? periodSummary.expense : scopedTransactions.reduce((s, t) => s + Number(t.amount), 0));

  const byCategory = periodSummary?.byCategory || {};
  const byCategoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-14 animate-pulse rounded-xl bg-ink/5" />
        <div className="h-24 animate-pulse rounded-xl bg-ink/5" />
        <div className="h-64 animate-pulse rounded-xl bg-ink/5" />
      </div>
    );
  }

  return (
    <div>
      <ErrorState message={error} onRetry={refetch} />

      {/* Period Selector Header Controls */}
      <Card className="mb-6 bg-paper-raised/90 border border-line/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Period:</span>
            <div className="flex items-center rounded-lg bg-paper p-1 border border-line">
              {[
                { id: "monthly", label: "Monthly" },
                { id: "yearly", label: "Yearly" },
                { id: "all_time", label: "All Time" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriodMode(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all duration-200 ${
                    periodMode === item.id
                      ? "bg-horizon text-[#0f1b33] shadow-sm font-bold"
                      : "text-ink-soft hover:text-ink hover:bg-ink/5"
                  }`}

                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {periodMode === "monthly" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
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
                className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft font-editorial">Select Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-paper border border-line rounded-md text-xs text-ink font-editorial focus:outline-none focus:border-horizon cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === "all_time" && (
            <span className="text-xs text-ink-soft font-editorial italic">
              Showing all transactions across all dates
            </span>
          )}

          {periodLoading && (
            <span className="text-xs text-horizon font-editorial animate-pulse flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-horizon animate-ping" />
              Updating entries…
            </span>
          )}
        </div>
      </Card>

      {periodError && (
        <div className="mb-4">
          <ErrorState message={periodError} onRetry={() => fetchPeriodData(periodMode, selectedMonth, selectedYear)} />
        </div>
      )}

      {fixedType && (
        <div className={`grid gap-4 sm:grid-cols-2 mb-6 transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
          <StatCard label={fixedType === "INCOME" ? "Total Income" : "Total Expenses"} value={total} kind="currency" />
          <Card>
            <p className="text-xs uppercase tracking-wide text-ink-soft mb-2">By Category</p>
            {byCategoryList.length === 0 ? (
              <p className="text-xs text-ink-soft font-editorial">No data for this period.</p>
            ) : (
              <div className="space-y-1.5">
                {byCategoryList.slice(0, 5).map(([name, amount]) => (
                  <div key={name} className="flex justify-between text-xs font-editorial">
                    <span className="text-ink-soft">{name}</span>
                    <span className="font-figure text-ink font-medium">
                      ₹{amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add / Edit form */}
      <Card>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          {!fixedType && (
            <Select
              id="type"
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: "" })}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="TRANSFER">Personal Transfer</option>
            </Select>
          )}

          <div className={fixedType ? "sm:col-span-2" : ""}>
            <Select
              id="categoryId"
              label="Category"
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="" disabled>
                Select category
              </option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            id="amount"
            label="Amount (₹)"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <Input
            id="description"
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {form.type === "TRANSFER" && (
            <>
              <Input
                id="sourceAccount"
                label="Source Account (optional)"
                placeholder="e.g. HDFC Checking"
                value={form.sourceAccount}
                onChange={(e) => setForm({ ...form, sourceAccount: e.target.value })}
              />
              <Input
                id="destinationAccount"
                label="Destination Account (optional)"
                placeholder="e.g. ICICI Savings or Zerodha"
                value={form.destinationAccount}
                onChange={(e) => setForm({ ...form, destinationAccount: e.target.value })}
              />
            </>
          )}

          <div className="sm:col-span-2 pt-1 flex items-center gap-3">
            <Button
              type="submit"
              variant="accent"
              disabled={submitting}
              className="w-full sm:w-auto font-screamer tracking-wide text-sm uppercase cursor-pointer"
            >
              {submitting
                ? "Submitting…"
                : editingTransaction
                ? "Save changes"
                : fixedType === "INCOME"
                ? "Add income"
                : fixedType === "EXPENSE"
                ? "Add expense"
                : form.type === "TRANSFER"
                ? "Add transfer"
                : "Add transaction"}
            </Button>
            {editingTransaction && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto font-screamer tracking-wide text-sm uppercase cursor-pointer"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Search + filters + sort */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          id="search"
          label="Search"
          placeholder="Description or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!fixedType && (
          <Select id="filterType" label="Type" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
            <option value="ALL">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </Select>
        )}
        <Select
          id="filterCategory"
          label="Category"
          value={filter.categoryId}
          onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}
        >
          <option value="ALL">All categories</option>
          {categories
            .filter((c) => !fixedType || c.type === fixedType)
            .map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
        </Select>
        <Select id="sortBy" label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Amount: high to low</option>
          <option value="amount_asc">Amount: low to high</option>
        </Select>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <EmptyState
          className="mt-4"
          title={scopedTransactions.length === 0 ? "No transactions for this period" : "No matches"}
          description={
            scopedTransactions.length === 0
              ? "Try selecting a different period or adding a transaction above."
              : "Try adjusting your search, filters, or sort."
          }
        />
      ) : (
        <ul className={`mt-4 divide-y divide-line transition-opacity duration-200 ${periodLoading ? "opacity-60" : "opacity-100"}`}>
          {visible.map((tx) => (
            <li key={tx.id} className="overflow-hidden">
              <div className="flex items-center justify-between py-3">
                <div className="font-editorial">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-ink font-semibold">{tx.description || tx.categoryName}</p>
                    {tx.type === "TRANSFER" && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          tx.linkedTransaction
                            ? "bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}
                      >
                        {tx.linkedTransaction ? `Transfer · Paired (Tx #${tx.linkedTransaction.id})` : "Transfer · Unpaired"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {tx.categoryName} · {new Date(tx.date).toLocaleDateString("en-IN")}
                    {(tx.sourceAccount || tx.destinationAccount) && (
                      <span className="text-horizon/90 font-medium ml-1">
                        · {[tx.sourceAccount ? `From: ${tx.sourceAccount}` : null, tx.destinationAccount ? `To: ${tx.destinationAccount}` : null].filter(Boolean).join(" ➔ ")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-figure text-sm font-semibold ${
                      tx.type === "INCOME"
                        ? "text-signal-pos"
                        : tx.type === "TRANSFER"
                        ? "text-[#3B82F6]"
                        : "text-signal-neg"
                    }`}
                  >
                    {tx.type === "INCOME" ? "+" : tx.type === "TRANSFER" ? "⇄ " : "−"}
                    <AnimatedLedgerValue value={Number(tx.amount)} kind="currency" />
                  </span>
                  {tx.type === "TRANSFER" && !tx.linkedTransaction && (
                    <button
                      type="button"
                      onClick={() => handleOpenCandidateModal(tx)}
                      className="text-xs text-[#3B82F6] font-semibold underline underline-offset-4 hover:opacity-80 font-editorial cursor-pointer"
                    >
                      Find Match
                    </button>
                  )}
                  {tx.type === "TRANSFER" && tx.linkedTransaction && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(tx.id)}
                      className="text-xs text-ink-soft underline underline-offset-4 hover:text-signal-neg font-editorial cursor-pointer"
                    >
                      Unlink
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(tx)}
                    className="text-xs text-horizon underline underline-offset-4 hover:opacity-80 font-editorial cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tx.id)}
                    disabled={pendingDeleteIds.includes(tx.id)}
                    className="text-xs text-ink-soft underline underline-offset-4 hover:text-signal-neg disabled:opacity-50 font-editorial cursor-pointer"
                  >
                    {pendingDeleteIds.includes(tx.id) ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Transfer Candidate Pairing Modal */}
      {candidateModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-paper-raised p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-screamer text-lg tracking-wide text-ink">Link Personal Transfer Pair</h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Counterpart for: <span className="font-semibold text-ink">{candidateModalTx.description || candidateModalTx.categoryName}</span> (₹{Number(candidateModalTx.amount).toFixed(2)})
                </p>
              </div>
              <button
                onClick={() => setCandidateModalTx(null)}
                className="rounded-lg p-1 text-ink-soft hover:bg-paper hover:text-ink transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
              {loadingCandidates ? (
                <div className="py-8 text-center text-xs text-ink-soft">
                  Scanning ledger for candidate transactions within ±3 days...
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-soft space-y-2">
                  <p className="font-semibold text-ink">No counterpart matches found.</p>
                  <p className="leading-relaxed">
                    No transactions matching ₹{Number(candidateModalTx.amount).toFixed(2)} were found within ±3 days.
                    Unmatched transfers remain safely recorded as personal transfers without affecting your income, expenses, or savings rate.
                  </p>
                </div>
              ) : (
                candidates.map((cand) => (
                  <div
                    key={cand.transaction.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-line bg-paper hover:bg-ink/[0.02] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink">
                          {cand.transaction.description || cand.transaction.categoryName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cand.confidence === "HIGH"
                              ? "bg-signal-pos/10 text-signal-pos"
                              : "bg-horizon/10 text-horizon"
                          }`}
                        >
                          {cand.confidence} MATCH
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-soft mt-0.5">
                        {new Date(cand.transaction.date).toLocaleDateString("en-IN")} ·{" "}
                        {cand.dayDifference === 0 ? "Same day" : `${cand.dayDifference} days apart`} ·{" "}
                        {cand.transaction.categoryName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-figure text-sm font-semibold text-ink">
                        ₹{Number(cand.transaction.amount).toFixed(2)}
                      </span>
                      <Button
                        variant="accent"
                        size="sm"
                        disabled={linkingId === cand.transaction.id}
                        onClick={() => handleLinkPair(cand)}
                        className="text-xs cursor-pointer font-screamer uppercase"
                      >
                        {linkingId === cand.transaction.id ? "Linking…" : "Link Pair"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-line flex justify-end">
              <Button variant="ghost" onClick={() => setCandidateModalTx(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
