import { computeHealthScore } from "../healthScore";
import { detectSpendingAnomalies } from "../spendingAnomaly";
import { buildHealthRecommendations, buildHistoricalBaselineFilter } from "../../services/healthScore.service";

let failures = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`PASS: ${name}`);
  }
}

// --- healthScore.ts ---

// 1. Perfect score: everything maxed out, debt=0, full emergency fund
const perfect = computeHealthScore({
  income: 100000,
  expense: 70000, // savings rate 30% >= 20% ideal -> maxed
  budgetLimit: 50000,
  budgetSpent: 40000, // within budget
  holdingTypesCount: 5, // all 5 types
  emergencyFundAmount: 60000, // 6+ months at 10k/mo avg
  monthlyExpenseAvg: 10000,
  totalDebt: 0,
  totalAssets: 100000,
});
assert("perfect score is 100", perfect.score === 100, `got ${perfect.score}`);
assert("perfect debtRatio breakdown is 100", perfect.breakdown.debtRatio === 100);
assert("perfect emergencyFund breakdown is 100", perfect.breakdown.emergencyFund === 100);

// 2. Missing debt AND missing emergency fund -> both null, weight renormalized
// over savings(30) + budget(20) + diversification(20) = 70, all maxed -> should still be 100
const missingBoth = computeHealthScore({
  income: 100000,
  expense: 70000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdingTypesCount: 5,
  emergencyFundAmount: null,
  monthlyExpenseAvg: 10000,
  totalDebt: null,
  totalAssets: 100000,
});
assert("missing debt+ef score still 100 when other components maxed", missingBoth.score === 100, `got ${missingBoth.score}`);
assert("missing debt -> debtRatio null", missingBoth.breakdown.debtRatio === null);
assert("missing ef -> emergencyFund null", missingBoth.breakdown.emergencyFund === null);

// 3. Missing debt/ef must NOT silently equal a 0-scored (very bad) case.
// Compare: someone with $0 emergency fund but savings/budget/diversification maxed
// should score LOWER than someone with an unset (unavailable) emergency fund.
const zeroEF = computeHealthScore({
  income: 100000,
  expense: 70000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdingTypesCount: 5,
  emergencyFundAmount: 0, // explicitly has $0 saved -> real score of 0 for this component
  monthlyExpenseAvg: 10000,
  totalDebt: null,
  totalAssets: 100000,
});
assert(
  "explicit $0 emergency fund scores strictly lower than 'unavailable'",
  zeroEF.score < missingBoth.score,
  `zeroEF=${zeroEF.score} missingBoth=${missingBoth.score}`
);
assert("explicit $0 emergency fund breakdown is 0, not null", zeroEF.breakdown.emergencyFund === 0);

// 4. Zero income edge case should not throw / NaN
const zeroIncome = computeHealthScore({
  income: 0,
  expense: 0,
  budgetLimit: 0,
  budgetSpent: 0,
  holdingTypesCount: 0,
  emergencyFundAmount: null,
  monthlyExpenseAvg: 0,
  totalDebt: null,
  totalAssets: 0,
});
assert("zero-income edge case doesn't produce NaN", !Number.isNaN(zeroIncome.score), `got ${zeroIncome.score}`);
assert("zero-income edge case score is a finite number", Number.isFinite(zeroIncome.score));

// 5. Score is always within [0, 100]
for (const income of [0, 1000, 50000]) {
  for (const expense of [0, 500, 100000]) {
    const r = computeHealthScore({
      income, expense, budgetLimit: 1000, budgetSpent: expense,
      holdingTypesCount: 3, emergencyFundAmount: 500, monthlyExpenseAvg: 1000,
      totalDebt: 200, totalAssets: 5000,
    });
    assert(`score in range for income=${income} expense=${expense}`, r.score >= 0 && r.score <= 100, `got ${r.score}`);
  }
}

// --- spendingAnomaly.ts ---

const mkTx = (id: number, amount: number, categoryId: number, categoryName: string, date: Date) => ({
  id, amount, type: "EXPENSE" as const, date, category: { id: categoryId, name: categoryName },
});

// Category with a stable history of ~1000/month; one 5000 transaction this month should flag
const history = [1, 2, 3, 4, 5].map((i) => mkTx(i, 1000 + i * 10, 1, "Groceries", new Date(2026, i - 7, 1)));
const thisMonth = [mkTx(100, 5000, 1, "Groceries", new Date())];
const anomalies = detectSpendingAnomalies(thisMonth, history);
assert("large outlier transaction is flagged", anomalies.some((a) => a.transactionId === 100), JSON.stringify(anomalies));

