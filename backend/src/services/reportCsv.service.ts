import { ReportData, ReportTransactionItem } from "./report.service";

/**
 * Escapes a single CSV field value according to RFC 4180:
 * - Replaces null/undefined with empty string
 * - If value contains commas, quotes, or newlines, escapes quotes as double-quotes and wraps in quotes.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const reportCsvService = {
  /**
   * Generates a standard UTF-8 CSV containing the filtered transaction ledger.
   */
  generateTransactionsCsv(transactions: ReportTransactionItem[]): string {
    const BOM = "\uFEFF";
    const headers = ["Date", "Description", "Category", "Type", "Amount (INR)", "Notes"];
    const rows: string[] = [headers.join(",")];

    for (const tx of transactions) {
      const typeLabel = tx.isInternalTransfer ? "TRANSFER" : tx.type;
      rows.push(
        [
          escapeCsvField(tx.date),
          escapeCsvField(tx.description),
          escapeCsvField(tx.categoryName),
          escapeCsvField(typeLabel),
          escapeCsvField(tx.amount.toFixed(2)),
          escapeCsvField(tx.notes || ""),
        ].join(",")
      );
    }

    return BOM + rows.join("\r\n");
  },

  /**
   * Generates a multi-section comprehensive CSV report (Summary + Categories + Monthly + Transactions).
   */
  generateDetailedCsv(report: ReportData, transactions: ReportTransactionItem[]): string {
    const BOM = "\uFEFF";
    const lines: string[] = [];

    // 1. Report Metadata
    lines.push(`FinSight Financial Performance Report,${escapeCsvField(report.periodLabel)}`);
    lines.push(`Generated At,${escapeCsvField(report.generatedAt)}`);
    lines.push(`Currency,${escapeCsvField(report.currency)}`);
    lines.push("");

    // 2. Executive Summary Metrics
    lines.push("EXECUTIVE SUMMARY METRIC,AMOUNT (INR),COMPARISON TO PREV PERIOD");
    lines.push(`Total Income,${report.summary.totalIncome.toFixed(2)},${report.comparison.incomeChangePct !== null ? `${report.comparison.incomeChangePct}%` : "N/A"}`);
    lines.push(`Total Expenses,${report.summary.totalExpenses.toFixed(2)},${report.comparison.expenseChangePct !== null ? `${report.comparison.expenseChangePct}%` : "N/A"}`);
    lines.push(`Net Cash Flow,${report.summary.netCashFlow.toFixed(2)},${report.comparison.netCashFlowDiff !== null ? `${report.comparison.netCashFlowDiff.toFixed(2)}` : "N/A"}`);
    lines.push(`Savings Rate,${report.summary.savingsRate !== null ? `${report.summary.savingsRate.toFixed(1)}%` : "N/A"},Target 20%`);
    lines.push(`Internal Transfers,${report.summary.totalTransfers.toFixed(2)},Excluded from totals`);
    lines.push("");

    // 3. Category Breakdown
    if (report.spendingByCategory.length > 0) {
      lines.push("SPENDING BY CATEGORY,AMOUNT (INR),SHARE (%),TRANSACTIONS COUNT");
      for (const cat of report.spendingByCategory) {
        lines.push(
          `${escapeCsvField(cat.categoryName)},${cat.amount.toFixed(2)},${cat.percentage.toFixed(1)}%,${cat.count}`
        );
      }
      lines.push("");
    }

    // 4. Monthly Trend (if yearly)
    if (report.period === "yearly" && report.monthlyTrends.length > 0) {
      lines.push("MONTH,INCOME (INR),EXPENSES (INR),NET CASH FLOW (INR),SAVINGS RATE (%),TRANSACTIONS COUNT");
      for (const m of report.monthlyTrends) {
        lines.push(
          `${escapeCsvField(m.monthName)},${m.income.toFixed(2)},${m.expense.toFixed(2)},${m.netCashFlow.toFixed(2)},${m.savingsRate !== null ? `${m.savingsRate.toFixed(1)}%` : "N/A"},${m.transactionCount}`
        );
      }
      lines.push("");
    }

    // 5. Budget Performance (if any)
    if (report.budgets.length > 0) {
      lines.push("BUDGET CATEGORY,LIMIT (INR),SPENT (INR),REMAINING (INR),PERCENT USED (%),STATUS");
      for (const b of report.budgets) {
        lines.push(
          `${escapeCsvField(b.categoryName)},${b.limit.toFixed(2)},${b.spent.toFixed(2)},${b.remaining.toFixed(2)},${b.percentUsed.toFixed(1)}%,${escapeCsvField(b.status)}`
        );
      }
      lines.push("");
    }

    // 6. Transactions Ledger
    lines.push("TRANSACTION LEDGER");
    lines.push("Date,Description,Category,Type,Amount (INR),Notes");
    for (const tx of transactions) {
      const typeLabel = tx.isInternalTransfer ? "TRANSFER" : tx.type;
      lines.push(
        [
          escapeCsvField(tx.date),
          escapeCsvField(tx.description),
          escapeCsvField(tx.categoryName),
          escapeCsvField(typeLabel),
          escapeCsvField(tx.amount.toFixed(2)),
          escapeCsvField(tx.notes || ""),
        ].join(",")
      );
    }

    return BOM + lines.join("\r\n");
  },
};
