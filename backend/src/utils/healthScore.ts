/**
 * Financial Health & Decision-Support System
 *
 * Evaluates 5 core pillars of personal financial resilience:
 *   1. Savings & Cash Flow          (30%)
 *   2. Budget Management            (20%)
 *   3. Emergency Fund & Resilience  (20%)
 *   4. Investment Diversification   (20%)
 *   5. Debt Health                  (10%)
 *
 * Key Principles:
 *   - Missing data (e.g. debt, emergency fund, budgets) is never assumed to be 0.
 *     Weights dynamically redistribute across available components.
 *   - Diversification accounts for asset concentration (Herfindahl Index), not just count.
 *   - Emergency fund combines dedicated goal savings + liquid portfolio assets
 *     measured against essential living expenses.
 *   - Budget discipline penalizes category-level overspending even if total budget is met.
 *   - Multi-month smoothing buffers isolated one-off expense spikes from destroying health score.
 *   - Explainable: provides confidence rating, strengths, weaknesses, and top 1–3 prioritized actions.
 */

export interface CategoryBudgetDetail {
  name: string;
  limit: number;
  spent: number;
}

export interface HoldingItem {
  type: string; // "STOCK" | "MUTUAL_FUND" | "CRYPTO" | "GOLD" | "FIXED_DEPOSIT" | string
  value: number;
}

export interface HealthScoreInput {
  income: number;
  expense: number;
  budgetLimit: number;
  budgetSpent: number;
  categoryBudgets?: CategoryBudgetDetail[];
  holdingTypesCount?: number;
  holdings?: HoldingItem[];
  emergencyFundAmount?: number | null;
  liquidPortfolioAssets?: number;
  monthlyEssentialExpense?: number;
  monthlyExpenseAvg?: number;
  rollingSavingsRate?: number | null;
  anomalousExpenseAmount?: number;
  totalDebt?: number | null;
  monthlyDebtPayments?: number | null;
  totalAssets?: number;
  period?: string;
}

export interface ActionItem {
  rank: number;
  title: string;
  action: string;
  impact: string;
  target?: string;
  priority: "High" | "Medium" | "Low";
}

export interface ComponentBreakdownDetail {
  score: number | null;
  displayValue: string;
  status: "excellent" | "good" | "fair" | "warning" | "unavailable";
  explanation: string;
}

export interface HealthScoreResult {
  score: number;
  rating: "Excellent" | "Good" | "Fair" | "Needs Attention";
  delta?: number;
  breakdown: {
    savingsRate: number | null;
    budgetDiscipline: number | null;
    diversification: number | null;
    emergencyFund: number | null;
    debtRatio: number | null;
  };
  componentDetails?: {
    savingsRate: ComponentBreakdownDetail;
    budgetDiscipline: ComponentBreakdownDetail;
    diversification: ComponentBreakdownDetail;
    emergencyFund: ComponentBreakdownDetail;
    debtRatio: ComponentBreakdownDetail;
  };
  confidence: {
    score: number;
    level: "High" | "Moderate" | "Partial";
    trackedMetrics: string[];
    missingMetrics: string[];
  };
  explainability: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    topActions: ActionItem[];
  };
}

export interface WeeklyMonitoringInput {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  weeklyIncome: number;
  weeklyExpense: number;
  prevWeekExpense?: number | null;
  monthlyBudgetLimit: number;
  monthToDateExpense: number;
  daysPassedInMonth: number;
  totalDaysInMonth: number;
  topCategories?: Array<{ name: string; amount: number }>;
  weeklyAnomaliesCount?: number;
}

export interface WeeklyMonitoringResult {
  income: number;
  expenses: number;
  netCashFlow: number;
  budgetUsage: {
    monthToDateExpense: number;
    monthlyBudgetLimit: number;
    usagePct: number;
    pacingStatus: "on_track" | "ahead_of_budget" | "under_budget" | "no_budget";
    pacingMessage: string;
  };
  weekOverWeek: {
    changePct: number | null;
    direction: "increased" | "decreased" | "stable" | "insufficient_history";
    summary: string;
  };
  unusualSpending: {
    count: number;
    summary: string;
  };
  alerts: string[];
  categoryBreakdown: Array<{ name: string; amount: number }>;
}

export interface YearlyProgressMonthSnapshot {
  month: number;
  monthName: string;
  score: number;
  savingsRate: number;
  netCashFlow: number;
}

export interface YearlyProgressInput {
  year: number;
  monthlySnapshots: YearlyProgressMonthSnapshot[];
  savingsGrowthPct?: number | null;
  emergencyFundGrowthAmount?: number | null;
  debtReductionPct?: number | null;
  investmentGrowthPct?: number | null;
  goalsAchievedCount?: number;
  totalGoalsCount?: number;
  budgetAdherenceTrend?: "improving" | "stable" | "declining" | "insufficient_data";
}

export interface YearlyProgressResult {
  year: number;
  isDataSufficient: boolean;
  insufficientDataReason?: string;
  progressScore: number | null;
  rating?: "Accelerating" | "Steady Progress" | "Moderate" | "Needs Attention";
  pointsSinceStart?: number | null;
  startMonthName?: string;
  monthlyTrajectory: YearlyProgressMonthSnapshot[];
  pillars: {
    savingsGrowth: { score: number | null; label: string; metric: string };
    emergencyResilience: { score: number | null; label: string; metric: string };
    debtReduction: { score: number | null; label: string; metric: string };
    investmentGrowth: { score: number | null; label: string; metric: string };
    goalProgress: { score: number | null; label: string; metric: string };
    budgetDisciplineTrend: { score: number | null; label: string; metric: string };
  };
  narrativeSummary: string[];
}