// Normal transaction close to baseline should NOT be flagged
const normalTx = [mkTx(101, 1010, 1, "Groceries", new Date())];
const noAnomalies = detectSpendingAnomalies(normalTx, history);
assert("normal transaction near baseline is not flagged", noAnomalies.length === 0, JSON.stringify(noAnomalies));

// Small amounts below the $250 floor should never be flagged even if "unusual"
const tinyTx = [mkTx(102, 50, 2, "Misc", new Date())];
const tinyAnomalies = detectSpendingAnomalies(tinyTx, []);
assert("sub-$250 transaction with no history is not flagged", tinyAnomalies.length === 0, JSON.stringify(tinyAnomalies));

// First-time category spend > ₹250 should not auto-flag when history is sparse/non-existent
const firstTimeCategory = [mkTx(103, 900, 3, "Electronics", new Date())];
const firstTimeAnomalies = detectSpendingAnomalies(firstTimeCategory, []);
assert(
  "first-time category spend is not flagged without enough prior history",
  firstTimeAnomalies.length === 0,
  JSON.stringify(firstTimeAnomalies)
);

// Historical baseline for monthly/yearly must exclude the active target period (lt targetStart)
const baselineFilterWithTarget = buildHistoricalBaselineFilter(new Date(2026, 2, 1), new Date(2026, 8, 1));
assert(
  "baseline filter includes lt targetStart when targetStart is set",
  baselineFilterWithTarget.gte.getTime() === new Date(2026, 2, 1).getTime() &&
    baselineFilterWithTarget.lt?.getTime() === new Date(2026, 8, 1).getTime(),
  JSON.stringify(baselineFilterWithTarget)
);

const baselineFilterAllTime = buildHistoricalBaselineFilter(new Date(2026, 2, 1), null);
assert(
  "baseline filter omits lt when targetStart is null",
  baselineFilterAllTime.gte.getTime() === new Date(2026, 2, 1).getTime() && baselineFilterAllTime.lt === undefined,
  JSON.stringify(baselineFilterAllTime)
);

const lowSavingsAndConcentrationRecs = buildHealthRecommendations({
  period: "monthly",
  income: 100000,
  expense: 93000,
  budgetLimit: 100000,
  budgetSpent: 93000,
  anomaliesCount: 0,
  emergencyFundAmount: 50000,
  holdingTypesCount: 1,
  savingsRateRaw: 0.07,
  score: 65,
});

assert(
  "recommendations include savings-rate branch",
  lowSavingsAndConcentrationRecs.some((r) => r.toLowerCase().includes("savings rate is")),
  JSON.stringify(lowSavingsAndConcentrationRecs)
);

assert(
  "recommendations include diversification branch",
  lowSavingsAndConcentrationRecs.some((r) => r.toLowerCase().includes("concentrated in a single asset type")),
  JSON.stringify(lowSavingsAndConcentrationRecs)
);

const positiveRecs = buildHealthRecommendations({
  period: "yearly",
  income: 1200000,
  expense: 700000,
  budgetLimit: 800000,
  budgetSpent: 700000,
  anomaliesCount: 0,
  emergencyFundAmount: 400000,
  holdingTypesCount: 4,
  savingsRateRaw: (1200000 - 700000) / 1200000,
  score: 86,
});

assert(
  "strong score with no negatives gets positive reinforcement",
  positiveRecs.length === 1 && positiveRecs[0].toLowerCase().includes("strong financial shape"),
  JSON.stringify(positiveRecs)
);

// --- New Redesign Unit Tests: Financial Health & Decision Support ---

// 1. Diversification: Concentration penalty (HHI) vs multiple balanced assets
const concentratedHoldings = computeHealthScore({
  income: 100000,
  expense: 60000,
  budgetLimit: 60000,
  budgetSpent: 55000,
  holdings: [
    { type: "STOCK", value: 95000 },
    { type: "CRYPTO", value: 5000 },
  ],
  totalAssets: 100000,
  emergencyFundAmount: 50000,
  monthlyExpenseAvg: 10000,
});

const balancedHoldings = computeHealthScore({
  income: 100000,
  expense: 60000,
  budgetLimit: 60000,
  budgetSpent: 55000,
  holdings: [
    { type: "STOCK", value: 35000 },
    { type: "MUTUAL_FUND", value: 25000 },
    { type: "FIXED_DEPOSIT", value: 25000 },
    { type: "GOLD", value: 15000 },
  ],
  totalAssets: 100000,
  emergencyFundAmount: 50000,
  monthlyExpenseAvg: 10000,
});

