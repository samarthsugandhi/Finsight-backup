import { healthScoreService } from "@/services/healthScore.service";
import { retrieverService } from "@/services/retriever.service";
import { askOllama } from "@/ai/ollama.service";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function compareMonth(current: number, previous: number) {
  const delta = current - previous;
  const pct = previous > 0 ? (delta / previous) * 100 : current > 0 ? 100 : 0;
  return { delta, pct };
}

/** Formats a gain/loss percentage as "+12.4%" or "−3.1%" with sign. */
function formatGainPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

const PORTFOLIO_DISCLAIMER = "⚠️ Not financial advice — for informational purposes only.";

function buildAnswer(question: string, context: Awaited<ReturnType<typeof retrieverService.retrieve>>, health: Awaited<ReturnType<typeof healthScoreService.compute>>) {
  const comparison = compareMonth(context.currentMonth.expense, context.previousMonth.expense);
  const topCategories = Object.entries(context.currentMonth.categoryTotals)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const topBudgetPressure = context.budgets
    .map((budget) => ({ ...budget, ratio: budget.monthlyLimit > 0 ? budget.spent / budget.monthlyLimit : 0 }))
    .sort((left, right) => right.ratio - left.ratio)
    .slice(0, 3);

  if (context.intent === "spending_increase") {
    return [
      `Your expenses are ${comparison.delta >= 0 ? "up" : "down"} ${formatMoney(Math.abs(comparison.delta))} (${comparison.pct.toFixed(1)}%) versus last month.`,
      topCategories.length > 0
        ? `The largest spend areas this month are ${topCategories.map(([name, amount]) => `${name} (${formatMoney(amount)})`).join(", ")}.`
        : "I could not identify a category breakdown for this month.",
      health.anomalies?.length
        ? `I also flagged ${health.anomalies.length} unusual spend pattern${health.anomalies.length > 1 ? "s" : ""} that may be inflating the month.`
        : "I did not find a strong anomaly spike in the current month.",
      "Best next action: reduce the top discretionary category first, then review recurring charges and subscriptions.",
    ].join("\n");
  }

  if (context.intent === "budget_overview") {
    return [
      `Your current monthly expense is ${formatMoney(context.currentMonth.expense)} against ${formatMoney(context.budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0))} of active budget limits.`,
      topBudgetPressure.length > 0
        ? `Highest budget pressure is in ${topBudgetPressure.map((budget) => `${budget.categoryName} (${(budget.ratio * 100).toFixed(0)}%)`).join(", ")}.`
        : "No active budget pressure was detected.",
      "Recommendation: keep the most overspent category under watch for the rest of the month and move unused budget into savings or debt reduction.",
    ].join("\n");
  }

  if (context.intent === "investment_overview") {
    return [
      `You currently hold ${context.portfolio.holdings} investment positions with a current value of ${formatMoney(context.portfolio.currentValue)} versus ${formatMoney(context.portfolio.invested)} invested.`,
      `Diversification spans ${context.portfolio.diversification} holding type${context.portfolio.diversification === 1 ? "" : "s"}.`,
      context.portfolio.currentValue >= context.portfolio.invested
        ? "Your portfolio is in profit overall; continue tracking allocation balance and rebalancing when one asset class dominates."
        : "Your portfolio is below cost basis; avoid panic selling and focus on diversification plus long-term allocation discipline.",
    ].join("\n");
  }

  if (context.intent === "portfolio_action") {
    const actionable = context.portfolio.actionableHoldings;

    if (actionable.length === 0) {
      return [
        "I don't have live price data for your current holdings (STOCK/CRYPTO/MUTUAL_FUND), so I can't make specific buy/sell suggestions right now.",
        "You could visit the Portfolio page to check if market data is available for your symbols.",
        PORTFOLIO_DISCLAIMER,
      ].join("\n");
    }

    const lines: string[] = [];

    // Top concentrated holding — primary suggestion candidate
    const top = actionable[0];
    if (top.concentrationPct >= 30) {
      const gainLabel = formatGainPct(top.gainPct);
      lines.push(
        `You could consider trimming your position in ${top.name} — it currently represents ${top.concentrationPct.toFixed(1)}% of your portfolio (${gainLabel} unrealised). High concentration in a single holding increases risk if that asset underperforms.`
      );
    } else if (top.gainPct > 20) {
      lines.push(
        `You could consider taking partial profits on ${top.name}, which is up ${formatGainPct(top.gainPct)} and is your largest position at ${top.concentrationPct.toFixed(1)}% of the portfolio. This is only a suggestion — locking in gains is a personal decision.`
      );
    } else {
      lines.push(
        `Your portfolio looks reasonably balanced. The largest position is ${top.name} at ${top.concentrationPct.toFixed(1)}% of total value (${formatGainPct(top.gainPct)}). No immediate concentration concern was detected.`
      );
    }

    // Secondary holding with largest loss — worth reviewing
    const biggestLoser = [...actionable].sort((a, b) => a.gainPct - b.gainPct)[0];
    if (biggestLoser && biggestLoser.gainPct < -10 && biggestLoser.name !== top.name) {
      lines.push(
        `You could also review ${biggestLoser.name}, which is down ${formatGainPct(biggestLoser.gainPct)}. Whether to hold, average down, or exit depends on your original thesis for this holding.`
      );
    }

    lines.push("Any buy or sell always requires you to log it manually on the Portfolio page — nothing is executed here.");
    lines.push(PORTFOLIO_DISCLAIMER);

    return lines.join("\n");
  }

  if (context.intent === "health_review") {
    return [
      `Your current financial health score is ${health.score}/100.`,
      `Strongest areas: ${Object.entries(health.breakdown)
        .map(([label, val]) => [label, val ?? 0] as [string, number])
        .sort((left, right) => right[1] - left[1])
        .slice(0, 2)
        .map(([label, score]) => `${label} (${score}/100)`)
        .join(", ")}.`,
      health.recommendations?.length
        ? `Priority recommendations: ${health.recommendations.join(" ")}`
        : "Your score is stable, but keeping budget discipline high will lift it further.",
    ].join("\n");
  }

  if (context.intent === "goal_progress") {
    const bestGoal = context.goals[0];
    const lines = [
      context.goals.length > 0
        ? `Your leading goal is "${bestGoal.title}" at ${bestGoal.progressPct.toFixed(1)}% complete.`
        : "You do not have any active goals yet.",
      context.goals.length > 1
        ? `You have ${context.goals.length - 1} other active goal${context.goals.length - 1 === 1 ? "" : "s"} under tracking.`
        : "",
    ];

    if (context.availableSavings > 0 && context.goals.length > 0) {
      const underfunded = [...context.goals].sort((a, b) => a.progressPct - b.progressPct).slice(0, 2);
      const suggestion = underfunded
        .map((g) => `${formatMoney(Math.min(context.availableSavings / underfunded.length, g.targetAmount - g.savedAmount))} to "${g.title}"`)
        .join(" and ");
      lines.push(
        `You currently have ${formatMoney(context.availableSavings)} in unallocated savings. You could consider allocating ${suggestion} — but this is only a suggestion; nothing is allocated until you confirm it yourself on the Goals page.`
      );
    } else if (context.goals.length > 0) {
      lines.push("All of your current savings are already allocated to goals.");
    }

    lines.push("Best action: automate a direct transfer to savings on your salary day to maintain this goal trajectory.");
    return lines.filter(Boolean).join("\n");
  }

  return [
    `I retrieved your profile context. Active cash flow details: monthly income is ${formatMoney(context.currentMonth.income)} vs expenses of ${formatMoney(context.currentMonth.expense)}.`,
    `Emergency goals fund: ${context.currentMonth.savings >= 0 ? "retaining net savings" : "outrunning incoming streams"}.`,
    "Ask a more specific question like 'why did my expenses increase?' or 'how healthy are my finances?' for a sharper recommendation.",
  ].join("\n");
}

