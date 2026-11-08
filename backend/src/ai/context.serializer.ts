import { budgetService } from "@/services/budget.service";
import { transactionService } from "@/services/transaction.service";
import { healthScoreService } from "@/services/healthScore.service";
import { portfolioService } from "@/services/portfolio.service";
import { recommendationService } from "@/services/recommendation.service";
import { goalService } from "@/services/goal.service";

// ── Types ────────────────────────────────────────────────────────────────────

interface BudgetEntry {
  category: string;
  remaining: number;
  monthlyLimit: number;
  status: string;
}

interface TxEntry {
  date: Date | string;
  amount: number;
  type: string;
  description: string | null;
  category: string;
}

interface ActionableHolding {
  name: string;
  type: string;
  gainPct: number;
  concentrationPct: number;
  valuationSource?: string;
}

interface GoalSummary {
  title: string;
  targetAmount: number;
  savedAmount: number;
  progressPct: number;
  isEmergencyFund: boolean;
}

interface FinancialContext {
  budgets: BudgetEntry[];
  recentTxns: TxEntry[];
  healthScore: number;
  healthRating: string;
  healthPillars: {
    savings: string;
    budget: string;
    investments: string;
    emergency: string;
    debt: string;
  };
  topRecommendations: string[];
  income: number;
  expense: number;
  topCategories: Array<{ category: string; amount: number }>;
  goals: GoalSummary[];
  availableSavings: number;
  portfolioSummary: {
    totalInvested: number;
    totalKnownCurrent: number | null;
    unpricedCount: number;
  };
  actionableHoldings: ActionableHolding[];
  riskPlan?: any;
}

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetches the complete, authenticated user financial snapshot for FinAI.
 * Runs parallel queries and clearly distinguishes missing values from actual 0.
 */
