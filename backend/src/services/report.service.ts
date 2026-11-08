import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { ReportQueryInput } from "@/validators/report.validator";
import { healthScoreService } from "@/services/healthScore.service";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface PeriodComparison {
  hasPreviousData: boolean;
  previousIncome: number;
  previousExpense: number;
  previousNetCashFlow: number;
  previousSavingsRate: number | null;
  incomeChangePct: number | null;
  expenseChangePct: number | null;
  netCashFlowDiff: number | null;
}

export interface CategorySpendingItem {
  categoryId: number;
  categoryName: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrendItem {
  month: number;
  monthName: string;
  year: number;
  income: number;
  expense: number;
  netCashFlow: number;
  savingsRate: number | null;
  transactionCount: number;
}

export interface BudgetPerformanceItem {
  budgetId: number;
  categoryId: number;
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: "ON_TRACK" | "WARNING" | "EXCEEDED";
}

export interface ReportTransactionItem {
  id: number;
  date: string;
  description: string;
  categoryName: string;
  categoryId: number;
  type: TransactionType;
  isInternalTransfer: boolean;
  amount: number;
  notes?: string | null;
}

export interface ReportData {
  period: "monthly" | "yearly" | "custom";
  periodLabel: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  currency: string;
  generatedAt: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    savingsRate: number | null; // percentage e.g. 24.5, or null if income <= 0
    totalTransfers: number;
    transactionCount: number;
  };
  comparison: PeriodComparison;
  spendingByCategory: CategorySpendingItem[];
  incomeVsExpense: {
    income: number;
    expense: number;
    netCashFlow: number;
  };
  monthlyTrends: MonthlyTrendItem[]; // Populated for yearly or multi-month reports
  budgets: BudgetPerformanceItem[];
  healthScore: {
    score: number | null;
    rating: string | null;
    isAvailable: boolean;
  };
  dataCoverage: {
    isComplete: boolean;
    uncategorizedCount: number;
    uncategorizedAmount: number;
    pendingReviewCount: number;
    notes: string[];
  };
  transactions: {
    items: ReportTransactionItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Checks whether a transaction represents an internal transfer
 * (e.g., self-transfer, transfer between own bank accounts).
 */
export function isInternalTransferTransaction(categoryName?: string | null, description?: string | null): boolean {
  const cat = (categoryName || "").trim().toLowerCase();
  const desc = (description || "").trim().toLowerCase();

  const internalTransferRegex = /(internal\s*transfer|self\s*transfer|own\s*account|own\s*a\/?c|account\s*transfer|between\s*(own\s*)?accounts?|transfer\s*to\s*self|transfer\s*to\s*own)/i;

  if (internalTransferRegex.test(cat)) return true;
  if (internalTransferRegex.test(desc)) return true;

  return false;
}

export function resolveDateRanges(input: ReportQueryInput): { current: DateRange; previous: DateRange } {
  const now = new Date();
  const year = input.year ?? now.getFullYear();
  const month = input.month ?? (now.getMonth() + 1);

  if (input.period === "monthly") {
    // Current month boundaries in UTC
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const label = `${MONTH_NAMES[month - 1]} ${year}`;

    // Previous equivalent period: previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStart = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0, 0));
    const prevEnd = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999));
    const prevLabel = `${MONTH_NAMES[prevMonth - 1]} ${prevYear}`;

    return {
      current: { start, end, label },
      previous: { start: prevStart, end: prevEnd, label: prevLabel },
    };
  }

  if (input.period === "yearly") {
    // Current year boundaries in UTC
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const label = `Calendar Year ${year}`;

    // Previous equivalent period: previous calendar year
    const prevYear = year - 1;
    const prevStart = new Date(Date.UTC(prevYear, 0, 1, 0, 0, 0, 0));
    const prevEnd = new Date(Date.UTC(prevYear, 11, 31, 23, 59, 59, 999));
    const prevLabel = `Calendar Year ${prevYear}`;

    return {
      current: { start, end, label },
      previous: { start: prevStart, end: prevEnd, label: prevLabel },
    };
  }