export const WEIGHTS = {
  savingsRate: 0.3,
  budgetDiscipline: 0.2,
  diversification: 0.2,
  emergencyFund: 0.2,
  debtRatio: 0.1,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ============================================================================
// 1. SAVINGS & CASH FLOW
// ============================================================================
export function evaluateSavingsAndCashFlow(
  income: number,
  expense: number,
  rollingSavingsRate?: number | null,
  anomalousExpenseAmount = 0
) {
  // If neither income nor expense is reported (no cash flow recorded at all)
  if (income <= 0 && expense <= 0) {
    return {
      score: null,
      isAvailable: false,
      rawRate: null,
      effectiveRate: null,
      netCashFlow: 0,
    };
  }

  const hasIncome = income > 0;
  const currentSavingsRateRaw = hasIncome ? (income - expense) / income : (expense > 0 ? -1 : 0);
  const netCashFlow = income - expense;

  // Multi-month smoothing: if a one-off anomaly was detected, grant partial relief so an isolated spike doesn't crater the score
  let effectiveSavingsRate = currentSavingsRateRaw;
  if (anomalousExpenseAmount > 0 && hasIncome) {
    const adjustedExpense = Math.max(0, expense - anomalousExpenseAmount * 0.7);
    const adjustedRate = (income - adjustedExpense) / income;
    effectiveSavingsRate = Math.max(currentSavingsRateRaw, adjustedRate);
  }

  // Blend with rolling historical baseline if available (60% current, 40% rolling)
  if (rollingSavingsRate !== undefined && rollingSavingsRate !== null) {
    effectiveSavingsRate = 0.6 * effectiveSavingsRate + 0.4 * rollingSavingsRate;
  }

  let score = 0;
  if (effectiveSavingsRate >= 0.2) {
    // 20%+ is recommended ideal benchmark -> 100
    score = 100;
  } else if (effectiveSavingsRate >= 0.1) {
    // 10% - 20% -> scores 65 to 99
    score = 65 + ((effectiveSavingsRate - 0.1) / 0.1) * 34;
  } else if (effectiveSavingsRate >= 0) {
    // 0% - 10% -> scores 25 to 64
    score = 25 + (effectiveSavingsRate / 0.1) * 39;
  } else {
    // Negative cash flow (spending > income)
    if (rollingSavingsRate !== undefined && rollingSavingsRate !== null && rollingSavingsRate > 0.15) {
      score = 20;
    } else {
      score = Math.max(0, 15 + Math.round(effectiveSavingsRate * 20));
    }
  }

  return {
    score: Math.round(score),
    isAvailable: true,
    rawRate: hasIncome ? currentSavingsRateRaw : null,
    effectiveRate: effectiveSavingsRate,
    netCashFlow,
  };
}

// ============================================================================
// 2. BUDGET MANAGEMENT
// ============================================================================
export function evaluateBudgetManagement(
  budgetLimit: number,
  budgetSpent: number,
  categoryBudgets: CategoryBudgetDetail[] = []
) {
  const catLimitSum = categoryBudgets.reduce((s, c) => s + (c.limit > 0 ? c.limit : 0), 0);
  const catSpentSum = categoryBudgets.reduce((s, c) => s + (c.spent > 0 ? c.spent : 0), 0);

  const effectiveLimit = budgetLimit > 0 ? budgetLimit : catLimitSum;
  // If categoryBudgets exist, align effectiveSpent with category spending to prevent denominator mismatch
  const effectiveSpent = categoryBudgets.length > 0 ? catSpentSum : budgetSpent;

  // If no budget is set at all, never treat unavailable data as a perfect score (100)
  if (effectiveLimit <= 0 && categoryBudgets.length === 0) {
    return {
      score: null,
      isAvailable: false,
      overallAdherence: null,
      overspentCategories: [],
    };
  }

  // 1. Overall budget adherence
  const overallOvershoot = Math.max(0, effectiveSpent - effectiveLimit);
  const overallAdherenceScore = effectiveLimit > 0 ? clamp01(1 - overallOvershoot / effectiveLimit) * 100 : 100;

  // 2. Category-level overspending evaluation
  const overspentCategories: Array<CategoryBudgetDetail & { overspentAmount: number; overspentPct: number }> = [];
  let categoryPenalties = 0;

  if (categoryBudgets.length > 0) {
    for (const cat of categoryBudgets) {
      if (cat.limit > 0 && cat.spent > cat.limit) {
        const overspentAmount = cat.spent - cat.limit;
        const overspentPct = (overspentAmount / cat.limit) * 100;
        overspentCategories.push({
          ...cat,
          overspentAmount,
          overspentPct,
        });
        // Depth of category breach penalty
        categoryPenalties += Math.min(25, 5 + overspentPct * 0.15);
      }
    }
  }

  const categoryAdherenceScore = Math.max(0, 100 - categoryPenalties);

  // Balanced 50% overall adherence + 50% category-level discipline
  const finalScore = categoryBudgets.length > 0
    ? Math.round(0.5 * overallAdherenceScore + 0.5 * categoryAdherenceScore)
    : Math.round(overallAdherenceScore);

  return {
    score: finalScore,
    isAvailable: true,
    overallAdherence: Math.round(overallAdherenceScore),
    overspentCategories,
  };
}

// ============================================================================
// 3. EMERGENCY FUND & FINANCIAL RESILIENCE
// ============================================================================
export function evaluateEmergencyFund(
  emergencyGoalAmount: number | null | undefined,
  liquidPortfolioAssets = 0,
  monthlyEssentialExpense = 0,
  monthlyExpenseAvg = 0
) {
  const isGoalAvailable = emergencyGoalAmount !== undefined && emergencyGoalAmount !== null;
  const hasLiquidAssets = liquidPortfolioAssets > 0;

  if (!isGoalAvailable && !hasLiquidAssets) {
    return {
      score: null,
      isAvailable: false,
      totalReserves: 0,
      monthsCovered: 0,
      expenseBase: 0,
    };
  }

  const goalReserves = isGoalAvailable ? Math.max(0, emergencyGoalAmount || 0) : 0;
  const liquidReserves = Math.max(0, liquidPortfolioAssets || 0);

  // Emergency reserves combine dedicated emergency cash savings with liquid portfolio assets
  const totalReserves = goalReserves + liquidReserves;

  // Use essential expenses if available, otherwise general monthly expense baseline
  const expenseBase = monthlyEssentialExpense > 0
    ? monthlyEssentialExpense
    : (monthlyExpenseAvg > 0 ? monthlyExpenseAvg : 0);

  // If no expenses are reported, do not assume 6 months / perfect score
  if (expenseBase <= 0) {
    if (totalReserves === 0) {
      return {
        score: 0,
        isAvailable: true,
        totalReserves: 0,
        monthsCovered: 0,
        expenseBase: 0,
      };
    }
    return {
      score: null,
      isAvailable: false,
      totalReserves,
      monthsCovered: 0,
      expenseBase: 0,
    };
  }

  const monthsCovered = totalReserves / expenseBase;

  // 6+ months of essentials is the gold standard (100)
  // 3-6 months = 70-99
  // 1-3 months = 35-69
  // <1 month = 10-34
  let score = 0;
  if (monthsCovered >= 6) {
    score = 100;
  } else if (monthsCovered >= 3) {
    score = 70 + ((monthsCovered - 3) / 3) * 29;
  } else if (monthsCovered >= 1) {
    score = 35 + ((monthsCovered - 1) / 2) * 34;
  } else {
    score = clamp01(monthsCovered) * 34;
  }

  return {
    score: Math.round(score),
    isAvailable: true,
    totalReserves,
    monthsCovered: Number(monthsCovered.toFixed(1)),
    expenseBase,
  };
}

// ============================================================================
// 4. INVESTMENT HEALTH & DIVERSIFICATION
// ============================================================================
export function evaluateDiversification(
  holdingTypesCount: number,
  holdings: HoldingItem[] = [],
  totalAssets = 0
) {
  // If user has no holdings, no assets, and no holding types, it's missing/unavailable
  if (holdingTypesCount <= 0 && holdings.length === 0 && totalAssets <= 0) {
    return {
      score: null,
      isAvailable: false,
      distinctTypes: 0,
      maxConcentrationPct: 0,
    };
  }

  const validHoldings = holdings.filter((h) => (h.value || 0) > 0);

  // If detailed holdings exist with valuations, compute asset concentration (Herfindahl Index)
  if (validHoldings.length > 0) {
    const typeTotals: Record<string, number> = {};
    for (const h of validHoldings) {
      typeTotals[h.type] = (typeTotals[h.type] || 0) + h.value;
    }

    const typeEntries = Object.entries(typeTotals);
    // Consistent denominator: sum of holding values (shares sum strictly to 1.0)
    const holdingsTotal = typeEntries.reduce((acc, [_, val]) => acc + val, 0);

    if (holdingsTotal <= 0) {
      return {
        score: null,
        isAvailable: false,
        distinctTypes: 0,
        maxConcentrationPct: 0,
      };
    }

    const shares = typeEntries.map(([_, val]) => val / holdingsTotal);
    const maxShare = Math.max(...shares, 0);

    // Herfindahl-Hirschman Index: sum of squared market shares
    const hhi = shares.reduce((acc, s) => acc + s * s, 0);
    const concentrationScore = clamp01((1 - hhi) / 0.65) * 100;

    // Breadth score: active asset types with meaningful exposure (>= 8% allocation)
    const meaningfulTypes = shares.filter((s) => s >= 0.08).length;
    let breadthScore = 30;
    if (meaningfulTypes >= 4) breadthScore = 100;
    else if (meaningfulTypes === 3) breadthScore = 85;
    else if (meaningfulTypes === 2) breadthScore = 65;
    else breadthScore = 35;

    // Penalty if single asset class holds over 75% of total wealth
    let penalty = 0;
    if (maxShare > 0.85) penalty = 20;
    else if (maxShare > 0.75) penalty = 10;

    const compositeScore = Math.max(10, Math.min(100, Math.round(0.6 * concentrationScore + 0.4 * breadthScore - penalty)));

    return {
      score: compositeScore,
      isAvailable: true,
      distinctTypes: typeEntries.length,
      maxConcentrationPct: Math.round(maxShare * 100),
    };
  }

  // If holdings exist but all have 0/missing valuations and totalAssets <= 0:
  if (holdings.length > 0 && validHoldings.length === 0 && totalAssets <= 0) {
    return {
      score: null,
      isAvailable: false,
      distinctTypes: 0,
      maxConcentrationPct: 0,
    };
  }

  // Legacy fallback: type count out of 5 (only when holdingTypesCount > 0)
  if (holdingTypesCount > 0) {
    const fallbackScore = Math.round(clamp01(holdingTypesCount / 5) * 100);
    return {
      score: fallbackScore,
      isAvailable: true,
      distinctTypes: holdingTypesCount,
      maxConcentrationPct: holdingTypesCount === 1 ? 100 : Math.round(100 / Math.max(1, holdingTypesCount)),
    };
  }

  return {
    score: null,
    isAvailable: false,
    distinctTypes: 0,
    maxConcentrationPct: 0,
  };
}

// ============================================================================
// 5. DEBT HEALTH
// ============================================================================
export function evaluateDebtHealth(
  totalDebt: number | null | undefined,
  monthlyDebtPayments: number | null | undefined,
  income: number,
  totalAssets: number
) {
  // If neither debt amount nor monthly debt payments are reported, DO NOT assume 0 debt!
  const isDebtReported =
    (totalDebt !== undefined && totalDebt !== null) ||
    (monthlyDebtPayments !== undefined && monthlyDebtPayments !== null);

  if (!isDebtReported) {
    return {
      score: null,
      isAvailable: false,
      dtiPct: null,
      debtToAssetPct: null,
    };
  }

  // Case A: Monthly EMI / debt obligations reported -> evaluate Debt-to-Income (DTI)
  if (monthlyDebtPayments !== undefined && monthlyDebtPayments !== null) {
    if (income <= 0) {
      if (monthlyDebtPayments > 0) {
        // High risk: debt payments with 0 income
        return {
          score: 10,
          isAvailable: true,
          dtiPct: 100,
          debtToAssetPct: totalAssets > 0 && totalDebt ? Math.round((totalDebt / totalAssets) * 100) : null,
        };
      }
      // monthlyDebtPayments is 0 and income <= 0: check totalDebt vs totalAssets
      if (totalDebt !== null && totalDebt !== undefined && totalAssets > 0) {
        const debtRatioRaw = totalDebt / totalAssets;
        return {
          score: Math.round(clamp01(1 - debtRatioRaw) * 100),
          isAvailable: true,
          dtiPct: null,
          debtToAssetPct: Math.round(debtRatioRaw * 100),
        };
      }
      // Indeterminate DTI and no asset valuation exists -> unavailable
      return {
        score: null,
        isAvailable: false,
        dtiPct: null,
        debtToAssetPct: null,
      };
    }

    const dti = monthlyDebtPayments / income;
    const dtiPct = Math.round(dti * 100);

    let score = 0;
    if (dti <= 0.15) {
      score = 95 - dti * 50; // 0-15% DTI -> 90-95
    } else if (dti <= 0.3) {
      score = 80 + ((0.3 - dti) / 0.15) * 10; // 15-30% DTI -> 80-90 (Manageable)
    } else if (dti <= 0.45) {
      score = 50 + ((0.45 - dti) / 0.15) * 29; // 30-45% DTI -> 50-79
    } else {
      score = Math.max(5, 45 - (dti - 0.45) * 80); // >45% DTI -> High risk
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      isAvailable: true,
      dtiPct,
      debtToAssetPct: totalAssets > 0 && totalDebt ? Math.round((totalDebt / totalAssets) * 100) : null,
    };
  }

  // Case B: Total debt liability vs Total assets
  const debt = totalDebt || 0;
  if (totalAssets <= 0) {
    if (debt > 0) {
      return {
        score: 10,
        isAvailable: true,
        dtiPct: null,
        debtToAssetPct: null,
      };
    }
    // Debt is 0, but totalAssets is also <= 0 (neither assets nor income reported)
    return {
      score: null,
      isAvailable: false,
      dtiPct: null,
      debtToAssetPct: null,
    };
  }

  const debtRatioRaw = debt / totalAssets;
  const debtRatioScore = Math.round(clamp01(1 - debtRatioRaw) * 100);

  return {
    score: debtRatioScore,
    isAvailable: true,
    dtiPct: null,
    debtToAssetPct: Math.round(debtRatioRaw * 100),
  };
}

// ============================================================================
// DATA CONFIDENCE & COMPLETENESS
// ============================================================================
export function calculateConfidence(inputs: {
  hasCashFlow: boolean;
  hasBudgets: boolean;
  hasPortfolio: boolean;
  hasEmergencyData: boolean;
  hasDebtData: boolean;
}) {
  let score = 0;
  const trackedMetrics: string[] = [];
  const missingMetrics: string[] = [];

  if (inputs.hasCashFlow) {
    score += 25;
    trackedMetrics.push("Income & Expenses");
  } else {
    missingMetrics.push("Income & Expenses");
  }

  if (inputs.hasBudgets) {
    score += 20;
    trackedMetrics.push("Category Budgets");
  } else {
    missingMetrics.push("Category Budgets");
  }

  if (inputs.hasEmergencyData) {
    score += 20;
    trackedMetrics.push("Emergency Reserves");
  } else {
    missingMetrics.push("Emergency Reserves");
  }

  if (inputs.hasPortfolio) {
    score += 20;
    trackedMetrics.push("Investment Portfolio");
  } else {
    missingMetrics.push("Investment Portfolio");
  }

  if (inputs.hasDebtData) {
    score += 15;
    trackedMetrics.push("Debt Obligations");
  } else {
    missingMetrics.push("Debt Obligations");
  }

  const level: "High" | "Moderate" | "Partial" =
    score >= 80 ? "High" : score >= 55 ? "Moderate" : "Partial";

  return {
    score,
    level,
    trackedMetrics,
    missingMetrics,
  };
}

// ============================================================================
// DECISION-SUPPORT: EXPLAINABILITY & TOP 1–3 ACTIONS
// ============================================================================
export function buildExplainabilityAndActions(params: {
  score: number;
  savingsScore: number | null;
  savingsRate: number | null;
  netCashFlow: number;
  budgetScore: number | null;
  overspentCategories: Array<CategoryBudgetDetail & { overspentAmount: number }>;
  emergencyScore: number | null;
  monthsCovered: number | null;
  diversificationScore: number | null;
  maxConcentrationPct: number;
  debtScore: number | null;
  dtiPct: number | null;
  hasIncome?: boolean;
  income?: number;
  expense?: number;
  monthlyExpenses?: number;
  liquidAssets?: number;
  emergencyGoalAmount?: number | null;
  totalDebt?: number | null;
  monthlyDebtPayment?: number | null;
}) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actions: ActionItem[] = [];

  const userIncome = params.income || 0;
  const userExpense = params.expense || 0;
  const essentialBase =
    params.monthlyExpenses && params.monthlyExpenses > 0
      ? params.monthlyExpenses
      : userExpense > 0
      ? userExpense
      : 0;

  // 1. Savings & Cash Flow
  if (!params.hasIncome) {
    weaknesses.push("No income transactions recorded for this period.");
    actions.push({
      rank: 1,
      title: "Add Your Monthly Income",
      action: "Log your regular salary or earnings to start tracking how much you save each month.",
      impact: "Unlocks your Savings & Cash Flow score and gives you an accurate financial health rating.",
      target: "Log your regular monthly earnings or take-home pay",
      priority: "High",
    });
  } else if (params.savingsScore !== null) {
    if (params.savingsScore >= 75 && params.savingsRate !== null) {
      strengths.push(`Solid savings: keeping ${Math.round(params.savingsRate * 100)}% of income with positive cash flow.`);
    } else if (params.netCashFlow < 0) {
      weaknesses.push("Negative monthly cash flow: spending exceeded income this month.");
      const deficit = Math.round(Math.abs(params.netCashFlow));
      actions.push({
        rank: 1,
        title: "Stop Spending More Than You Make",
        action: "Pause non-essential subscriptions and cut back on discretionary purchases to bring spending below income.",
        impact: "Stops your cash reserves from running dry and adds up to 25 points back to your score.",
        target:
          userIncome > 0
            ? `Cut monthly spending by ₹${deficit.toLocaleString("en-IN")} (keep total spending under ₹${Math.round(userIncome).toLocaleString("en-IN")}/mo)`
            : "Reduce monthly spending to restore positive cash flow",
        priority: "High",
      });
    } else if (params.savingsScore < 55 && params.savingsRate !== null) {
      weaknesses.push(`Low savings rate of ${Math.round(params.savingsRate * 100)}% (benchmark is 20%+).`);
      const targetSavings = Math.round(userIncome * 0.2);
      const targetSpending = Math.round(userIncome * 0.8);
      actions.push({
        rank: 2,
        title: "Aim to Save at Least 20% of Your Income",
        action: "Set aside your savings right after getting paid rather than waiting to save whatever is left over.",
        impact: "Builds long-term wealth steadily and lifts your Savings score from fair to good.",
        target:
          targetSavings > 0
            ? `Save at least ₹${targetSavings.toLocaleString("en-IN")}/mo (cap monthly spending at ₹${targetSpending.toLocaleString("en-IN")})`
            : "Save at least 20% of your earnings each month",
        priority: "Medium",
      });
    }
  }

  // 2. Budget Discipline
  if (params.budgetScore !== null) {
    if (params.overspentCategories.length > 0) {
      const highestOverspent = [...params.overspentCategories].sort((a, b) => b.overspentAmount - a.overspentAmount)[0];
      weaknesses.push(`Budget overrun in ${params.overspentCategories.length} category: ${highestOverspent.name} exceeded by ₹${Math.round(highestOverspent.overspentAmount).toLocaleString("en-IN")}.`);
      actions.push({
        rank: actions.length + 1,
        title: `Trim Spending in ${highestOverspent.name}`,
        action: `Keep your ${highestOverspent.name} purchases within the monthly limit next cycle.`,
        impact: "Stops budget leaks and lifts your Budget Management score.",
        target: `Limit ${highestOverspent.name} to ₹${Math.round(highestOverspent.limit).toLocaleString("en-IN")}/mo (cut ₹${Math.round(highestOverspent.overspentAmount).toLocaleString("en-IN")})`,
        priority: "High",
      });
    } else if (params.budgetScore >= 80) {
      strengths.push("Strict budget discipline maintained across all tracked categories.");
    }
  } else {
    actions.push({
      rank: actions.length + 1,
      title: "Set Spending Limits for Key Categories",
      action: "Add monthly spending caps for your regular expenses like groceries, eating out, and bills.",
      impact: "Warns you before you overspend and activates your Budget Management score.",
      target: "Create monthly limits for your top 3 expense categories",
      priority: "Medium",
    });
  }

  // 3. Emergency Fund
  const target3Mo = Math.round(essentialBase * 3);
  const currentLiquid = (params.liquidAssets || 0) + (params.emergencyGoalAmount || 0);
  const emergencyShortfall = Math.max(0, target3Mo - currentLiquid);

  if (params.emergencyScore !== null && params.monthsCovered !== null) {
    if (params.monthsCovered >= 5) {
      strengths.push(`Robust emergency buffer covering ${params.monthsCovered} months of essential living expenses.`);
    } else if (params.monthsCovered < 3) {
      weaknesses.push(`Limited emergency coverage: only ${params.monthsCovered} months of basic living costs protected.`);
      actions.push({
        rank: actions.length + 1,
        title: "Build a 3-Month Safety Cushion",
        action: "Put extra money into a savings account or liquid fund until you have at least 3 months of basic living costs.",
        impact: "Protects you from sudden emergencies without having to sell investments or borrow money.",
        target:
          essentialBase > 0
            ? `Grow reserves to ₹${target3Mo.toLocaleString("en-IN")} (add ₹${emergencyShortfall.toLocaleString("en-IN")} to reach 3 months)`
            : "Save 3 months of basic living expenses in an easily accessible account",
        priority: "High",
      });
    }
  } else {
    weaknesses.push("Emergency fund goal not designated.");
    actions.push({
      rank: actions.length + 1,
      title: "Set Up an Emergency Fund Goal",
      action: "Create a savings goal specifically marked as your emergency buffer to track your safety net.",
      impact: "Protects against sudden income drops or unexpected medical expenses.",
      target:
        essentialBase > 0
          ? `Set an emergency goal of ₹${target3Mo.toLocaleString("en-IN")} (3 months of basic expenses)`
          : "Set a goal to cover 3 to 6 months of living expenses",
      priority: "Medium",
    });
  }

  // 4. Diversification
  if (params.diversificationScore !== null && params.diversificationScore !== undefined) {
    if (params.diversificationScore >= 80) {
      strengths.push("Well-diversified portfolio across multiple distinct asset types.");
    } else if (params.maxConcentrationPct > 75) {
      weaknesses.push(`High portfolio concentration: ${params.maxConcentrationPct}% of assets concentrated in a single class.`);
      actions.push({
        rank: actions.length + 1,
        title: "Spread Investments Across More Asset Types",
        action: "Put your next monthly investments into under-represented assets (like index funds, gold, or fixed deposits).",
        impact: "Prevents a single bad market drop from hurting your entire net worth.",
        target: `Reduce top asset concentration from ${params.maxConcentrationPct}% to under 50% of your portfolio`,
        priority: "Medium",
      });
    } else if (params.diversificationScore < 70) {
      actions.push({
        rank: actions.length + 1,
        title: "Diversify Your Investment Portfolio",
        action: "Add index funds, debt instruments, or gold alongside individual stocks.",
        impact: "Smooths out market ups and downs and boosts your Investment Diversification score.",
        target: "Hold at least 3 distinct asset classes in your portfolio",
        priority: "Low",
      });
    }
  }

  // 5. Debt
  if (params.debtScore !== null) {
    if (params.dtiPct !== null && params.dtiPct > 35) {
      weaknesses.push(`High debt-to-income ratio (${params.dtiPct}%). Recommended ceiling is under 30%.`);
      const recEmiCap = userIncome > 0 ? Math.round(userIncome * 0.3) : 0;
      const emiCut =
        recEmiCap > 0 && params.monthlyDebtPayment
          ? Math.max(0, Math.round(params.monthlyDebtPayment - recEmiCap))
          : 0;
      actions.push({
        rank: 1, // prioritize debt
        title: "Pay Down High-Interest Loans & EMIs",
        action: "Pay extra toward your highest-interest debt first or refinance to lower your monthly loan payments.",
        impact: "Lowers monthly debt stress and strengthens your long-term solvency.",
        target:
          recEmiCap > 0
            ? `Keep monthly EMIs under ₹${recEmiCap.toLocaleString("en-IN")}/mo (cut payments by ₹${emiCut.toLocaleString("en-IN")})`
            : "Keep monthly debt payments under 30% of what you earn",
        priority: "High",
      });
    } else if (params.debtScore >= 80) {
      strengths.push("Manageable debt obligations with low monthly EMI burden.");
    }
  }

  // Fallback for stellar profiles: proactive wealth-building action
  if (actions.length === 0) {
    actions.push({
      rank: 1,
      title: "Keep Up Your Great Financial Habits",
      action: "Review your category budgets once a month and rebalance investments once or twice a year.",
      impact: "Keeps your finances healthy and maintains your top-tier score.",
      target: "Maintain a 20%+ savings rate and keep 6 months of living costs in reserve",
      priority: "Low",
    });
  }

  // Sort and pick top 1-3 actions with stable priority ranking
  const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  actions.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
  const topActions = actions.slice(0, 3).map((a, idx) => ({ ...a, rank: idx + 1 }));

  // Executive summary in everyday English
  let summary = "";
  if (params.score >= 80) {
    summary = `Your financial health is strong at ${params.score}/100. You're saving consistently, managing your spending well, and maintaining solid financial buffers.`;
  } else if (params.score >= 60) {
    summary = `Your financial health is on solid ground at ${params.score}/100. With a few targeted tweaks to your emergency cushion and category budgets, you can reach an excellent score.`;
  } else if (params.score > 0) {
    summary = `Your financial health score is ${params.score}/100. Bringing spending below income and building an emergency safety net are the quickest ways to improve your score.`;
  } else {
    summary = "We don't have enough financial records yet to calculate your complete score. Adding your regular income, monthly budgets, and savings goals will get you started.";
  }

  return {
    summary,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    topActions,
  };
}

