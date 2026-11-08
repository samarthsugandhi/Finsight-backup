import { prisma } from "@/database/prisma";
import {
  computeHealthScore,
  computeWeeklyMonitoring,
  computeYearlyProgress,
  CategoryBudgetDetail,
  HoldingItem,
  YearlyProgressMonthSnapshot,
} from "@/utils/healthScore";
import { detectSpendingAnomalies } from "@/utils/spendingAnomaly";
import { portfolioService } from "@/services/portfolio.service";

export function getPeriodPhrase(period?: string) {
  if (period === "yearly") return "this year";
  if (period === "weekly") return "this week";
  if (period === "monthly" || !period) return "this month";
  return "in the selected period";
}

export function buildHistoricalBaselineFilter(sixMonthsAgo: Date, targetStart: Date | null) {
  return targetStart ? { gte: sixMonthsAgo, lt: targetStart } : { gte: sixMonthsAgo };
}

export type BuildRecommendationsInput = {
  period?: string;
  income: number;
  expense: number;
  budgetLimit: number;
  budgetSpent: number;
  anomaliesCount: number;
  emergencyFundAmount: number | null;
  holdingTypesCount: number;
  savingsRateRaw: number;
  score: number;
};

export function buildHealthRecommendations(input: BuildRecommendationsInput): string[] {
  const periodPhrase = getPeriodPhrase(input.period);
  const recommendations: string[] = [];
  let negativeTriggers = 0;

  // If no transactions exist at all for this period
  if (input.income <= 0 && input.expense <= 0) {
    recommendations.push(
      `No income or expense transactions recorded ${periodPhrase}. Log your transactions to unlock personalized financial health recommendations.`
    );
    return recommendations;
  }

  // If user has expenses but no income recorded
  if (input.income <= 0 && input.expense > 0) {
    recommendations.push(
      `No income has been recorded ${periodPhrase}. Record your regular earnings or salary to track your savings rate and net cash flow.`
    );
    negativeTriggers += 1;
  } else if (input.income > 0 && input.expense > input.income) {
    recommendations.push(
      `Your spending is outrunning income ${periodPhrase} — review recurring and discretionary expenses.`
    );
    negativeTriggers += 1;
  }

  if (input.budgetLimit > 0 && input.budgetSpent > input.budgetLimit) {
    recommendations.push(`You are over budget ${periodPhrase}; reduce the highest overspent categories first.`);
    negativeTriggers += 1;
  }

  if (input.anomaliesCount > 0) {
    recommendations.push(
      `We flagged ${input.anomaliesCount} unusual spend pattern${input.anomaliesCount > 1 ? "s" : ""} ${periodPhrase} to review.`
    );
    negativeTriggers += 1;
  }

  if (input.income > 0 && input.savingsRateRaw < 0.15) {
    recommendations.push(
      `Your savings rate is ${(input.savingsRateRaw * 100).toFixed(1)}% ${periodPhrase} — aim for at least 20% by trimming discretionary spending or increasing income.`
    );
    negativeTriggers += 1;
  }

  if (input.holdingTypesCount === 1) {
    recommendations.push(
      "Your investments are concentrated in a single asset type — consider diversifying across stocks, mutual funds, crypto, gold, or other types to reduce risk."
    );
    negativeTriggers += 1;
  } else if (input.holdingTypesCount === 0) {
    recommendations.push(
      "No investment holdings recorded. Building a diversified investment portfolio across mutual funds, index funds, or fixed deposits will strengthen long-term resilience."
    );
    negativeTriggers += 1;
  }

  if (input.emergencyFundAmount === null) {
    recommendations.push(
      "No emergency fund goal is set. Mark a savings goal as your emergency fund to include Emergency Fund Coverage in your score."
    );
    negativeTriggers += 1;
  }

  if (input.score >= 80 && negativeTriggers === 0 && input.income > 0) {
    recommendations.push(`You're in strong financial shape ${periodPhrase} — keep it up.`);
  }

  return recommendations;
}