  // Custom range
  const startDateStr = input.startDate!;
  const endDateStr = input.endDate!;
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endDateStr}T23:59:59.999Z`);
  const label = `${startDateStr} to ${endDateStr}`;

  // Previous equivalent period: identical duration preceding start
  const durationMs = end.getTime() - start.getTime() + 1;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  const prevLabel = `Previous ${Math.round(durationMs / (1000 * 60 * 60 * 24))} Days`;

  return {
    current: { start, end, label },
    previous: { start: prevStart, end: prevEnd, label: prevLabel },
  };
}

export const reportService = {
  /**
   * Generates a comprehensive, validated, user-scoped report dataset.
   */
  async generateReport(userId: number, input: ReportQueryInput): Promise<ReportData> {
    const { current, previous } = resolveDateRanges(input);

    // 1. Fetch all raw transactions for current period to perform canonical calculations
    const currentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: current.start, lte: current.end },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    // 2. Fetch raw transactions for previous period for comparisons
    const previousTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: previous.start, lte: previous.end },
      },
      include: { category: true },
    });

    // 3. Compute current period metrics with canonical rules
    let currentIncome = 0;
    let currentExpense = 0;
    let currentTransfers = 0;
    const categoryExpenseMap: Map<number, { name: string; amount: number; count: number }> = new Map();
    let uncategorizedCount = 0;
    let uncategorizedAmount = 0;

    for (const tx of currentTransactions) {
      const amt = Number(tx.amount);
      const isTransfer = tx.type === "TRANSFER" || isInternalTransferTransaction(tx.category?.name, tx.description);

      if (isTransfer) {
        currentTransfers += amt;
        continue; // Exclude internal transfers from income & expense totals
      }

      if (tx.type === "INCOME") {
        currentIncome += amt;
      } else if (tx.type === "EXPENSE") {
        currentExpense += amt;
        const catId = tx.categoryId;
        const catName = tx.category?.name || "Uncategorized";
        const existing = categoryExpenseMap.get(catId) || { name: catName, amount: 0, count: 0 };
        existing.amount += amt;
        existing.count += 1;
        categoryExpenseMap.set(catId, existing);
      }

      // Check categorization quality
      const catName = (tx.category?.name || "").toLowerCase();
      if (!tx.categoryId || catName.includes("miscellaneous") || catName === "uncategorized") {
        uncategorizedCount += 1;
        uncategorizedAmount += amt;
      }
    }

    const currentNetCashFlow = currentIncome - currentExpense;
    const currentSavingsRate = currentIncome > 0
      ? Number((((currentIncome - currentExpense) / currentIncome) * 100).toFixed(1))
      : null;

    // 4. Compute previous period metrics
    let prevIncome = 0;
    let prevExpense = 0;
    for (const tx of previousTransactions) {
      const amt = Number(tx.amount);
      const isTransfer = tx.type === "TRANSFER" || isInternalTransferTransaction(tx.category?.name, tx.description);
      if (isTransfer) continue;

      if (tx.type === "INCOME") prevIncome += amt;
      else if (tx.type === "EXPENSE") prevExpense += amt;
    }

    const prevNetCashFlow = prevIncome - prevExpense;
    const prevSavingsRate = prevIncome > 0
      ? Number((((prevIncome - prevExpense) / prevIncome) * 100).toFixed(1))
      : null;

    const hasPreviousData = previousTransactions.length > 0;
    const incomeChangePct = hasPreviousData && prevIncome > 0
      ? Number((((currentIncome - prevIncome) / prevIncome) * 100).toFixed(1))
      : null;
    const expenseChangePct = hasPreviousData && prevExpense > 0
      ? Number((((currentExpense - prevExpense) / prevExpense) * 100).toFixed(1))
      : null;
    const netCashFlowDiff = hasPreviousData ? currentNetCashFlow - prevNetCashFlow : null;

    // 5. Spending by category sorted descending
    const spendingByCategory: CategorySpendingItem[] = Array.from(categoryExpenseMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        amount: Math.round(data.amount * 100) / 100,
        percentage: currentExpense > 0 ? Number(((data.amount / currentExpense) * 100).toFixed(1)) : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 6. Month-by-month trend for yearly or multi-month reports
    const monthlyTrends: MonthlyTrendItem[] = [];
    if (input.period === "yearly") {
      const year = current.start.getUTCFullYear();
      for (let m = 1; m <= 12; m++) {
        const monthStart = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

        const monthTxs = currentTransactions.filter((t) => {
          const d = new Date(t.date);
          return d >= monthStart && d <= monthEnd;
        });

        let mIncome = 0;
        let mExpense = 0;
        for (const t of monthTxs) {
          if (t.type === "TRANSFER" || isInternalTransferTransaction(t.category?.name, t.description)) continue;
          if (t.type === "INCOME") mIncome += Number(t.amount);
          else if (t.type === "EXPENSE") mExpense += Number(t.amount);
        }

        const mNet = mIncome - mExpense;
        const mSavingsRate = mIncome > 0 ? Number((((mIncome - mExpense) / mIncome) * 100).toFixed(1)) : null;

        monthlyTrends.push({
          month: m,
          monthName: MONTH_NAMES[m - 1].slice(0, 3),
          year,
          income: Math.round(mIncome * 100) / 100,
          expense: Math.round(mExpense * 100) / 100,
          netCashFlow: Math.round(mNet * 100) / 100,
          savingsRate: mSavingsRate,
          transactionCount: monthTxs.length,
        });
      }
    }

    // 7. Real Budget Performance in this period
    let budgetsData: BudgetPerformanceItem[] = [];
    const budgetMonth = input.period === "monthly" ? current.start.getUTCMonth() + 1 : undefined;
    const budgetYear = current.start.getUTCFullYear();

    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        year: budgetYear,
        ...(budgetMonth ? { month: budgetMonth } : {}),
      },
      include: { category: true },
    });

    if (budgets.length > 0) {
      budgetsData = budgets.map((b) => {
        const limit = Number(b.monthlyLimit);
        // Find actual spend in category during current period
        const catSpent = categoryExpenseMap.get(b.categoryId)?.amount || 0;
        const remaining = limit - catSpent;
        const percentUsed = limit > 0 ? Number(((catSpent / limit) * 100).toFixed(1)) : 0;
        let status: "ON_TRACK" | "WARNING" | "EXCEEDED" = "ON_TRACK";
        if (catSpent > limit) status = "EXCEEDED";
        else if (percentUsed >= 85) status = "WARNING";

        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          categoryName: b.category?.name || "Category",
          limit: Math.round(limit * 100) / 100,
          spent: Math.round(catSpent * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          percentUsed,
          status,
        };
      });
    }

    // 8. Financial Health Score (only if real score available)
    let healthScoreResult: { score: number | null; rating: string | null; isAvailable: boolean } = {
      score: null,
      rating: null,
      isAvailable: false,
    };
    try {
      if (input.period === "monthly" || input.period === "yearly") {
        const scoreData = await healthScoreService.compute(userId, {
          period: input.period,
          month: input.period === "monthly" ? current.start.getUTCMonth() + 1 : undefined,
          year: current.start.getUTCFullYear(),
        });
        if (scoreData && typeof scoreData.score === "number") {
          healthScoreResult = {
            score: Math.round(scoreData.score),
            rating: scoreData.rating || "Fair",
            isAvailable: true,
          };
        }
      }
    } catch {
      // Do not fabricate if computation is unavailable
      healthScoreResult = { score: null, rating: null, isAvailable: false };
    }

    // 9. Data coverage & review queue
    const pendingReviewCount = await prisma.reviewQueueTransaction.count({
      where: { userId },
    });

    const coverageNotes: string[] = [];
    if (uncategorizedCount > 0) {
      coverageNotes.push(`${uncategorizedCount} transactions (₹${uncategorizedAmount.toFixed(0)}) have miscellaneous or unclassified categories.`);
    }
    if (pendingReviewCount > 0) {
      coverageNotes.push(`${pendingReviewCount} imported transactions are awaiting category review in your inbox.`);
    }

    // 10. Filtered transactions breakdown for on-screen & export
    let filteredTransactions = currentTransactions.map((tx) => {
      const isTransfer = tx.type === "TRANSFER" || isInternalTransferTransaction(tx.category?.name, tx.description);
      return {
        id: tx.id,
        date: tx.date.toISOString().slice(0, 10),
        description: tx.description || "No description",
        categoryName: tx.category?.name || "Uncategorized",
        categoryId: tx.categoryId,
        type: tx.type,
        isInternalTransfer: isTransfer,
        amount: Number(tx.amount),
        notes: null,
      };
    });

    // Apply type filter
    if (input.type === "INCOME") {
      filteredTransactions = filteredTransactions.filter((t) => t.type === "INCOME" && !t.isInternalTransfer);
    } else if (input.type === "EXPENSE") {
      filteredTransactions = filteredTransactions.filter((t) => t.type === "EXPENSE" && !t.isInternalTransfer);
    } else if (input.type === "TRANSFER") {
      filteredTransactions = filteredTransactions.filter((t) => t.isInternalTransfer || t.type === "TRANSFER");
    }

    // Apply categoryId filter
    if (input.categoryId) {
      filteredTransactions = filteredTransactions.filter((t) => t.categoryId === input.categoryId);
    }

    // Apply search filter
    if (input.search) {
      const q = input.search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(
        (t) => t.description.toLowerCase().includes(q) || t.categoryName.toLowerCase().includes(q)
      );
    }

    // Pagination
    const totalTransactions = filteredTransactions.length;
    const page = input.page || 1;
    const limit = input.limit || 50;
    const totalPages = Math.ceil(totalTransactions / limit) || 1;
    const paginatedItems = filteredTransactions.slice((page - 1) * limit, page * limit);

    return {
      period: input.period,
      periodLabel: current.label,
      dateRange: {
        startDate: current.start.toISOString().slice(0, 10),
        endDate: current.end.toISOString().slice(0, 10),
      },
      currency: "INR",
      generatedAt: new Date().toISOString(),
      summary: {
        totalIncome: Math.round(currentIncome * 100) / 100,
        totalExpenses: Math.round(currentExpense * 100) / 100,
        netCashFlow: Math.round(currentNetCashFlow * 100) / 100,
        savingsRate: currentSavingsRate,
        totalTransfers: Math.round(currentTransfers * 100) / 100,
        transactionCount: currentTransactions.length,
      },
      comparison: {
        hasPreviousData,
        previousIncome: Math.round(prevIncome * 100) / 100,
        previousExpense: Math.round(prevExpense * 100) / 100,
        previousNetCashFlow: Math.round(prevNetCashFlow * 100) / 100,
        previousSavingsRate: prevSavingsRate,
        incomeChangePct,
        expenseChangePct,
        netCashFlowDiff,
      },
      spendingByCategory,
      incomeVsExpense: {
        income: Math.round(currentIncome * 100) / 100,
        expense: Math.round(currentExpense * 100) / 100,
        netCashFlow: Math.round(currentNetCashFlow * 100) / 100,
      },
      monthlyTrends,
      budgets: budgetsData,
      healthScore: healthScoreResult,
      dataCoverage: {
        isComplete: coverageNotes.length === 0,
        uncategorizedCount,
        uncategorizedAmount: Math.round(uncategorizedAmount * 100) / 100,
        pendingReviewCount,
        notes: coverageNotes,
      },
      transactions: {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          total: totalTransactions,
          totalPages,
        },
      },
    };
  },
};