// ============================================================================
// MAIN: COMPUTE FINANCIAL HEALTH SCORE
// ============================================================================
export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const {
    income,
    expense,
    budgetLimit,
    budgetSpent,
    categoryBudgets = [],
    holdingTypesCount = 0,
    holdings = [],
    emergencyFundAmount,
    liquidPortfolioAssets = 0,
    monthlyEssentialExpense = 0,
    monthlyExpenseAvg = 0,
    rollingSavingsRate,
    anomalousExpenseAmount = 0,
    totalDebt,
    monthlyDebtPayments,
    totalAssets = 0,
  } = input;

  // 1. Savings & Cash Flow
  const savingsResult = evaluateSavingsAndCashFlow(
    income,
    expense,
    rollingSavingsRate,
    anomalousExpenseAmount
  );

  // 2. Budget Discipline
  const budgetResult = evaluateBudgetManagement(
    budgetLimit,
    budgetSpent,
    categoryBudgets
  );

  // 3. Investment Diversification
  const diversificationResult = evaluateDiversification(
    holdingTypesCount,
    holdings,
    totalAssets
  );

  // 4. Emergency Fund Coverage
  const emergencyResult = evaluateEmergencyFund(
    emergencyFundAmount,
    liquidPortfolioAssets,
    monthlyEssentialExpense,
    monthlyExpenseAvg
  );

  // 5. Debt Health
  const debtResult = evaluateDebtHealth(
    totalDebt,
    monthlyDebtPayments,
    income,
    totalAssets
  );

  // Sum available weights dynamically
  const isSavingsAvailable = savingsResult.isAvailable && savingsResult.score !== null;
  const isEmergencyFundAvailable = emergencyResult.isAvailable && emergencyResult.score !== null;
  const isDebtAvailable = debtResult.isAvailable && debtResult.score !== null;
  const isBudgetAvailable = budgetResult.isAvailable && budgetResult.score !== null;
  const isDiversificationAvailable = diversificationResult.isAvailable && diversificationResult.score !== null;

  const totalWeight =
    (isSavingsAvailable ? WEIGHTS.savingsRate : 0) +
    (isBudgetAvailable ? WEIGHTS.budgetDiscipline : 0) +
    (isDiversificationAvailable ? WEIGHTS.diversification : 0) +
    (isEmergencyFundAvailable ? WEIGHTS.emergencyFund : 0) +
    (isDebtAvailable ? WEIGHTS.debtRatio : 0);

  const weightedSum =
    (isSavingsAvailable ? (savingsResult.score ?? 0) * WEIGHTS.savingsRate : 0) +
    (isBudgetAvailable ? (budgetResult.score ?? 0) * WEIGHTS.budgetDiscipline : 0) +
    (isDiversificationAvailable ? (diversificationResult.score ?? 0) * WEIGHTS.diversification : 0) +
    (isEmergencyFundAvailable ? (emergencyResult.score ?? 0) * WEIGHTS.emergencyFund : 0) +
    (isDebtAvailable ? (debtResult.score ?? 0) * WEIGHTS.debtRatio : 0);

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Rating label
  let rating: HealthScoreResult["rating"] = "Good";
  if (score >= 85) rating = "Excellent";
  else if (score >= 70) rating = "Good";
  else if (score >= 50) rating = "Fair";
  else rating = "Needs Attention";

  // Confidence & Data Completeness
  const confidence = calculateConfidence({
    hasCashFlow: income > 0 || expense > 0,
    hasBudgets: isBudgetAvailable,
    hasPortfolio: isDiversificationAvailable,
    hasEmergencyData: isEmergencyFundAvailable,
    hasDebtData: isDebtAvailable,
  });

  // Explainability & Actions
  const explainability = buildExplainabilityAndActions({
    score,
    savingsScore: savingsResult.score,
    savingsRate: savingsResult.rawRate,
    netCashFlow: savingsResult.netCashFlow,
    budgetScore: budgetResult.score,
    overspentCategories: budgetResult.overspentCategories,
    emergencyScore: emergencyResult.score,
    monthsCovered: emergencyResult.monthsCovered,
    diversificationScore: diversificationResult.score,
    maxConcentrationPct: diversificationResult.maxConcentrationPct,
    debtScore: debtResult.score,
    dtiPct: debtResult.dtiPct,
    hasIncome: income > 0,
    income,
    expense,
    monthlyExpenses: monthlyEssentialExpense || monthlyExpenseAvg,
    liquidAssets: liquidPortfolioAssets,
    emergencyGoalAmount: emergencyFundAmount,
    totalDebt,
    monthlyDebtPayment: monthlyDebtPayments,
  });

  return {
    score,
    rating,
    breakdown: {
      savingsRate: savingsResult.isAvailable && savingsResult.rawRate !== null ? Math.round(savingsResult.rawRate * 100) : null,
      budgetDiscipline: budgetResult.isAvailable ? budgetResult.score : null,
      diversification: diversificationResult.isAvailable ? diversificationResult.score : null,
      emergencyFund: emergencyResult.isAvailable ? emergencyResult.score : null,
      debtRatio: debtResult.isAvailable ? debtResult.score : null,
    },
    componentDetails: {
      savingsRate: {
        score: savingsResult.score,
        displayValue:
          savingsResult.score !== null && savingsResult.rawRate !== null
            ? `${Math.round(savingsResult.rawRate * 100)}% saved`
            : savingsResult.score !== null && income <= 0
            ? "Deficit"
            : "Unavailable",
        status: savingsResult.score === null ? "unavailable" : savingsResult.score >= 80 ? "excellent" : savingsResult.score >= 55 ? "good" : "fair",
        explanation: savingsResult.score !== null && savingsResult.rawRate !== null
          ? `You kept ${Math.round(savingsResult.rawRate * 100)}% of your income this month after expenses (target is 20%+). Net cash saved: ₹${Math.round(savingsResult.netCashFlow).toLocaleString("en-IN")}.`
          : "No regular income recorded for this period. Add income to calculate your savings rate.",
      },
      budgetDiscipline: {
        score: budgetResult.score,
        displayValue: budgetResult.score !== null ? `${budgetResult.score}/100` : "No Budgets Set",
        status: budgetResult.score === null ? "unavailable" : budgetResult.score >= 80 ? "excellent" : budgetResult.score >= 60 ? "good" : "warning",
        explanation: budgetResult.score !== null
          ? (budgetResult.overspentCategories.length > 0
              ? `Spending in ${budgetResult.overspentCategories.length} category exceeded its monthly limit.`
              : "All spending remained within planned category limits.")
          : "No category budgets set for this period. Excluded from overall score.",
      },
      diversification: {
        score: diversificationResult.score,
        displayValue: diversificationResult.score !== null ? `${diversificationResult.distinctTypes} asset types` : "Unavailable",
        status: diversificationResult.score === null ? "unavailable" : diversificationResult.score >= 75 ? "excellent" : diversificationResult.score >= 50 ? "good" : "fair",
        explanation: diversificationResult.score !== null
          ? `Investments are spread across ${diversificationResult.distinctTypes} asset types. Your largest holding makes up ${diversificationResult.maxConcentrationPct}% of your portfolio.`
          : "No investment holdings with positive valuations reported. Excluded from overall score.",
      },
      emergencyFund: {
        score: emergencyResult.score,
        displayValue: emergencyResult.score !== null ? `${emergencyResult.monthsCovered} months covered` : "Unavailable",
        status: emergencyResult.score === null ? "unavailable" : emergencyResult.score >= 80 ? "excellent" : emergencyResult.score >= 50 ? "good" : "warning",
        explanation: emergencyResult.score !== null
          ? `Your liquid safety buffer covers ${emergencyResult.monthsCovered} months of essential living expenses (aim for 3 to 6 months).`
          : "No dedicated emergency savings goal or liquid buffer found.",
      },
      debtRatio: {
        score: debtResult.score,
        displayValue: debtResult.score !== null ? (debtResult.dtiPct !== null ? `${debtResult.dtiPct}% of income` : `${debtResult.score}/100`) : "Not Reported",
        status: debtResult.score === null ? "unavailable" : debtResult.score >= 80 ? "excellent" : debtResult.score >= 50 ? "good" : "warning",
        explanation: debtResult.score !== null
          ? (debtResult.dtiPct !== null ? `Monthly loan payments take up ${debtResult.dtiPct}% of your income (keep under 30%).` : "Healthy debt level relative to your total assets.")
          : "No loan obligations recorded. Excluded from overall score.",
      },
    },
    confidence,
    explainability,
  };
}