assert(
  "balanced multi-asset portfolio scores strictly higher on diversification than 95% concentrated portfolio",
  balancedHoldings.breakdown.diversification !== null &&
    concentratedHoldings.breakdown.diversification !== null &&
    balancedHoldings.breakdown.diversification > concentratedHoldings.breakdown.diversification,
  `balanced=${balancedHoldings.breakdown.diversification} concentrated=${concentratedHoldings.breakdown.diversification}`
);

// 2. Budget Health: Category overspending penalty even when total spent is within total limit
const cleanBudget = computeHealthScore({
  income: 100000,
  expense: 50000,
  budgetLimit: 60000,
  budgetSpent: 50000,
  categoryBudgets: [
    { name: "Food", limit: 20000, spent: 18000 },
    { name: "Rent", limit: 30000, spent: 25000 },
    { name: "Shopping", limit: 10000, spent: 7000 },
  ],
  totalAssets: 50000,
  holdingTypesCount: 3,
});

const breachedCategoryBudget = computeHealthScore({
  income: 100000,
  expense: 50000, // Same total spend within total limit (50000 <= 60000)
  budgetLimit: 60000,
  budgetSpent: 50000,
  categoryBudgets: [
    { name: "Food", limit: 10000, spent: 25000 }, // 150% over budget!
    { name: "Rent", limit: 40000, spent: 20000 },
    { name: "Shopping", limit: 10000, spent: 5000 },
  ],
  totalAssets: 50000,
  holdingTypesCount: 3,
});

assert(
  "category-level overspending is penalized even when total spending is within total budget",
  (cleanBudget.breakdown.budgetDiscipline ?? 0) > (breachedCategoryBudget.breakdown.budgetDiscipline ?? 0),
  `clean=${cleanBudget.breakdown.budgetDiscipline} breached=${breachedCategoryBudget.breakdown.budgetDiscipline}`
);

// 3. Emergency Fund: Liquid assets (FD + liquid mutual funds) and essential expenses
const liquidAssetsScore = computeHealthScore({
  income: 100000,
  expense: 40000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdingTypesCount: 2,
  emergencyFundAmount: null, // No explicit emergency goal set
  liquidPortfolioAssets: 120000, // Has 120k in Fixed Deposits / liquid funds
  monthlyEssentialExpense: 20000, // Covers 6 months of essential living costs!
  monthlyExpenseAvg: 40000,
  totalAssets: 200000,
});

assert(
  "liquid portfolio assets are credited toward emergency resilience",
  liquidAssetsScore.breakdown.emergencyFund !== null && (liquidAssetsScore.breakdown.emergencyFund ?? 0) >= 90,
  `got ${liquidAssetsScore.breakdown.emergencyFund}`
);

// 4. Multi-month Smoothing: One unusual month does not completely crush the score
const smoothedSingleSpike = computeHealthScore({
  income: 100000,
  expense: 95000, // Spike from an unusual one-off medical expense
  budgetLimit: 70000,
  budgetSpent: 95000,
  anomalousExpenseAmount: 35000, // One-off anomaly detected
  rollingSavingsRate: 0.35, // Past 6 months had consistent 35% savings rate
  holdingTypesCount: 3,
  totalAssets: 100000,
});

const unsmoothedChronicSpender = computeHealthScore({
  income: 100000,
  expense: 95000,
  budgetLimit: 70000,
  budgetSpent: 95000,
  anomalousExpenseAmount: 0,
  rollingSavingsRate: 0.05, // Chronic low saver
  holdingTypesCount: 3,
  totalAssets: 100000,
});

assert(
  "multi-month smoothing buffers isolated unusual spike when historical savings baseline is strong",
  (smoothedSingleSpike.breakdown.savingsRate ?? 0) > (unsmoothedChronicSpender.breakdown.savingsRate ?? 0) ||
    smoothedSingleSpike.score > unsmoothedChronicSpender.score,
  `smoothed=${smoothedSingleSpike.score} unsmoothed=${unsmoothedChronicSpender.score}`
);

// 5. Debt Health: DTI evaluation when debt data is present vs null when missing
const healthyDTI = computeHealthScore({
  income: 100000,
  expense: 40000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdingTypesCount: 3,
  totalAssets: 100000,
  monthlyDebtPayments: 12000, // 12% DTI -> Healthy
});