const ESSENTIAL_CATEGORIES = new Set([
  "bills & utilities",
  "rent & housing",
  "groceries",
  "healthcare & fitness",
  "education & stationery",
  "emi & loans",
  "loans",
  "insurance",
]);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const healthScoreService = {
  async compute(
    userId: number,
    filters: { period?: string; month?: number; year?: number; week?: number } = {}
  ) {
    const { period, month, year, week } = filters;
    const now = new Date();

    const currentYear = year || now.getFullYear();
    const currentMonth = month || now.getMonth() + 1;

    // Define target range for primary monthly calculation
    const targetStart = new Date(currentYear, currentMonth - 1, 1);
    const targetEnd = new Date(currentYear, currentMonth, 1);

    // Baseline filter for past 6 months
    const sixMonthsAgo = new Date(targetStart.getFullYear(), targetStart.getMonth() - 6, 1);
    const historicalBaselineDateFilter = buildHistoricalBaselineFilter(sixMonthsAgo, targetStart);

    // Previous month range for delta computation
    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const prevMonthStart = new Date(currentYear, currentMonth - 2, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthNumber = prevMonthDate.getMonth() + 1;
    const prevYearNumber = prevMonthDate.getFullYear();

    // Full year range for yearly progress analysis
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);

    // Parallel fetch of all relevant user financial records
    const [
      thisMonthDetailedTx,
      prevMonthDetailedTx,
      last6MonthsDetailedTx,
      fullYearTx,
      budgets,
      prevMonthBudgets,
      fullYearBudgets,
      portfolioResult,
      goals,
      emergencyContributions,
    ] = await Promise.all([
      // Current month transactions
      prisma.transaction.findMany({
        where: { userId, date: { gte: targetStart, lt: targetEnd } },
        include: { category: true },
        orderBy: { date: "desc" },
      }),
      // Previous month transactions (for delta)
      prisma.transaction.findMany({
        where: { userId, date: { gte: prevMonthStart, lt: prevMonthEnd } },
        include: { category: true },
        orderBy: { date: "desc" },
      }),
      // Historical 6-month baseline
      prisma.transaction.findMany({
        where: { userId, date: historicalBaselineDateFilter },
        include: { category: true },
        orderBy: { date: "desc" },
      }),
      // Full year transactions for yearly trajectory
      prisma.transaction.findMany({
        where: { userId, date: { gte: yearStart, lt: yearEnd } },
        include: { category: true },
        orderBy: { date: "asc" },
      }),
      // Budgets for current month
      prisma.budget.findMany({
        where: { userId, month: currentMonth, year: currentYear },
        include: { category: true },
      }),
      // Budgets for previous month (for delta)
      prisma.budget.findMany({
        where: { userId, month: prevMonthNumber, year: prevYearNumber },
        include: { category: true },
      }),
      // Budgets across full year (for trajectory)
      prisma.budget.findMany({
        where: { userId, year: currentYear },
        include: { category: true },
      }),
      // Portfolio holdings & summary
      portfolioService.list(userId),
      // User savings goals
      prisma.goal.findMany({
        where: { userId },
        include: { contributions: true },
      }),
      // Goal contributions in this year
      prisma.goalContribution.findMany({
        where: {
          userId,
          date: { gte: yearStart, lt: yearEnd },
        },
      }),
    ]);

    // ========================================================================
    // 1. MONTHLY INCOME, EXPENSE & CASH FLOW
    // ========================================================================
    const income = thisMonthDetailedTx
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + Number(t.amount), 0);

    const expense = thisMonthDetailedTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + Number(t.amount), 0);

    // 6-month baseline savings rate
    const historicalIncome = last6MonthsDetailedTx
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + Number(t.amount), 0);
    const historicalExpense = last6MonthsDetailedTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + Number(t.amount), 0);
    const rollingSavingsRate =
      historicalIncome > 0 ? (historicalIncome - historicalExpense) / historicalIncome : null;

    // Detect anomalies in current month
    const anomalies = detectSpendingAnomalies(thisMonthDetailedTx, last6MonthsDetailedTx);
    const anomalousExpenseAmount = anomalies
      .filter((a) => a.kind === "transaction")
      .reduce((s, a) => s + a.amount, 0);

    // ========================================================================
    // 2. BUDGET MANAGEMENT & CATEGORY OVERSPENDING
    // ========================================================================
    const budgetLimit = budgets.reduce((s, b) => s + Number(b.monthlyLimit), 0);
    const budgetSpent = expense;

    // Category-level breakdown
    const categoryBudgets: CategoryBudgetDetail[] = budgets.map((b) => {
      const catSpent = thisMonthDetailedTx
        .filter((t) => t.type === "EXPENSE" && t.categoryId === b.categoryId)
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        name: b.category.name,
        limit: Number(b.monthlyLimit),
        spent: catSpent,
      };
    });

    // ========================================================================
    // 3. EMERGENCY FUND & LIQUID RESILIENCE
    // ========================================================================
    const emergencyGoal = goals.find((g) => g.isEmergencyFund);
    let emergencyFundAmount: number | null = null;
    if (emergencyGoal) {
      emergencyFundAmount = emergencyGoal.contributions.reduce(
        (sum, c) => sum + Number(c.amount),
        0
      );
    }

    // Liquid portfolio assets: Account for maturity, lock-in, and withdrawal restrictions
    // - Matured FDs (100% liquid cash)
    // - Locked-in / tax-saver / non-callable FDs (0% liquid)
    // - Maturing within 30 days (80% near-liquid)
    // - Maturing within 90 days (70% liquid)
    // - General active FDs (50% liquid due to early withdrawal penalties & processing lag)
    // - Liquid / Overnight Mutual Funds (90% liquid)
    // - Non-ELSS general Mutual Funds (50% liquid)
    // - Volatile equities & physical gold: 0% credit for immediate emergencies
    // Note: Legacy CRYPTO/BOND/OTHER holdings are intentionally excluded from the
    //       diversification count and holdingsItems so they do not inflate scores.
    const SUPPORTED_TYPES_SET = new Set(["STOCK", "MUTUAL_FUND", "GOLD", "FIXED_DEPOSIT"]);
    let liquidPortfolioAssets = 0;
    const holdingsItems: HoldingItem[] = [];

    for (const h of portfolioResult.holdings) {
      // Only include supported types in health score calculations
      if (!SUPPORTED_TYPES_SET.has(h.type)) continue;
      const val = h.currentValue ?? h.investedAmount ?? 0;
      holdingsItems.push({ type: h.type, value: val });

      if (h.type === "FIXED_DEPOSIT") {
        const isTaxLocked =
          h.subType?.toLowerCase().includes("tax") ||
          h.notes?.toLowerCase().includes("tax") ||
          h.notes?.toLowerCase().includes("lock") ||
          h.notes?.toLowerCase().includes("non-callable");

        if (isTaxLocked) {
          // Locked / non-callable / tax-saver FDs cannot be liquidated for emergency needs
          liquidPortfolioAssets += 0;
        } else if (h.isMatured || (h.daysToMaturity !== null && h.daysToMaturity <= 0)) {
          // Matured FD is immediate cash
          liquidPortfolioAssets += val;
        } else if (h.daysToMaturity !== null && h.daysToMaturity <= 30) {
          // Maturing within 30 days: near-liquid (80% credit)
          liquidPortfolioAssets += val * 0.8;
        } else if (h.daysToMaturity !== null && h.daysToMaturity <= 90) {
          // Maturing within 90 days (70% credit)
          liquidPortfolioAssets += val * 0.7;
        } else {
          // Unmatured general FD subject to early withdrawal penalty & settlement delay (50% credit)
          liquidPortfolioAssets += val * 0.5;
        }
      } else if (h.type === "MUTUAL_FUND") {
        const isElss = h.subType?.toLowerCase().includes("elss") || h.name?.toLowerCase().includes("elss");
        if (!isElss) {
          const isLiquidFund =
            /liquid|overnight|money\s*market|cash|arbitrage/i.test(h.subType || "") ||
            /liquid|overnight|money\s*market|cash|arbitrage/i.test(h.name || "");
          liquidPortfolioAssets += val * (isLiquidFund ? 0.9 : 0.5);
        }
      } else if (
        h.type === "OTHER" &&
        (h.subType?.toLowerCase().includes("cash") ||
          h.subType?.toLowerCase().includes("savings") ||
          h.subType?.toLowerCase().includes("bank") ||
          h.name?.toLowerCase().includes("cash") ||
          h.name?.toLowerCase().includes("savings"))
      ) {
        liquidPortfolioAssets += val;
      }
    }

    // Deduplication check: if the emergency goal was explicitly backed by or named after a portfolio holding,
    // prevent double-counting that holding's value.
    let isGoalBackedByHolding = false;
    if (emergencyGoal) {
      const gTitle = emergencyGoal.title.toLowerCase();
      isGoalBackedByHolding = portfolioResult.holdings.some((h) => {
        const hName = h.name.toLowerCase();
        return (
          (hName.length >= 4 && gTitle.includes(hName)) ||
          (gTitle.includes("fixed deposit") && h.type === "FIXED_DEPOSIT") ||
          (gTitle.includes("fd") && h.type === "FIXED_DEPOSIT")
        );
      });
    }
    const effectiveLiquidAssets = isGoalBackedByHolding
      ? Math.max(0, liquidPortfolioAssets - (emergencyFundAmount || 0))
      : liquidPortfolioAssets;

    // Essential monthly living expenses
    const monthlyEssentialExpense = thisMonthDetailedTx
      .filter((t) => {
        if (t.type !== "EXPENSE") return false;
        const catName = t.category?.name?.toLowerCase() || "";
        return ESSENTIAL_CATEGORIES.has(catName) || /rent|bill|grocer|medic|hospital|emi|loan/.test(catName);
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const monthlyExpenseAvg =
      historicalExpense > 0 ? historicalExpense / 6 : expense > 0 ? expense : 0;

    // ========================================================================
    // 4. INVESTMENT DIVERSIFICATION
    // Only count supported asset types (Stocks, Mutual Funds, Gold, Fixed Deposits)
    // to avoid inflating the diversification score with legacy CRYPTO/BOND/OTHER records.
    // ========================================================================
    const activeHoldingsWithVal = portfolioResult.holdings.filter(
      (h) => SUPPORTED_TYPES_SET.has(h.type) && (h.currentValue ?? h.investedAmount ?? 0) > 0
    );
    const holdingTypesCount = new Set(activeHoldingsWithVal.map((h) => h.type)).size;
    const totalAssets = portfolioResult.holdings
      .filter((h) => SUPPORTED_TYPES_SET.has(h.type))
      .reduce(
        (s, h) => s + (h.currentValue ?? h.investedAmount ?? 0),
        0
      );

    // ========================================================================
    // 5. DEBT HEALTH (DO NOT ASSUME 0 DEBT IF MISSING)
    // ========================================================================
    const debtTransactions = thisMonthDetailedTx.filter((t) => {
      if (t.type !== "EXPENSE") return false;
      const catName = t.category?.name?.toLowerCase() || "";
      const desc = t.description?.toLowerCase() || "";
      return (
        catName.includes("loan") ||
        catName.includes("emi") ||
        catName.includes("debt") ||
        /\b(emi|loan|mortgage|repayment|credit card bill)\b/.test(desc)
      );
    });

    let monthlyDebtPayments: number | null = null;
    let totalDebt: number | null = null;

    if (debtTransactions.length > 0) {
      monthlyDebtPayments = debtTransactions.reduce((s, t) => s + Number(t.amount), 0);
    } else {
      // Check if user has debt categories in budgets
      const hasDebtBudget = budgets.some((b) =>
        b.category.name.toLowerCase().includes("loan") || b.category.name.toLowerCase().includes("emi")
      );
      if (hasDebtBudget) {
        monthlyDebtPayments = 0; // Explicitly budgeted debt but ₹0 paid this month
      } else {
        // Missing debt data -> keep null to avoid false assumption of zero debt
        monthlyDebtPayments = null;
        totalDebt = null;
      }
    }

    // ========================================================================
    // COMPUTE PRIMARY MONTHLY HEALTH SCORE
    // ========================================================================
    const monthlyScoreResult = computeHealthScore({
      income,
      expense,
      budgetLimit,
      budgetSpent,
      categoryBudgets,
      holdingTypesCount,
      holdings: holdingsItems,
      emergencyFundAmount,
      liquidPortfolioAssets: effectiveLiquidAssets,
      monthlyEssentialExpense,
      monthlyExpenseAvg,
      rollingSavingsRate,
      anomalousExpenseAmount,
      totalDebt,
      monthlyDebtPayments,
      totalAssets,
      period: "monthly",
    });

    // Compute previous month's score for delta (↑ +3 from last month)
    let delta = 0;
    if (prevMonthDetailedTx.length > 0) {
      const prevIncome = prevMonthDetailedTx
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + Number(t.amount), 0);
      const prevExpense = prevMonthDetailedTx
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + Number(t.amount), 0);

      const prevBudgetLimit = prevMonthBudgets.reduce((s, b) => s + Number(b.monthlyLimit), 0);
      const prevCategoryBudgets: CategoryBudgetDetail[] = prevMonthBudgets.map((b) => {
        const catSpent = prevMonthDetailedTx
          .filter((t) => t.type === "EXPENSE" && t.categoryId === b.categoryId)
          .reduce((s, t) => s + Number(t.amount), 0);
        return {
          name: b.category.name,
          limit: Number(b.monthlyLimit),
          spent: catSpent,
        };
      });

      const prevEssentialExpense = prevMonthDetailedTx
        .filter((t) => {
          if (t.type !== "EXPENSE") return false;
          const catName = t.category?.name?.toLowerCase() || "";
          return ESSENTIAL_CATEGORIES.has(catName) || /rent|bill|grocer|medic|hospital|emi|loan/.test(catName);
        })
        .reduce((s, t) => s + Number(t.amount), 0);

      const prevDebtTx = prevMonthDetailedTx.filter((t) => {
        if (t.type !== "EXPENSE") return false;
        const catName = t.category?.name?.toLowerCase() || "";
        const desc = t.description?.toLowerCase() || "";
        return (
          catName.includes("loan") ||
          catName.includes("emi") ||
          catName.includes("debt") ||
          /\b(emi|loan|mortgage|repayment|credit card bill)\b/.test(desc)
        );
      });
      const prevMonthlyDebtPayments = prevDebtTx.length > 0
        ? prevDebtTx.reduce((s, t) => s + Number(t.amount), 0)
        : (prevMonthBudgets.some((b) => b.category.name.toLowerCase().includes("loan") || b.category.name.toLowerCase().includes("emi")) ? 0 : null);

      const prevScoreResult = computeHealthScore({
        income: prevIncome,
        expense: prevExpense,
        budgetLimit: prevBudgetLimit,
        budgetSpent: prevExpense,
        categoryBudgets: prevCategoryBudgets,
        holdingTypesCount,
        holdings: holdingsItems,
        emergencyFundAmount,
        liquidPortfolioAssets: effectiveLiquidAssets,
        monthlyEssentialExpense: prevEssentialExpense,
        monthlyExpenseAvg,
        totalDebt: null,
        monthlyDebtPayments: prevMonthlyDebtPayments,
        totalAssets,
        period: "monthly",
      });

      delta = monthlyScoreResult.score - prevScoreResult.score;
    }
    monthlyScoreResult.delta = delta;

    // ========================================================================
    // WEEKLY MONITORING (MONITORING ENGINE)
    // ========================================================================
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const weeksInMonth = [
      { num: 1, startDay: 1, endDay: 7 },
      { num: 2, startDay: 8, endDay: 14 },
      { num: 3, startDay: 15, endDay: 21 },
      { num: 4, startDay: 22, endDay: 28 },
      ...(daysInMonth > 28 ? [{ num: 5, startDay: 29, endDay: daysInMonth }] : []),
    ];

    let targetWeekNum = week || 1;
    if (!week) {
      if (currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1) {
        const today = now.getDate();
        const activeW = weeksInMonth.find((w) => today >= w.startDay && today <= w.endDay);
        targetWeekNum = activeW ? activeW.num : weeksInMonth[weeksInMonth.length - 1].num;
      } else {
        targetWeekNum = weeksInMonth[weeksInMonth.length - 1].num;
      }
    }

    const selectedWeekMeta = weeksInMonth.find((w) => w.num === targetWeekNum) || weeksInMonth[0];
    const weekStartDate = new Date(currentYear, currentMonth - 1, selectedWeekMeta.startDay);
    const weekEndDate = new Date(currentYear, currentMonth - 1, selectedWeekMeta.endDay, 23, 59, 59);

    const weekTx = thisMonthDetailedTx.filter((t) => {
      const d = new Date(t.date);
      return d >= weekStartDate && d <= weekEndDate;
    });

    const weeklyIncome = weekTx
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + Number(t.amount), 0);

    const weeklyExpense = weekTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + Number(t.amount), 0);

    let prevWeekExpense: number | null = null;
    if (selectedWeekMeta.num > 1) {
      const prevWeekMeta = weeksInMonth[selectedWeekMeta.num - 2];
      const pwStart = new Date(currentYear, currentMonth - 1, prevWeekMeta.startDay);
      const pwEnd = new Date(currentYear, currentMonth - 1, prevWeekMeta.endDay, 23, 59, 59);
      prevWeekExpense = thisMonthDetailedTx
        .filter((t) => {
          const d = new Date(t.date);
          return t.type === "EXPENSE" && d >= pwStart && d <= pwEnd;
        })
        .reduce((s, t) => s + Number(t.amount), 0);
    }

    // Month-to-date expenses up to this week
    // If category budgets are configured, measure month-to-date expenses for budgeted categories to prevent denominator mismatch
    const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
    const mtdBudgetedExpense = thisMonthDetailedTx
      .filter((t) => {
        const d = new Date(t.date);
        return t.type === "EXPENSE" && d <= weekEndDate && (budgets.length === 0 || budgetedCategoryIds.has(t.categoryId));
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const weeklyCatMap: Record<string, number> = {};
    for (const t of weekTx) {
      if (t.type === "EXPENSE") {
        const cName = t.category?.name || "Other";
        weeklyCatMap[cName] = (weeklyCatMap[cName] || 0) + Number(t.amount);
      }
    }
    const weeklyTopCategories = Object.entries(weeklyCatMap)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);

    const weeklyAnomalies = anomalies.filter((a) => {
      if (!a.transactionId) return false;
      const tx = weekTx.find((t) => t.id === a.transactionId);
      return Boolean(tx);
    });

    const isCurrentActiveMonth =
      currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;
    const effectiveDaysPassed = isCurrentActiveMonth && now < weekEndDate
      ? Math.min(now.getDate(), selectedWeekMeta.endDay)
      : selectedWeekMeta.endDay;

    const weeklyMonitoringResult = computeWeeklyMonitoring({
      weekNumber: targetWeekNum,
      weekStart: weekStartDate,
      weekEnd: weekEndDate,
      weeklyIncome,
      weeklyExpense,
      prevWeekExpense,
      monthlyBudgetLimit: budgetLimit,
      monthToDateExpense: mtdBudgetedExpense,
      daysPassedInMonth: effectiveDaysPassed,
      totalDaysInMonth: daysInMonth,
      topCategories: weeklyTopCategories,
      weeklyAnomaliesCount: weeklyAnomalies.length,
    });

    const weeklyTrend = weeksInMonth.map((w) => {
      const wStart = new Date(currentYear, currentMonth - 1, w.startDay);
      const wEnd = new Date(currentYear, currentMonth - 1, w.endDay, 23, 59, 59);
      const txs = thisMonthDetailedTx.filter((t) => {
        const d = new Date(t.date);
        return d >= wStart && d <= wEnd;
      });
      const inc = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
      const exp = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
      return {
        weekNumber: w.num,
        label: `W${w.num} (${w.startDay}–${w.endDay})`,
        income: Math.round(inc),
        expense: Math.round(exp),
        netCashFlow: Math.round(inc - exp),
      };
    });

    // ========================================================================
    // YEARLY: FINANCIAL PROGRESS & CANONICAL YEARLY SCORE
    // ========================================================================
    const monthGroups: Record<number, typeof fullYearTx> = {};
    for (const t of fullYearTx) {
      const m = new Date(t.date).getMonth() + 1;
      monthGroups[m] = monthGroups[m] || [];
      monthGroups[m].push(t);
    }

    const recordedMonths = Object.keys(monthGroups)
      .map(Number)
      .sort((a, b) => a - b);

    const monthlySnapshots: YearlyProgressMonthSnapshot[] = [];

    for (const m of recordedMonths) {
      const txs = monthGroups[m];
      const mIncome = txs
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + Number(t.amount), 0);
      const mExpense = txs
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + Number(t.amount), 0);

      const mBudgets = fullYearBudgets.filter((b) => b.month === m);
      const mBudgetLimit = mBudgets.reduce((s, b) => s + Number(b.monthlyLimit), 0);
      const mCategoryBudgets: CategoryBudgetDetail[] = mBudgets.map((b) => {
        const catSpent = txs
          .filter((t) => t.type === "EXPENSE" && t.categoryId === b.categoryId)
          .reduce((s, t) => s + Number(t.amount), 0);
        return {
          name: b.category.name,
          limit: Number(b.monthlyLimit),
          spent: catSpent,
        };
      });
      const mBudgetSpent = mCategoryBudgets.reduce((s, c) => s + c.spent, 0);

      const mEssentialExpense = txs
        .filter((t) => {
          if (t.type !== "EXPENSE") return false;
          const catName = t.category?.name?.toLowerCase() || "";
          return ESSENTIAL_CATEGORIES.has(catName) || /rent|bill|grocer|medic|hospital|emi|loan/.test(catName);
        })
        .reduce((s, t) => s + Number(t.amount), 0);

      const mScore = computeHealthScore({
        income: mIncome,
        expense: mExpense,
        budgetLimit: mBudgetLimit,
        budgetSpent: mBudgetSpent,
        categoryBudgets: mCategoryBudgets,
        holdingTypesCount,
        holdings: holdingsItems,
        emergencyFundAmount,
        liquidPortfolioAssets: effectiveLiquidAssets,
        monthlyEssentialExpense: mEssentialExpense,
        monthlyExpenseAvg: mExpense,
        totalAssets,
        period: "monthly",
      });

      monthlySnapshots.push({
        month: m,
        monthName: MONTH_NAMES[m - 1],
        score: mScore.score,
        savingsRate: mIncome > 0 ? Math.round(((mIncome - mExpense) / mIncome) * 100) : 0,
        netCashFlow: Math.round(mIncome - mExpense),
      });
    }

    // Emergency fund growth this year
    const emergencyFundGrowthAmount = emergencyGoal
      ? emergencyContributions
          .filter((c) => c.goalId === emergencyGoal.id)
          .reduce((s, c) => s + Number(c.amount), 0)
      : null;

    // Savings growth rate (first half vs second half)
    let savingsGrowthPct: number | null = null;
    if (monthlySnapshots.length >= 2) {
      const mid = Math.floor(monthlySnapshots.length / 2);
      const firstHalf = monthlySnapshots.slice(0, mid);
      const secondHalf = monthlySnapshots.slice(mid);

      const avgSavingsFirst =
        firstHalf.reduce((s, m) => s + m.savingsRate, 0) / Math.max(1, firstHalf.length);
      const avgSavingsSecond =
        secondHalf.reduce((s, m) => s + m.savingsRate, 0) / Math.max(1, secondHalf.length);

      savingsGrowthPct = Math.round(avgSavingsSecond - avgSavingsFirst);
    }

    // Reliable budget adherence trend computed across recorded months with budgets
    let budgetAdherenceTrend: "improving" | "stable" | "declining" | "insufficient_data" = "insufficient_data";
    const snapshotsWithBudgets = monthlySnapshots.filter((m) => {
      const mBudgets = fullYearBudgets.filter((b) => b.month === m.month);
      return mBudgets.length > 0;
    });
    if (snapshotsWithBudgets.length >= 2) {
      const mid = Math.floor(snapshotsWithBudgets.length / 2);
      const earlyHalf = snapshotsWithBudgets.slice(0, mid);
      const lateHalf = snapshotsWithBudgets.slice(mid);
      const earlyAvg = earlyHalf.reduce((s, m) => s + m.score, 0) / earlyHalf.length;
      const lateAvg = lateHalf.reduce((s, m) => s + m.score, 0) / lateHalf.length;
      if (lateAvg - earlyAvg >= 3) budgetAdherenceTrend = "improving";
      else if (earlyAvg - lateAvg >= 3) budgetAdherenceTrend = "declining";
      else budgetAdherenceTrend = "stable";
    } else if (snapshotsWithBudgets.length === 1) {
      budgetAdherenceTrend = "stable";
    }

    // Reliable debt reduction computed across recorded months
    let debtReductionPct: number | null = null;
    const debtMonths = recordedMonths.filter((m) => {
      const txs = monthGroups[m];
      return txs.some((t) => {
        if (t.type !== "EXPENSE") return false;
        const catName = t.category?.name?.toLowerCase() || "";
        const desc = t.description?.toLowerCase() || "";
        return (
          catName.includes("loan") ||
          catName.includes("emi") ||
          catName.includes("debt") ||
          /\b(emi|loan|mortgage|repayment|credit card bill)\b/.test(desc)
        );
      });
    });
    if (debtMonths.length >= 2) {
      const mid = Math.floor(debtMonths.length / 2);
      const earlyMonths = debtMonths.slice(0, mid);
      const lateMonths = debtMonths.slice(mid);
      const earlyDebtSum =
        earlyMonths.reduce((sum, m) => {
          return (
            sum +
            monthGroups[m]
              .filter(
                (t) =>
                  t.type === "EXPENSE" &&
                  (t.category?.name?.toLowerCase().includes("loan") ||
                    t.category?.name?.toLowerCase().includes("emi") ||
                    t.category?.name?.toLowerCase().includes("debt"))
              )
              .reduce((s, t) => s + Number(t.amount), 0)
          );
        }, 0) / earlyMonths.length;
      const lateDebtSum =
        lateMonths.reduce((sum, m) => {
          return (
            sum +
            monthGroups[m]
              .filter(
                (t) =>
                  t.type === "EXPENSE" &&
                  (t.category?.name?.toLowerCase().includes("loan") ||
                    t.category?.name?.toLowerCase().includes("emi") ||
                    t.category?.name?.toLowerCase().includes("debt"))
              )
              .reduce((s, t) => s + Number(t.amount), 0)
          );
        }, 0) / lateMonths.length;

      if (earlyDebtSum > 0) {
        debtReductionPct = Math.round(((earlyDebtSum - lateDebtSum) / earlyDebtSum) * 100);
      }
    }

    const yearlyProgressResult = computeYearlyProgress({
      year: currentYear,
      monthlySnapshots,
      savingsGrowthPct,
      emergencyFundGrowthAmount,
      debtReductionPct,
      investmentGrowthPct: portfolioResult.summary.returnsPct || null,
      goalsAchievedCount: goals.filter((g) => {
        const saved = g.contributions.reduce((s, c) => s + Number(c.amount), 0);
        return saved >= Number(g.targetAmount);
      }).length,
      totalGoalsCount: goals.length,
      budgetAdherenceTrend,
    });

    // ========================================================================
    // CANONICAL FULL-YEAR FINANCIAL HEALTH SCORE
    // ========================================================================
    const yearlyIncome = fullYearTx
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + Number(t.amount), 0);

    const yearlyExpense = fullYearTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + Number(t.amount), 0);

    const activeMonthsCount = Math.max(1, recordedMonths.length);
    const yearlyMonthlyExpenseAvg = yearlyExpense / activeMonthsCount;

    // Full-year budget aggregation by category
    const fullYearCatMap: Record<number, { name: string; limit: number; spent: number }> = {};
    for (const b of fullYearBudgets) {
      if (!fullYearCatMap[b.categoryId]) {
        fullYearCatMap[b.categoryId] = { name: b.category.name, limit: 0, spent: 0 };
      }
      fullYearCatMap[b.categoryId].limit += Number(b.monthlyLimit);
    }
    for (const t of fullYearTx) {
      if (t.type === "EXPENSE" && fullYearCatMap[t.categoryId]) {
        fullYearCatMap[t.categoryId].spent += Number(t.amount);
      }
    }
    const yearlyCategoryBudgets: CategoryBudgetDetail[] = Object.values(fullYearCatMap);
    const yearlyBudgetLimit = yearlyCategoryBudgets.reduce((s, c) => s + c.limit, 0);
    const yearlyBudgetSpent = yearlyCategoryBudgets.reduce((s, c) => s + c.spent, 0);

    const yearlyEssentialExpenseTotal = fullYearTx
      .filter((t) => {
        if (t.type !== "EXPENSE") return false;
        const catName = t.category?.name?.toLowerCase() || "";
        return ESSENTIAL_CATEGORIES.has(catName) || /rent|bill|grocer|medic|hospital|emi|loan/.test(catName);
      })
      .reduce((s, t) => s + Number(t.amount), 0);
    const yearlyMonthlyEssential = yearlyEssentialExpenseTotal / activeMonthsCount;

    const yearlyDebtTx = fullYearTx.filter((t) => {
      if (t.type !== "EXPENSE") return false;
      const catName = t.category?.name?.toLowerCase() || "";
      const desc = t.description?.toLowerCase() || "";
      return (
        catName.includes("loan") ||
        catName.includes("emi") ||
        catName.includes("debt") ||
        /\b(emi|loan|mortgage|repayment|credit card bill)\b/.test(desc)
      );
    });
    const yearlyMonthlyDebt = yearlyDebtTx.length > 0
      ? yearlyDebtTx.reduce((s, t) => s + Number(t.amount), 0) / activeMonthsCount
      : (fullYearBudgets.some((b) => b.category.name.toLowerCase().includes("loan") || b.category.name.toLowerCase().includes("emi")) ? 0 : null);

    const yearlyScoreResult = computeHealthScore({
      income: yearlyIncome,
      expense: yearlyExpense,
      budgetLimit: yearlyBudgetLimit,
      budgetSpent: yearlyBudgetSpent,
      categoryBudgets: yearlyCategoryBudgets,
      holdingTypesCount,
      holdings: holdingsItems,
      emergencyFundAmount,
      liquidPortfolioAssets: effectiveLiquidAssets,
      monthlyEssentialExpense: yearlyMonthlyEssential,
      monthlyExpenseAvg: yearlyMonthlyExpenseAvg,
      totalAssets,
      totalDebt: null,
      monthlyDebtPayments: yearlyMonthlyDebt,
      period: "yearly",
    });

    // ========================================================================
    // RETURN CONSOLIDATED RESPONSE ALIGNED WITH SELECTED PERIOD
    // ========================================================================
    const isYearlyMode = period === "yearly";
    const activeScoreResult = isYearlyMode ? yearlyScoreResult : monthlyScoreResult;
    const activeIncome = isYearlyMode ? yearlyIncome : income;
    const activeExpense = isYearlyMode ? yearlyExpense : expense;
    const activeBudgetLimit = isYearlyMode ? yearlyBudgetLimit : budgetLimit;
    const activeBudgetSpent = isYearlyMode ? yearlyBudgetSpent : budgetSpent;
    const activeSavingsRateRaw = activeIncome > 0 ? (activeIncome - activeExpense) / activeIncome : 0;
    const activeDelta = isYearlyMode ? (yearlyProgressResult.pointsSinceStart ?? 0) : monthlyScoreResult.delta;

    const recommendations = buildHealthRecommendations({
      period,
      income: activeIncome,
      expense: activeExpense,
      budgetLimit: activeBudgetLimit,
      budgetSpent: activeBudgetSpent,
      anomaliesCount: isYearlyMode ? 0 : anomalies.length,
      emergencyFundAmount,
      holdingTypesCount,
      savingsRateRaw: activeSavingsRateRaw,
      score: activeScoreResult.score,
    });

    return {
      // Top-level fields guarantee 100% backward compatibility and match selected period
      score: activeScoreResult.score,
      rating: activeScoreResult.rating,
      delta: activeDelta,
      breakdown: activeScoreResult.breakdown,
      componentDetails: activeScoreResult.componentDetails,
      confidence: activeScoreResult.confidence,
      explainability: activeScoreResult.explainability,
      recommendations,
      anomalies,

      // Dedicated Modules for UI views
      monthly: {
        ...monthlyScoreResult,
        month: currentMonth,
        monthName: MONTH_NAMES[currentMonth - 1],
        year: currentYear,
        income: Math.round(income),
        expense: Math.round(expense),
        netCashFlow: Math.round(income - expense),
        budgetLimit: Math.round(budgetLimit),
        budgetSpent: Math.round(budgetSpent),
        categoryBudgets,
        liquidPortfolioAssets: Math.round(effectiveLiquidAssets),
        essentialExpenses: Math.round(monthlyEssentialExpense),
        emergencyMonthsCovered: monthlyScoreResult.componentDetails?.emergencyFund.displayValue,
      },

      weekly: {
        ...weeklyMonitoringResult,
        selectedWeek: targetWeekNum,
        weeksInMonth: weeksInMonth.map((w) => w.num),
        weeklyTrend,
        month: currentMonth,
        year: currentYear,
      },

      yearly: yearlyProgressResult,
    };
  },
};