// ============================================================================
// WEEKLY: MONITORING ENGINE
// ============================================================================
export function computeWeeklyMonitoring(input: WeeklyMonitoringInput): WeeklyMonitoringResult {
  const {
    weeklyIncome,
    weeklyExpense,
    prevWeekExpense,
    monthlyBudgetLimit,
    monthToDateExpense,
    daysPassedInMonth,
    totalDaysInMonth,
    topCategories = [],
    weeklyAnomaliesCount = 0,
  } = input;

  const netCashFlow = weeklyIncome - weeklyExpense;
  const usagePct = monthlyBudgetLimit > 0 ? Math.round((monthToDateExpense / monthlyBudgetLimit) * 100) : 0;
  const expectedPacingPct = totalDaysInMonth > 0 ? Math.round((daysPassedInMonth / totalDaysInMonth) * 100) : 0;

  // Pacing status
  let pacingStatus: WeeklyMonitoringResult["budgetUsage"]["pacingStatus"] = "on_track";
  let pacingMessage = "Spending is pacing within monthly budget.";

  if (monthlyBudgetLimit <= 0) {
    pacingStatus = "no_budget";
    pacingMessage = "No monthly budget limit set.";
  } else if (usagePct > expectedPacingPct + 15) {
    pacingStatus = "ahead_of_budget";
    pacingMessage = `Pacing ahead: ${usagePct}% of budget used with ${Math.max(0, totalDaysInMonth - daysPassedInMonth)} days remaining.`;
  } else if (usagePct < expectedPacingPct - 15) {
    pacingStatus = "under_budget";
    pacingMessage = `Under budget: spending is well controlled (${usagePct}% consumed vs ${expectedPacingPct}% expected).`;
  } else {
    pacingStatus = "on_track";
    pacingMessage = `On track: ${usagePct}% consumed, aligned with month progress (${expectedPacingPct}%).`;
  }

  // Week-over-week change
  let changePct: number | null = null;
  let direction: WeeklyMonitoringResult["weekOverWeek"]["direction"] = "insufficient_history";
  let wowSummary = "First week of active monitoring.";

  if (prevWeekExpense !== undefined && prevWeekExpense !== null && prevWeekExpense > 0) {
    changePct = Math.round(((weeklyExpense - prevWeekExpense) / prevWeekExpense) * 100);
    if (changePct > 5) {
      direction = "increased";
      wowSummary = `Spending increased ${changePct}% compared to last week.`;
    } else if (changePct < -5) {
      direction = "decreased";
      wowSummary = `Spending decreased ${Math.abs(changePct)}% compared to last week.`;
    } else {
      direction = "stable";
      wowSummary = `Spending is virtually unchanged from last week.`;
    }
  }

  // Smart monitoring alerts
  const alerts: string[] = [];

  if (direction === "increased" && changePct && changePct >= 20) {
    alerts.push(`Spending increased ${changePct}% this week. Review recent discretionary transactions.`);
  }

  if (pacingStatus === "ahead_of_budget") {
    alerts.push(`You have consumed ${usagePct}% of your monthly budget. Slow discretionary spending to avoid month-end overshoot.`);
  } else if (monthlyBudgetLimit > 0 && pacingStatus === "on_track") {
    alerts.push(`You are on track with your monthly budget (${usagePct}% utilized).`);
  }

  if (weeklyAnomaliesCount > 0) {
    alerts.push(`Flagged ${weeklyAnomaliesCount} unusual spending pattern${weeklyAnomaliesCount > 1 ? "s" : ""} this week.`);
  }

  if (netCashFlow > 0) {
    alerts.push(`Positive weekly cash flow (+₹${Math.round(netCashFlow).toLocaleString("en-IN")}).`);
  } else if (netCashFlow < 0) {
    alerts.push(`Weekly expenses exceeded weekly income by ₹${Math.round(Math.abs(netCashFlow)).toLocaleString("en-IN")}.`);
  }

  return {
    income: weeklyIncome,
    expenses: weeklyExpense,
    netCashFlow,
    budgetUsage: {
      monthToDateExpense,
      monthlyBudgetLimit,
      usagePct,
      pacingStatus,
      pacingMessage,
    },
    weekOverWeek: {
      changePct,
      direction,
      summary: wowSummary,
    },
    unusualSpending: {
      count: weeklyAnomaliesCount,
      summary: weeklyAnomaliesCount > 0
        ? `${weeklyAnomaliesCount} unusual transaction pattern(s) identified.`
        : "No unusual spending anomalies detected this week.",
    },
    alerts,
    categoryBreakdown: topCategories,
  };
}