export async function buildFinancialContext(userId: number): Promise<FinancialContext> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [budgetsRaw, summaryRaw, healthRaw, portfolioRaw, savedPlanRaw, goalsRaw, availableSavingsRaw] = await Promise.all([
    budgetService.list(userId, { month, year }),
    transactionService.summary(userId, { month, year }),
    healthScoreService.compute(userId, { month, year }),
    portfolioService.list(userId),
    recommendationService.getSavedPlan(userId).catch(() => null),
    goalService.list(userId).catch(() => []),
    goalService.getAvailableSavings(userId).catch(() => 0),
  ]);

  // Last 5 transactions
  const txList = await transactionService.list(userId, {});
  const recentTxns: TxEntry[] = txList.slice(0, 5).map((t) => ({
    date: t.date,
    amount: Number(t.amount),
    type: t.type,
    description: t.description,
    category: t.category?.name ?? "Unknown",
  }));

  const budgets: BudgetEntry[] = budgetsRaw.map((b) => ({
    category: b.category.name,
    remaining: Number(b.remaining),
    monthlyLimit: Number(b.monthlyLimit),
    status: b.status,
  }));

  // Top spending categories this month
  const topCategories = Object.entries(summaryRaw.byCategory || {})
    .filter(([_, amt]) => (amt as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 4)
    .map(([category, amount]) => ({ category, amount: Number(amount) }));

  // Goals
  const goals: GoalSummary[] = (goalsRaw || []).map((g: any) => ({
    title: g.title,
    targetAmount: Number(g.targetAmount),
    savedAmount: Number(g.contributed ?? g.savedAmount ?? 0),
    progressPct: Number(g.progressPct ?? 0),
    isEmergencyFund: Boolean(g.isEmergencyFund),
  }));

  // Build actionable holdings with known current valuation
  const totalCurrent = portfolioRaw.summary.totalCurrent ?? 0;
  const actionableHoldings: ActionableHolding[] = portfolioRaw.holdings
    .filter((h) => h.investedAmount !== null && h.currentValue !== null)
    .map((h) => {
      const invested = h.investedAmount as number;
      const current = h.currentValue as number;
      const gainPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
      const concentrationPct = totalCurrent > 0 ? (current / totalCurrent) * 100 : 0;
      return {
        name: h.name,
        type: h.type,
        gainPct: Math.round(gainPct * 10) / 10,
        concentrationPct: Math.round(concentrationPct * 10) / 10,
        valuationSource: h.valuationSource,
      };
    })
    .sort((a, b) => b.concentrationPct - a.concentrationPct);

  // Health pillars formatting distinguishing missing from 0
  const details = healthRaw.componentDetails;
  const healthPillars = {
    savings: details?.savingsRate
      ? `${details.savingsRate.score}/100 (${details.savingsRate.displayValue})`
      : "Unavailable (no income/savings recorded yet)",
    budget: details?.budgetDiscipline?.score !== null && details?.budgetDiscipline?.score !== undefined
      ? `${details.budgetDiscipline.score}/100`
      : "Unavailable (no budgets set yet)",
    investments: details?.diversification?.score !== null && details?.diversification?.score !== undefined
      ? `${details.diversification.score}/100 (${details.diversification.displayValue})`
      : "Unavailable (no investment holdings recorded)",
    emergency: details?.emergencyFund?.score !== null && details?.emergencyFund?.score !== undefined
      ? `${details.emergencyFund.score}/100 (${details.emergencyFund.displayValue})`
      : "Unavailable (no emergency fund goal designated)",
    debt: details?.debtRatio?.score !== null && details?.debtRatio?.score !== undefined
      ? `${details.debtRatio.score}/100 (${details.debtRatio.displayValue})`
      : "Unavailable (no debt obligations reported)",
  };

  const topRecommendations = (healthRaw.explainability?.topActions || [])
    .slice(0, 3)
    .map((a: any) => `${a.title}: ${a.action}`);

  return {
    budgets,
    recentTxns,
    healthScore: healthRaw.score ?? 0,
    healthRating: healthRaw.rating ?? "Good",
    healthPillars,
    topRecommendations,
    income: summaryRaw.income ?? 0,
    expense: summaryRaw.expense ?? 0,
    topCategories,
    goals,
    availableSavings: Number(availableSavingsRaw || 0),
    portfolioSummary: {
      totalInvested: portfolioRaw.summary.totalInvested ?? 0,
      totalKnownCurrent: portfolioRaw.summary.totalCurrent,
      unpricedCount: portfolioRaw.summary.unpricedCount ?? 0,
    },
    actionableHoldings,
    riskPlan: savedPlanRaw,
  };
}

// ── Serialize ────────────────────────────────────────────────────────────────

/**
 * Converts a FinancialContext into a compact, human-readable string.
 * Distinguishes missing metrics from 0 so the model never fabricates numbers.
 */