const severeDTI = computeHealthScore({
  income: 100000,
  expense: 80000,
  budgetLimit: 50000,
  budgetSpent: 80000,
  holdingTypesCount: 3,
  totalAssets: 100000,
  monthlyDebtPayments: 55000, // 55% DTI -> High risk
});

assert(
  "healthy DTI scores significantly higher on debtRatio than severe DTI",
  (healthyDTI.breakdown.debtRatio ?? 0) > (severeDTI.breakdown.debtRatio ?? 0),
  `healthyDTI=${healthyDTI.breakdown.debtRatio} severeDTI=${severeDTI.breakdown.debtRatio}`
);

// 6. Confidence & Explainability: Data completeness & targeted recommendations
assert("confidence score is provided and structured", healthyDTI.confidence.score > 0 && healthyDTI.confidence.level !== undefined);
assert("explainability returns top actions", healthyDTI.explainability.topActions.length > 0);
assert("rating label is assigned", ["Excellent", "Good", "Fair", "Needs Attention"].includes(healthyDTI.rating));

// 7. Weekly Monitoring
import { computeWeeklyMonitoring, computeYearlyProgress } from "../healthScore";

const weeklyTest = computeWeeklyMonitoring({
  weekNumber: 2,
  weekStart: new Date(2026, 9, 8),
  weekEnd: new Date(2026, 9, 14),
  weeklyIncome: 25000,
  weeklyExpense: 12000,
  prevWeekExpense: 9000, // +33% increase
  monthlyBudgetLimit: 50000,
  monthToDateExpense: 21000,
  daysPassedInMonth: 14,
  totalDaysInMonth: 31,
  weeklyAnomaliesCount: 1,
});

assert("weekly monitoring net cash flow is positive", weeklyTest.netCashFlow === 13000);
assert("weekly monitoring flags WoW increase", weeklyTest.weekOverWeek.direction === "increased");
assert("weekly monitoring produces smart alerts", weeklyTest.alerts.length > 0);

// 8. Yearly Financial Progress
const insufficientYearly = computeYearlyProgress({
  year: 2026,
  monthlySnapshots: [
    { month: 1, monthName: "January", score: 75, savingsRate: 20, netCashFlow: 15000 },
  ],
});
assert("yearly progress requires >= 2 months", insufficientYearly.isDataSufficient === false);
assert("insufficient data reason is clearly populated", typeof insufficientYearly.insufficientDataReason === "string");

const sufficientYearly = computeYearlyProgress({
  year: 2026,
  monthlySnapshots: [
    { month: 1, monthName: "January", score: 72, savingsRate: 15, netCashFlow: 10000 },
    { month: 2, monthName: "February", score: 76, savingsRate: 20, netCashFlow: 14000 },
    { month: 3, monthName: "March", score: 83, savingsRate: 25, netCashFlow: 18000 },
  ],
  savingsGrowthPct: 10,
  emergencyFundGrowthAmount: 30000,
  investmentGrowthPct: 12,
  goalsAchievedCount: 2,
  totalGoalsCount: 3,
  budgetAdherenceTrend: "improving",
});

assert("sufficient yearly progress produces score", sufficientYearly.isDataSufficient === true && (sufficientYearly.progressScore ?? 0) >= 75);
assert("trajectory points since start is tracked", sufficientYearly.pointsSinceStart === 11);
assert("narrative summary is generated", sufficientYearly.narrativeSummary.length > 0);

// ============================================================================
// 9. NEW REGRESSION TESTS FOR CRITICAL EDGE CASES
// ============================================================================

// A. Missing budgets: NEVER treat as 100 / perfect score
const missingBudgetScore = computeHealthScore({
  income: 100000,
  expense: 70000,
  budgetLimit: 0,
  budgetSpent: 0,
  categoryBudgets: [],
  holdingTypesCount: 4,
  holdings: [
    { type: "STOCK", value: 40000 },
    { type: "MUTUAL_FUND", value: 30000 },
    { type: "GOLD", value: 20000 },
    { type: "FIXED_DEPOSIT", value: 10000 },
  ],
  emergencyFundAmount: 50000,
  monthlyExpenseAvg: 10000,
  totalAssets: 100000,
});
assert("missing budgets results in budgetDiscipline breakdown null", missingBudgetScore.breakdown.budgetDiscipline === null);
assert("missing budgets marks component status unavailable", missingBudgetScore.componentDetails?.budgetDiscipline.status === "unavailable");
assert("missing budgets redistributes weight and does not inject fake 100", missingBudgetScore.score > 0);