// ============================================================================
// YEARLY: FINANCIAL PROGRESS ENGINE
// ============================================================================
export function computeYearlyProgress(input: YearlyProgressInput): YearlyProgressResult {
  const {
    year,
    monthlySnapshots,
    savingsGrowthPct,
    emergencyFundGrowthAmount,
    debtReductionPct,
    investmentGrowthPct,
    goalsAchievedCount = 0,
    totalGoalsCount = 0,
    budgetAdherenceTrend = "stable",
  } = input;

  // Data sufficiency check: need at least 2 distinct months of historical data
  if (!monthlySnapshots || monthlySnapshots.length < 2) {
    return {
      year,
      isDataSufficient: false,
      insufficientDataReason: `Insufficient historical data for ${year}. FinSight requires at least 2 distinct months of transaction records to track meaningful progress. Currently tracking ${monthlySnapshots?.length || 0} month(s).`,
      progressScore: null,
      monthlyTrajectory: monthlySnapshots || [],
      pillars: {
        savingsGrowth: { score: null, label: "Savings Growth", metric: "Insufficient History" },
        emergencyResilience: { score: null, label: "Emergency Resilience", metric: "Insufficient History" },
        debtReduction: { score: null, label: "Debt Reduction", metric: "Insufficient History" },
        investmentGrowth: { score: null, label: "Investment Growth", metric: "Insufficient History" },
        goalProgress: { score: null, label: "Goal Progress", metric: "Insufficient History" },
        budgetDisciplineTrend: { score: null, label: "Budget Trend", metric: "Insufficient History" },
      },
      narrativeSummary: [
        `Record at least 2 full months of transactions in ${year} to unlock Yearly Financial Progress.`,
      ],
    };
  }

  // Trajectory: earliest recorded month vs latest recorded month
  const sortedSnapshots = [...monthlySnapshots].sort((a, b) => a.month - b.month);
  const startSnapshot = sortedSnapshots[0];
  const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
  const pointsSinceStart = latestSnapshot.score - startSnapshot.score;

  // Evaluate the 6 Pillars of Growth (only when verified historical data exists, never invent defaults):
  // 1. Savings Growth
  let savingsScore: number | null = null;
  if (savingsGrowthPct !== undefined && savingsGrowthPct !== null) {
    if (savingsGrowthPct >= 20) savingsScore = 95;
    else if (savingsGrowthPct >= 10) savingsScore = 80;
    else if (savingsGrowthPct >= 0) savingsScore = 70;
    else savingsScore = Math.max(30, 60 + savingsGrowthPct);
  }

  // 2. Emergency Resilience Growth
  let emergencyScore: number | null = null;
  if (emergencyFundGrowthAmount !== undefined && emergencyFundGrowthAmount !== null) {
    if (emergencyFundGrowthAmount > 50000) emergencyScore = 95;
    else if (emergencyFundGrowthAmount > 20000) emergencyScore = 85;
    else if (emergencyFundGrowthAmount > 0) emergencyScore = 75;
    else if (emergencyFundGrowthAmount === 0) emergencyScore = 60;
    else emergencyScore = 40;
  }

  // 3. Debt Reduction
  let debtScore: number | null = null;
  if (debtReductionPct !== undefined && debtReductionPct !== null) {
    if (debtReductionPct > 15) debtScore = 95;
    else if (debtReductionPct > 5) debtScore = 80;
    else if (debtReductionPct >= 0) debtScore = 70;
    else debtScore = 45;
  }

  // 4. Investment Growth
  let investmentScore: number | null = null;
  if (investmentGrowthPct !== undefined && investmentGrowthPct !== null) {
    if (investmentGrowthPct >= 15) investmentScore = 95;
    else if (investmentGrowthPct >= 8) investmentScore = 85;
    else if (investmentGrowthPct >= 0) investmentScore = 75;
    else investmentScore = Math.max(35, 65 + investmentGrowthPct);
  }

  // 5. Goal Progress
  let goalScore: number | null = null;
  if (totalGoalsCount > 0) {
    const goalPct = (goalsAchievedCount / totalGoalsCount) * 100;
    goalScore = Math.round(50 + goalPct * 0.5);
  }

  // 6. Budget Discipline Trend
  let budgetTrendScore: number | null = null;
  if (budgetAdherenceTrend && budgetAdherenceTrend !== "insufficient_data") {
    if (budgetAdherenceTrend === "improving") budgetTrendScore = 90;
    else if (budgetAdherenceTrend === "stable") budgetTrendScore = 75;
    else if (budgetAdherenceTrend === "declining") budgetTrendScore = 50;
  }

  // Dynamically redistribute weights across pillars with verified historical tracking
  const totalPillarWeights =
    (savingsScore !== null ? 0.25 : 0) +
    (emergencyScore !== null ? 0.2 : 0) +
    (debtScore !== null ? 0.15 : 0) +
    (investmentScore !== null ? 0.2 : 0) +
    (goalScore !== null ? 0.1 : 0) +
    (budgetTrendScore !== null ? 0.1 : 0);

  const baseGrowthScore =
    (savingsScore !== null ? savingsScore * 0.25 : 0) +
    (emergencyScore !== null ? emergencyScore * 0.2 : 0) +
    (debtScore !== null ? debtScore * 0.15 : 0) +
    (investmentScore !== null ? investmentScore * 0.2 : 0) +
    (goalScore !== null ? goalScore * 0.1 : 0) +
    (budgetTrendScore !== null ? budgetTrendScore * 0.1 : 0);

  const trajectoryBonus = Math.max(-15, Math.min(15, pointsSinceStart * 0.7));
  const rawProgress = totalPillarWeights > 0
    ? baseGrowthScore / totalPillarWeights + trajectoryBonus
    : Math.max(10, Math.min(100, Math.round(50 + trajectoryBonus)));

  const progressScore = Math.max(10, Math.min(100, Math.round(rawProgress)));

  // Rating
  let rating: YearlyProgressResult["rating"] = "Steady Progress";
  if (progressScore >= 80) rating = "Accelerating";
  else if (progressScore >= 65) rating = "Steady Progress";
  else if (progressScore >= 50) rating = "Moderate";
  else rating = "Needs Attention";

  // Narrative highlights
  const narrativeSummary: string[] = [];
  const deltaSign = pointsSinceStart >= 0 ? "+" : "";
  narrativeSummary.push(
    `${year} Financial Progress: ${progressScore}/100 (${deltaSign}${pointsSinceStart} points since ${startSnapshot.monthName}).`
  );

  if (savingsGrowthPct && savingsGrowthPct > 0) {
    narrativeSummary.push(`Average monthly savings rate expanded by ${Math.round(savingsGrowthPct)}%.`);
  }

  if (emergencyFundGrowthAmount && emergencyFundGrowthAmount > 0) {
    narrativeSummary.push(`Emergency resilience increased by ₹${Math.round(emergencyFundGrowthAmount).toLocaleString("en-IN")}.`);
  }

  if (debtScore !== null && debtReductionPct && debtReductionPct > 0) {
    narrativeSummary.push(`Monthly debt service obligations reduced by ${Math.round(debtReductionPct)}%.`);
  }

  if (budgetAdherenceTrend === "improving") {
    narrativeSummary.push(`Budget discipline improved across recorded quarters.`);
  }

  return {
    year,
    isDataSufficient: true,
    progressScore,
    rating,
    pointsSinceStart,
    startMonthName: startSnapshot.monthName,
    monthlyTrajectory: sortedSnapshots,
    pillars: {
      savingsGrowth: {
        score: savingsScore,
        label: "Savings Growth",
        metric: savingsGrowthPct !== null && savingsGrowthPct !== undefined ? `${savingsGrowthPct >= 0 ? "+" : ""}${Math.round(savingsGrowthPct)}%` : "Not Tracked",
      },
      emergencyResilience: {
        score: emergencyScore,
        label: "Emergency Resilience",
        metric: emergencyFundGrowthAmount ? `+₹${Math.round(emergencyFundGrowthAmount).toLocaleString("en-IN")}` : (emergencyScore !== null ? "Maintained" : "Not Tracked"),
      },
      debtReduction: {
        score: debtScore,
        label: "Debt Reduction",
        metric: debtScore !== null ? (debtReductionPct ? `-${Math.round(debtReductionPct)}%` : "Stable") : "Not Reported",
      },
      investmentGrowth: {
        score: investmentScore,
        label: "Investment Growth",
        metric: investmentGrowthPct !== null && investmentGrowthPct !== undefined ? `${investmentGrowthPct >= 0 ? "+" : ""}${Math.round(investmentGrowthPct)}%` : "Not Tracked",
      },
      goalProgress: {
        score: goalScore,
        label: "Goal Milestones",
        metric: totalGoalsCount > 0 ? `${goalsAchievedCount} achieved` : "No Goals",
      },
      budgetDisciplineTrend: {
        score: budgetTrendScore,
        label: "Budget Discipline",
        metric: budgetTrendScore !== null ? (budgetAdherenceTrend === "improving" ? "Improving" : budgetAdherenceTrend === "declining" ? "Under Strain" : "Stable") : "No Budgets",
      },
    },
    narrativeSummary,
  };
}