export function serializeContext(ctx: FinancialContext): string {
  const lines: string[] = [];

  // Cash Flow & Monthly Totals
  const savings = ctx.income - ctx.expense;
  const savingsPfx = savings >= 0 ? "+" : "";
  lines.push(
    `Income: ₹${fmt(ctx.income)} | Expenses: ₹${fmt(ctx.expense)} | Net Savings: ${savingsPfx}₹${fmt(savings)}`
  );

  // Financial Health Score & 5 Pillars
  lines.push(
    `Financial Health Score: ${ctx.healthScore}/100 (Rating: ${ctx.healthRating})`
  );
  lines.push(
    `Health Pillars: Savings: ${ctx.healthPillars.savings} | Budget: ${ctx.healthPillars.budget} | Emergency: ${ctx.healthPillars.emergency} | Investments: ${ctx.healthPillars.investments} | Debt: ${ctx.healthPillars.debt}`
  );

  // Top Recommendations
  if (ctx.topRecommendations.length > 0) {
    lines.push(`Top Actionable Priorities: ${ctx.topRecommendations.join(" | ")}`);
  }

  // Portfolio Overview
  const knownValStr = ctx.portfolioSummary.totalKnownCurrent !== null
    ? `₹${fmt(ctx.portfolioSummary.totalKnownCurrent)}`
    : "Not Yet Valued";
  const unpricedNote = ctx.portfolioSummary.unpricedCount > 0
    ? ` (${ctx.portfolioSummary.unpricedCount} asset(s) awaiting current valuation)`
    : "";
  lines.push(
    `Investments & Assets: Invested: ₹${fmt(ctx.portfolioSummary.totalInvested)} | Known Current Value: ${knownValStr}${unpricedNote}`
  );

  // Risk Profile & Investment Recommendations
  if (ctx.riskPlan) {
    lines.push(
      `Risk Profile: Selected ${ctx.riskPlan.selectedRiskLevel} Risk (Assessed: ${ctx.riskPlan.computedRiskProfile} Risk, Score: ${ctx.riskPlan.computedRiskScore}/100, Capacity: ${ctx.riskPlan.riskCapacity}, Horizon: ${ctx.riskPlan.investmentHorizon})`
    );
    if (ctx.riskPlan.allocations && ctx.riskPlan.allocations.length > 0) {
      const allocSummary = ctx.riskPlan.allocations
        .map((a: any) => `${a.name}: ${a.percentage}% (₹${fmt(a.amount)})`)
        .join(" | ");
      lines.push(`Saved Investment Plan: ${allocSummary}`);
    }
  }

  // Top Expense Categories This Month
  if (ctx.topCategories && ctx.topCategories.length > 0) {
    const catParts = ctx.topCategories.map((c) => `${c.category}: ₹${fmt(c.amount)}`);
    lines.push(`Top Expense Categories (This Month): ${catParts.join(" | ")}`);
  }

  // Financial Goals & Emergency Fund
  if (ctx.goals && ctx.goals.length > 0) {
    const goalParts = ctx.goals.map((g) => {
      const em = g.isEmergencyFund ? " [Emergency Reserve]" : "";
      return `${g.title}${em}: ₹${fmt(g.savedAmount)} of ₹${fmt(g.targetAmount)} (${g.progressPct.toFixed(0)}%)`;
    });
    lines.push(`Savings Goals: ${goalParts.join(" | ")}`);
  } else {
    lines.push("Savings Goals: No dedicated goals configured yet");
  }

  // Liquid Savings / Buffer
  if (ctx.availableSavings > 0) {
    lines.push(`Unallocated Liquid Savings Buffer: ₹${fmt(ctx.availableSavings)}`);
  }

  // Budgets
  if (ctx.budgets.length > 0) {
    const budgetParts = ctx.budgets.map((b) => {
      const flag = b.status === "OVER_BUDGET" ? " 🔴 Over" : b.status === "WARNING" ? " 🟡 Near Limit" : "";
      return `${b.category} (₹${fmt(b.remaining)} left / ₹${fmt(b.monthlyLimit)}${flag})`;
    });
    lines.push(`Budgets: ${budgetParts.join(" | ")}`);
  } else {
    lines.push("Budgets: None set for this month");
  }

  // Recent Transactions
  if (ctx.recentTxns.length > 0) {
    const txParts = ctx.recentTxns.map((t) => {
      const sign = t.type === "INCOME" ? "+" : "-";
      const desc = t.description ? ` "${t.description}"` : "";
      const dateStr = new Date(t.date).toISOString().split("T")[0];
      return `[${sign}₹${fmt(t.amount)} ${t.category}${desc} ${dateStr}]`;
    });
    lines.push(`Recent Transactions: ${txParts.join(" ")}`);
  } else {
    lines.push("Recent Transactions: None recorded");
  }

  // Valued Holdings
  if (ctx.actionableHoldings.length > 0) {
    const holdingParts = ctx.actionableHoldings.slice(0, 6).map((h) => {
      const gainSign = h.gainPct >= 0 ? "+" : "−";
      return `[${h.name} (${h.type}): ${gainSign}${Math.abs(h.gainPct).toFixed(1)}% return, ${h.concentrationPct.toFixed(1)}% allocation]`;
    });
    lines.push(`Key Assets: ${holdingParts.join(" ")}`);
  }

  return lines.join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