// B. Budget adherence denominator consistency: unbudgeted expenses do not penalize category budgets
const budgetAdherenceConsistency = computeHealthScore({
  income: 100000,
  expense: 80000, // 80k total user expenses (e.g. 70k unbudgeted rent/taxes)
  budgetLimit: 10000,
  budgetSpent: 80000,
  categoryBudgets: [
    { name: "Groceries", limit: 10000, spent: 8000 }, // 8k out of 10k -> well within budget!
  ],
  totalAssets: 50000,
  holdingTypesCount: 2,
});
assert(
  "budget discipline aligns with category budget spending rather than penalizing for unbudgeted expenses",
  (budgetAdherenceConsistency.breakdown.budgetDiscipline ?? 0) >= 90,
  `got ${budgetAdherenceConsistency.breakdown.budgetDiscipline}`
);

// C. Diversification denominator consistency: shares sum to 100% even if totalAssets does not match holdings sum
const mismatchedTotalAssets = computeHealthScore({
  income: 100000,
  expense: 50000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdings: [
    { type: "STOCK", value: 50000 },
    { type: "MUTUAL_FUND", value: 50000 },
  ],
  totalAssets: 500000, // totalAssets is 500k, but holdings sum is 100k
  holdingTypesCount: 2,
});
assert(
  "diversification computes shares against holding values consistently",
  (mismatchedTotalAssets.breakdown.diversification ?? 0) >= 60,
  `got ${mismatchedTotalAssets.breakdown.diversification}`
);

// D. Missing asset valuations: never treat as 0 or 100
const unvaluedHoldings = computeHealthScore({
  income: 100000,
  expense: 50000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  holdings: [
    { type: "STOCK", value: 0 },
    { type: "MUTUAL_FUND", value: 0 },
  ],
  totalAssets: 0,
  holdingTypesCount: 0,
});
assert("unvalued holdings result in diversification null", unvaluedHoldings.breakdown.diversification === null);
assert("unvalued holdings mark component status unavailable", unvaluedHoldings.componentDetails?.diversification.status === "unavailable");

// E. Missing income: 0 income with 0 expense is unavailable, not fake 25% or 0%
const noCashFlow = computeHealthScore({
  income: 0,
  expense: 0,
  budgetLimit: 0,
  budgetSpent: 0,
  holdingTypesCount: 0,
  totalAssets: 0,
});
assert("no cash flow results in savingsRate null", noCashFlow.breakdown.savingsRate === null);
assert("no cash flow marks savingsRate status unavailable", noCashFlow.componentDetails?.savingsRate.status === "unavailable");

// F. Missing debt: 0 income and 0 debt payments does not create a fake 95 score
const zeroIncomeZeroDebt = computeHealthScore({
  income: 0,
  expense: 0,
  budgetLimit: 0,
  budgetSpent: 0,
  holdingTypesCount: 0,
  totalDebt: null,
  monthlyDebtPayments: 0,
  totalAssets: 0,
});
assert("zero income with 0 debt payments and no assets is null, not 95", zeroIncomeZeroDebt.breakdown.debtRatio === null);

// G. Emergency fund additive combination: combines cash savings goal and liquid assets without capping at Math.max
const combinedEF = computeHealthScore({
  income: 100000,
  expense: 40000,
  budgetLimit: 50000,
  budgetSpent: 40000,
  emergencyFundAmount: 60000, // 3 months of 20k essentials
  liquidPortfolioAssets: 60000, // another 3 months of 20k essentials
  monthlyEssentialExpense: 20000,
  monthlyExpenseAvg: 40000,
  totalAssets: 100000,
  holdingTypesCount: 2,
});
assert(
  "emergency fund combines cash savings and liquid assets to reach full 6 months coverage",
  (combinedEF.breakdown.emergencyFund ?? 0) === 100,
  `got ${combinedEF.breakdown.emergencyFund}`
);

// H. Missing expense baseline in emergency fund: never assume 6 months / 100
const efNoExpenses = computeHealthScore({
  income: 0,
  expense: 0,
  budgetLimit: 0,
  budgetSpent: 0,
  emergencyFundAmount: 50000,
  monthlyEssentialExpense: 0,
  monthlyExpenseAvg: 0,
  totalAssets: 50000,
  holdingTypesCount: 1,
});
assert("emergency fund with no recorded expenses is null, not assumed 6 months", efNoExpenses.breakdown.emergencyFund === null);