/** Serializes actionable holdings as a compact markdown table for the LLM prompt. */
function buildHoldingsTable(holdings: Awaited<ReturnType<typeof retrieverService.retrieve>>["portfolio"]["actionableHoldings"]): string {
  if (holdings.length === 0) return "No live-priced STOCK/CRYPTO/MUTUAL_FUND holdings found.";
  const header = "| Name | Type | Invested | Current Value | Gain/Loss % | Portfolio % |";
  const sep =    "| --- | --- | --- | --- | --- | --- |";
  const rows = holdings.map(
    (h) =>
      `| ${h.name} | ${h.type} | ₹${Math.round(h.investedAmount).toLocaleString("en-IN")} | ₹${Math.round(h.currentValue).toLocaleString("en-IN")} | ${formatGainPct(h.gainPct)} | ${h.concentrationPct.toFixed(1)}% |`
  );
  return [header, sep, ...rows].join("\n");
}

export const advisorService = {
  async answer(userId: number, question: string) {
    const [retrieval, health] = await Promise.all([
      retrieverService.retrieve(userId, question),
      healthScoreService.compute(userId),
    ]);

    const holdingsTable = buildHoldingsTable(retrieval.portfolio.actionableHoldings);

    const prompt = `
You are Finsight, a personal finance assistant.
You have access to the user's complete financial profile context, including health scores, spending anomalies, monthly budgets, goals, and portfolio holdings.

Financial Profile:
- Current Month Income: ₹${retrieval.currentMonth.income}
- Current Month Expense: ₹${retrieval.currentMonth.expense}
- Current Month Savings: ₹${retrieval.currentMonth.savings}
- Previous Month Income: ₹${retrieval.previousMonth.income}
- Previous Month Expense: ₹${retrieval.previousMonth.expense}
- Previous Month Savings: ₹${retrieval.previousMonth.savings}
- Available (Unallocated) Savings: ₹${retrieval.availableSavings}
- Budgets: ${JSON.stringify(retrieval.budgets)}
- Portfolio Summary: ${JSON.stringify({ holdings: retrieval.portfolio.holdings, invested: retrieval.portfolio.invested, currentValue: retrieval.portfolio.currentValue, diversification: retrieval.portfolio.diversification })}
- Goals: ${JSON.stringify(retrieval.goals)}
- Recent Transactions: ${JSON.stringify(retrieval.recentTransactions)}
- Health Score: ${health.score}/100
- Financial Anomalies: ${JSON.stringify(health.anomalies)}

Actionable Portfolio Holdings (STOCK/CRYPTO/MUTUAL_FUND only — sorted by portfolio concentration):
${holdingsTable}

User Question:
${question}

Answer the user's question accurately based on the profile data. Keep your explanation professional, direct, and actionable. Do not make up any numbers.

If relevant, you may SUGGEST how the user could allocate their Available (Unallocated) Savings across their goals — e.g. "You could consider allocating ₹X to Goal A and ₹Y to Goal B." You must NEVER claim to have performed, executed, or completed an allocation yourself — allocating savings to a goal always requires the user to explicitly confirm it themselves in the Goals page UI. Frame any allocation numbers strictly as a suggestion for the user to review and confirm.

## Portfolio Guidance Rules (only when portfolio data is present):
1. SUGGEST, never instruct. Use language like "You could consider…", "It may be worth reviewing…", or "One option to think about is…". Never say "You should sell X" or "Buy more of Y now".
2. Always explain the reasoning — cite the gain/loss % and/or concentration % that motivates the suggestion.
3. Never claim to have executed, queued, or scheduled any trade. Any buy or sell always requires the user to log it manually via the Portfolio page.
4. If the user says "give me another option", "I don't want to sell that one", or similar follow-up refinements, offer an alternative holding or approach rather than repeating the prior suggestion.
5. End every portfolio-guidance response with this exact line on its own line:
   ⚠️ Not financial advice — for informational purposes only.
`;

    let answer = "";
    try {
      answer = await askOllama(prompt);
    } catch (e) {
      // Fallback to rules-based template response if Ollama fails/is offline
      answer = buildAnswer(question, retrieval, health);
    }

    const confidence = retrieval.intent === "general_finance" ? 0.68 : 0.86;

    return {
      question,
      answer,
      confidence,
      intent: retrieval.intent,
      health,
      retrieval,
    };
  },
};