// I. Yearly progress: does not invent 65/70 defaults for missing pillars
const sparseYearly = computeYearlyProgress({
  year: 2026,
  monthlySnapshots: [
    { month: 1, monthName: "January", score: 70, savingsRate: 15, netCashFlow: 10000 },
    { month: 2, monthName: "February", score: 75, savingsRate: 20, netCashFlow: 15000 },
  ],
  savingsGrowthPct: 15,
  emergencyFundGrowthAmount: null, // missing
  debtReductionPct: null, // missing
  investmentGrowthPct: null, // missing
  totalGoalsCount: 0, // missing
  budgetAdherenceTrend: "insufficient_data", // missing
});
assert("sparse yearly progress omits missing emergency resilience score", sparseYearly.pillars.emergencyResilience.score === null);
assert("sparse yearly progress omits missing investment growth score", sparseYearly.pillars.investmentGrowth.score === null);
assert("sparse yearly progress omits missing goal score", sparseYearly.pillars.goalProgress.score === null);
assert("sparse yearly progress produces score weighted strictly by available pillars", sparseYearly.progressScore !== null && sparseYearly.progressScore > 0);

// J. Non-misleading recommendations when data is insufficient
const emptyDataRecs = buildHealthRecommendations({
  period: "monthly",
  income: 0,
  expense: 0,
  budgetLimit: 0,
  budgetSpent: 0,
  anomaliesCount: 0,
  emergencyFundAmount: null,
  holdingTypesCount: 0,
  savingsRateRaw: 0,
  score: 0,
});
assert("empty data recommendations do not accuse user of spending outrunning income", !emptyDataRecs.some((r) => r.includes("spending is outrunning income")));
assert("empty data recommendations prompt user to record transactions", emptyDataRecs.some((r) => r.includes("Log your transactions")));

const expenseOnlyRecs = buildHealthRecommendations({
  period: "monthly",
  income: 0,
  expense: 50000,
  budgetLimit: 0,
  budgetSpent: 0,
  anomaliesCount: 0,
  emergencyFundAmount: null,
  holdingTypesCount: 0,
  savingsRateRaw: 0,
  score: 15,
});
assert("expense only recommendations prompt for income rather than claiming 0% savings rate", expenseOnlyRecs.some((r) => r.includes("No income has been recorded")));
assert("zero investments does not claim single-asset concentration", !expenseOnlyRecs.some((r) => r.includes("concentrated in a single asset type")));

// K. Practical target generation in priority recommendations
const actionResult = computeHealthScore({
  income: 100000,
  expense: 115000, // deficit of 15,000
  budgetLimit: 40000,
  budgetSpent: 48000,
  categoryBudgets: [
    { name: "Dining", limit: 10000, spent: 18000 },
  ],
  monthlyEssentialExpense: 60000,
  emergencyFundAmount: 50000,
  liquidPortfolioAssets: 50000,
  holdings: [
    { type: "EQUITY", value: 100000 },
  ],
  totalDebt: 300000,
  monthlyDebtPayments: 40000, // 40% DTI
});

const topActions = actionResult.explainability.topActions;
assert("top actions contains up to 3 priority items", topActions.length > 0 && topActions.length <= 3);
assert("priority action includes practical target string", topActions.every((a) => typeof a.target === "string" && a.target.length > 0));
const deficitAction = topActions.find((a) => a.title.includes("Stop Spending"));
assert("deficit action includes actual calculated rupee target", deficitAction !== undefined && Boolean(deficitAction.target?.includes("₹15,000")));

// L. Missing income handling (expense only)
const expenseOnlyScore = computeHealthScore({
  income: 0,
  expense: 45000,
  budgetLimit: 0,
  budgetSpent: 0,
});
assert("expense only score does not claim 0% savings rate in breakdown", expenseOnlyScore.breakdown.savingsRate === null);
assert("expense only score does not claim 0% in component displayValue", expenseOnlyScore.componentDetails?.savingsRate.displayValue !== "0%");
assert("expense only score provides action to add income", expenseOnlyScore.explainability.topActions.some((a) => a.title.includes("Add Your Monthly Income")));

// M. Everyday English executive summary and component explanations
assert("summary uses simple everyday language", typeof actionResult.explainability.summary === "string" && !actionResult.explainability.summary.includes("HHI"));
assert("component explanation uses plain language", typeof actionResult.componentDetails?.budgetDiscipline.explanation === "string");

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
