import { Prisma, HoldingType } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { portfolioService } from "@/services/portfolio.service";
import { QuestionnaireInput, SaveRecommendationInput } from "@/validators/recommendation.validator";

export interface AllocationItem {
  category: "MUTUAL_FUND" | "FIXED_DEPOSIT" | "STOCK" | "GOLD";
  name: string;
  percentage: number;
  amount: number;
  rationale: string;
  risks: string;
}

export interface RecommendationResult {
  selectedRiskLevel: "LOW" | "MODERATE" | "HIGH";
  computedRiskScore: number;
  computedRiskProfile: "LOW" | "MODERATE" | "HIGH";
  riskTolerance: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  riskCapacity: "LOW" | "MODERATE" | "HIGH";
  investmentHorizon: string;
  hasConflict: boolean;
  conflictReason: string | null;
  priorityAlert: string | null;
  summaryExplanation: string;
  disclaimer: string;
  investmentAmount: number;
  allocations: AllocationItem[];
}

const DEFAULT_ALLOCATIONS: Record<"LOW" | "MODERATE" | "HIGH", Array<Omit<AllocationItem, "amount">>> = {
  LOW: [
    {
      category: "FIXED_DEPOSIT",
      name: "Fixed Deposits & Fixed Income",
      percentage: 60,
      rationale: "Provides predictable fixed interest, capital stability under deposit insurance guidelines, and reliable liquidity shielded from market turbulence.",
      risks: "Returns may barely match inflation after tax deductions.",
    },
    {
      category: "MUTUAL_FUND",
      name: "Equity & Balanced Mutual Funds",
      percentage: 20,
      rationale: "Conservative allocation to large-cap and hybrid funds to help beat inflation over the medium term.",
      risks: "Subject to market volatility and short-term drawdowns.",
    },
    {
      category: "GOLD",
      name: "Gold (Physical, Digital or SGB)",
      percentage: 15,
      rationale: "Proven crisis hedge and safe-haven asset providing portfolio resilience during macroeconomic stress.",
      risks: "Does not generate dividends or compounding interest.",
    },
    {
      category: "STOCK",
      name: "Index ETFs & Blue-Chip Equities",
      percentage: 5,
      rationale: "Small, controlled exposure to premier market indices for long-term compounding participation.",
      risks: "Direct stock exposure carries price volatility.",
    },
  ],
  MODERATE: [
    {
      category: "MUTUAL_FUND",
      name: "Diversified Equity Mutual Funds",
      percentage: 50,
      rationale: "Balanced foundation spanning large, mid-cap, and flexi-cap funds to drive inflation-beating capital growth.",
      risks: "Moderate market swings during economic cycles.",
    },
    {
      category: "FIXED_DEPOSIT",
      name: "Fixed Deposits & Debt",
      percentage: 25,
      rationale: "Capital foundation that stabilizes overall portfolio value and offers reliable liquidity when needed.",
      risks: "Lower upside compounding compared to equity assets.",
    },
    {
      category: "STOCK",
      name: "Direct Stocks & Sector ETFs",
      percentage: 15,
      rationale: "Selective exposure to high-conviction companies and thematic index funds for potential alpha.",
      risks: "Higher company-specific volatility than broad mutual funds.",
    },
    {
      category: "GOLD",
      name: "Gold & Sovereign Gold",
      percentage: 10,
      rationale: "Protects purchasing power and provides negative correlation to equity market corrections.",
      risks: "Price performance can be flat for extended periods.",
    },
  ],
  HIGH: [
    {
      category: "MUTUAL_FUND",
      name: "Diversified & Growth Mutual Funds",
      percentage: 45,
      rationale: "Aggressive multi-cap, mid-cap, and small-cap allocation aimed at long-term wealth compounding.",
      risks: "Substantial short-term volatility during market corrections.",
    },
    {
      category: "STOCK",
      name: "Direct Equities & Growth Stocks",
      percentage: 35,
      rationale: "Focused holdings in market leaders and high-growth sectors to maximize upside returns over 5+ years.",
      risks: "Significant price fluctuation and business risk.",
    },
    {
      category: "FIXED_DEPOSIT",
      name: "Fixed Deposits & Fixed Income",
      percentage: 10,
      rationale: "Essential liquidity cushion preventing forced liquidation of equity holdings during bear markets.",
      risks: "Low real yield in high-inflation environments.",
    },
    {
      category: "GOLD",
      name: "Gold & SGBs",
      percentage: 10,
      rationale: "Core defensive hedge ensuring portfolio survivability across all economic cycles.",
      risks: "Underperforms equities during sustained economic booms.",
    },
  ],
};

const EDUCATIONAL_DISCLAIMER =
  "These suggestions are educational estimates based on the information you provide. Investments involve risk, and returns are not guaranteed. Review the risks and consider consulting a qualified financial adviser before making investment decisions.";

export const recommendationService = {
  /**
   * Distribute a total INR amount across percentage allocations ensuring exact Rupee precision.
   */
  distributeAmount(
    amount: number,
    allocations: Array<Omit<AllocationItem, "amount">>
  ): AllocationItem[] {
    if (!amount || amount <= 0) {
      return allocations.map((a) => ({ ...a, amount: 0 }));
    }

    const roundedAmounts: number[] = allocations.map((a) =>
      Math.round((amount * a.percentage) / 100)
    );

    // Calculate rounding difference
    const totalAllocated = roundedAmounts.reduce((sum, val) => sum + val, 0);
    const diff = amount - totalAllocated;

    // Adjust the diff onto the largest allocation item
    let maxIdx = 0;
    for (let i = 1; i < allocations.length; i++) {
      if (allocations[i].percentage > allocations[maxIdx].percentage) {
        maxIdx = i;
      }
    }
    roundedAmounts[maxIdx] += diff;

    return allocations.map((a, idx) => ({
      ...a,
      amount: roundedAmounts[idx],
    }));
  },

  /**
   * Evaluates questionnaire answers and produces risk metrics and suggested allocation.
   */
  evaluate(
    answers: QuestionnaireInput,
    customInvestmentAmount?: number,
    customRiskOverride?: "LOW" | "MODERATE" | "HIGH"
  ): RecommendationResult {
    // 1. Risk Tolerance (Willingness to take market fluctuations)
    let dropScore = 50;
    if (answers.reactionToDrop === "SELL_ALL") dropScore = 10;
    else if (answers.reactionToDrop === "WAIT") dropScore = 50;
    else if (answers.reactionToDrop === "BUY_MORE") dropScore = 90;

    let expScore = 50;
    if (answers.experience === "BEGINNER") expScore = 25;
    else if (answers.experience === "INTERMEDIATE") expScore = 55;
    else if (answers.experience === "EXPERIENCED") expScore = 85;

    let prefScore = 50;
    const userSelected = customRiskOverride || answers.selectedRiskLevel || "MODERATE";
    if (userSelected === "LOW") prefScore = 20;
    else if (userSelected === "MODERATE") prefScore = 50;
    else if (userSelected === "HIGH") prefScore = 85;

    const toleranceScore = Math.round(0.5 * dropScore + 0.25 * expScore + 0.25 * prefScore);
    let riskTolerance: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE" = "MODERATE";
    if (toleranceScore < 38) riskTolerance = "CONSERVATIVE";
    else if (toleranceScore > 68) riskTolerance = "AGGRESSIVE";

    // 2. Risk Capacity (Financial ability to withstand actual losses)
    let emergencyScore = 0;
    if (answers.emergencySavings === "YES") emergencyScore = 95;
    else if (answers.emergencySavings === "PARTIALLY") emergencyScore = 40;
    else emergencyScore = 0;

    let debtScore = answers.highInterestDebt ? 0 : 95;

    let horizonScore = 50;
    if (answers.horizon === "LESS_THAN_1_YEAR") horizonScore = 10;
    else if (answers.horizon === "1_TO_3_YEARS") horizonScore = 40;
    else if (answers.horizon === "3_TO_5_YEARS") horizonScore = 70;
    else if (answers.horizon === "MORE_THAN_5_YEARS") horizonScore = 95;

    const capacityScore = Math.round(
      0.35 * emergencyScore + 0.4 * debtScore + 0.25 * horizonScore
    );
    let riskCapacity: "LOW" | "MODERATE" | "HIGH" = "MODERATE";
    if (answers.highInterestDebt || answers.emergencySavings === "NO" || capacityScore < 45) {
      riskCapacity = "LOW";
    } else if (capacityScore > 72) {
      riskCapacity = "HIGH";
    }

    // 3. Conflict Detection
    let hasConflict = false;
    let conflictReason: string | null = null;
    let priorityAlert: string | null = null;

    if (answers.highInterestDebt) {
      priorityAlert =
        "You reported having high-interest debt (e.g. credit cards or personal loans). High-interest debt typically costs 18% to 40% p.a., exceeding expected market returns. Paying off expensive debt eliminates a high guaranteed interest cost.";
    }

    if (answers.emergencySavings === "NO") {
      priorityAlert = priorityAlert
        ? `${priorityAlert} Additionally, you have no emergency savings reserve. Any sudden expense could force you to liquidate investments at an inopportune time.`
        : "You have no emergency fund. We strongly recommend setting aside 3 to 6 months of living expenses in liquid savings or fixed deposits before deploying funds into volatile markets.";
    }

    // Capacity acts as a ceiling on recommended profile
    let computedProfile: "LOW" | "MODERATE" | "HIGH" = "MODERATE";
    const isShortTermGoal =
      answers.horizon === "LESS_THAN_1_YEAR" ||
      (answers.goal === "MAJOR_PURCHASE" && answers.horizon === "1_TO_3_YEARS");
    const overallScore = Math.round(0.55 * capacityScore + 0.45 * toleranceScore);

    if (riskCapacity === "LOW" || answers.emergencySavings === "NO" || answers.highInterestDebt || isShortTermGoal) {
      computedProfile = "LOW";
    } else if (overallScore < 48 || riskTolerance === "CONSERVATIVE" || userSelected === "LOW") {
      computedProfile = "LOW";
    } else if (answers.horizon === "1_TO_3_YEARS" || answers.horizon === "3_TO_5_YEARS" || overallScore < 75 || userSelected === "MODERATE") {
      computedProfile = "MODERATE";
    } else {
      computedProfile = "HIGH";
    }

    // Check if user selected risk conflicts with capacity or short-term horizons
    if (userSelected === "HIGH" && computedProfile !== "HIGH") {
      hasConflict = true;
      conflictReason =
        `You selected High Risk, but your financial profile indicates ${computedProfile} Risk capacity. ` +
        (answers.highInterestDebt
          ? "Carrying high-interest debt limits your ability to absorb market swings. "
          : "") +
        (answers.emergencySavings === "NO"
          ? "Without an emergency fund, market drawdowns could force premature withdrawals. "
          : "") +
        (answers.horizon === "LESS_THAN_1_YEAR"
          ? "An investment horizon under 1 year is too short to recover from market downturns. "
          : "") +
        (isShortTermGoal && answers.horizon !== "LESS_THAN_1_YEAR"
          ? "Saving for a major purchase within 1 to 3 years requires capital stability rather than high equity risk. "
          : "") +
        `We suggest adopting a ${computedProfile} Risk allocation.`;
    } else if (userSelected === "MODERATE" && computedProfile === "LOW") {
      hasConflict = true;
      conflictReason = isShortTermGoal
        ? "Saving for a near-term purchase or a horizon under 3 years requires capital preservation rather than market volatility."
        : "You selected Moderate Risk, but your current emergency buffer or debt profile suggests building defensive reserves first.";
    }

    // Final profile to display suggested allocations for
    const activeProfile = customRiskOverride || computedProfile;
    const targetAmount =
      customInvestmentAmount !== undefined
        ? customInvestmentAmount
        : answers.investmentAmount !== undefined
        ? answers.investmentAmount
        : 10000;
    const baseAllocations = DEFAULT_ALLOCATIONS[activeProfile];
    const allocations = this.distributeAmount(targetAmount, baseAllocations);

    // Generate clear narrative summary
    let summaryExplanation = "";
    if (activeProfile === "LOW") {
      summaryExplanation =
        "Your profile prioritizes capital preservation and predictable stability. The majority of your capital is directed towards Fixed Deposits and defensive assets with small equity participation to hedge against inflation.";
    } else if (activeProfile === "MODERATE") {
      summaryExplanation =
        "Your profile balances wealth compounding with downside risk management. A 50% equity mutual fund allocation drives long-term capital growth, while Fixed Deposits and Gold provide a cushion against market pullbacks.";
    } else {
      summaryExplanation =
        "Your profile targets maximum long-term capital growth over a 5+ year horizon. Higher equity and stock exposure unlocks superior compounding potential, supported by small debt and gold allocations for fundamental diversification.";
    }

    return {
      selectedRiskLevel: userSelected,
      computedRiskScore: overallScore,
      computedRiskProfile: computedProfile,
      riskTolerance,
      riskCapacity,
      investmentHorizon: answers.horizon,
      hasConflict,
      conflictReason,
      priorityAlert,
      summaryExplanation,
      disclaimer: EDUCATIONAL_DISCLAIMER,
      investmentAmount: targetAmount,
      allocations,
    };
  },

  /**
   * Save or update a user's risk assessment and plan in the database.
   */
  async savePlan(userId: number, input: SaveRecommendationInput) {
    const existing = await prisma.portfolioRiskProfile.findUnique({
      where: { userId },
    });

    const data: Prisma.PortfolioRiskProfileUncheckedCreateInput = {
      userId,
      selectedRiskLevel: input.selectedRiskLevel,
      computedRiskScore: input.computedRiskScore,
      computedRiskProfile: input.computedRiskProfile,
      riskTolerance: input.riskTolerance,
      riskCapacity: input.riskCapacity,
      investmentHorizon: input.investmentHorizon,
      monthlyInvestableAmount: input.monthlyInvestableAmount
        ? new Prisma.Decimal(input.monthlyInvestableAmount)
        : null,
      hasEmergencySavings: input.hasEmergencySavings,
      hasHighInterestDebt: input.hasHighInterestDebt,
      experienceLevel: input.experienceLevel,
      answersJson: JSON.stringify(input.answers),
      plannedInvestmentAmount: input.plannedInvestmentAmount
        ? new Prisma.Decimal(input.plannedInvestmentAmount)
        : null,
      savedAllocationsJson: JSON.stringify(input.allocations),
      notes: input.notes ?? null,
    };

    let saved;
    if (existing) {
      saved = await prisma.portfolioRiskProfile.update({
        where: { userId },
        data,
      });
    } else {
      saved = await prisma.portfolioRiskProfile.create({
        data,
      });
    }

    // If requested, synchronize target percentages into PortfolioAllocationTarget
    if (input.syncToPortfolioTargets && input.allocations.length > 0) {
      const targetsToSync = input.allocations
        .filter((a) =>
          ["STOCK", "MUTUAL_FUND", "GOLD", "FIXED_DEPOSIT"].includes(a.category)
        )
        .map((a) => ({
          holdingType: a.category as HoldingType,
          targetPct: a.percentage,
        }));

      if (targetsToSync.length > 0) {
        await portfolioService.setAllocationTargets(userId, targetsToSync);
      }
    }

    return {
      success: true,
      profile: {
        ...saved,
        answers: saved.answersJson ? JSON.parse(saved.answersJson) : null,
        allocations: saved.savedAllocationsJson
          ? JSON.parse(saved.savedAllocationsJson)
          : null,
      },
    };
  },

  /**
   * Get the saved risk profile and plan for a user.
   */
  async getSavedPlan(userId: number) {
    const profile = await prisma.portfolioRiskProfile.findUnique({
      where: { userId },
    });

    if (!profile) return null;

    return {
      id: profile.id,
      userId: profile.userId,
      selectedRiskLevel: profile.selectedRiskLevel,
      computedRiskScore: profile.computedRiskScore,
      computedRiskProfile: profile.computedRiskProfile,
      riskTolerance: profile.riskTolerance,
      riskCapacity: profile.riskCapacity,
      investmentHorizon: profile.investmentHorizon,
      monthlyInvestableAmount: profile.monthlyInvestableAmount
        ? Number(profile.monthlyInvestableAmount)
        : null,
      hasEmergencySavings: profile.hasEmergencySavings,
      hasHighInterestDebt: profile.hasHighInterestDebt,
      experienceLevel: profile.experienceLevel,
      answers: profile.answersJson ? JSON.parse(profile.answersJson) : null,
      plannedInvestmentAmount: profile.plannedInvestmentAmount
        ? Number(profile.plannedInvestmentAmount)
        : null,
      allocations: profile.savedAllocationsJson
        ? JSON.parse(profile.savedAllocationsJson)
        : null,
      notes: profile.notes,
      updatedAt: profile.updatedAt,
    };
  },

  /**
   * Compare a target allocation plan against the user's actual portfolio holdings.
   */
  async compareWithPortfolio(
    userId: number,
    customTargets?: Array<{ category: string; percentage: number }>
  ) {
    const [portfolioData, savedPlan] = await Promise.all([
      portfolioService.list(userId),
      this.getSavedPlan(userId),
    ]);

    // Determine target allocations: custom targets > saved plan > default moderate
    let targets: Array<{ category: string; percentage: number }> = [];
    if (customTargets && customTargets.length > 0) {
      targets = customTargets;
    } else if (savedPlan?.allocations && savedPlan.allocations.length > 0) {
      targets = savedPlan.allocations.map((a: any) => ({
        category: a.category,
        percentage: a.percentage,
      }));
    } else {
      targets = DEFAULT_ALLOCATIONS.MODERATE.map((a) => ({
        category: a.category,
        percentage: a.percentage,
      }));
    }

    const totalPortfolioValue = portfolioData.summary.estimatedTotalValue || 0;
    const actualAllocation = portfolioData.summary.allocation || {};

    const comparisonItems = targets.map((target) => {
      const actualVal = actualAllocation[target.category] || 0;
      const actualPct =
        totalPortfolioValue > 0
          ? Number(((actualVal / totalPortfolioValue) * 100).toFixed(1))
          : 0;
      const targetPct = Number(target.percentage.toFixed(1));
      const driftPct = Number((actualPct - targetPct).toFixed(1));

      let status: "UNDERWEIGHT" | "OVERWEIGHT" | "ALIGNED" = "ALIGNED";
      if (driftPct > 3) status = "OVERWEIGHT";
      else if (driftPct < -3) status = "UNDERWEIGHT";

      let guidance = "Holdings are in line with your targeted allocation.";
      if (status === "UNDERWEIGHT") {
        guidance = `Consider directing new funds into ${target.category.replace("_", " ")} to reach your ${targetPct}% target.`;
      } else if (status === "OVERWEIGHT") {
        guidance = `Currently higher than your target. Avoid over-concentrating future deposits here.`;
      }

      return {
        category: target.category,
        targetPct,
        actualPct,
        actualValue: actualVal,
        driftPct,
        status,
        guidance,
      };
    });

    return {
      totalPortfolioValue,
      savedPlan,
      comparison: comparisonItems,
      isFullyAligned: comparisonItems.every((c) => c.status === "ALIGNED"),
      hasInvestments: portfolioData.holdings.length > 0,
    };
  },

  /**
   * Generates 3-4 suitable, beginner-friendly investment options based on
   * Risk Level, Investment Amount, and Duration.
   */
  generateInvestmentOptions(
    riskLevel: "LOW" | "MODERATE" | "HIGH",
    amount: number,
    duration: "LESS_THAN_1_YEAR" | "1_TO_3_YEARS" | "3_TO_5_YEARS" | "MORE_THAN_5_YEARS"
  ) {
    const validAmount = Math.max(amount > 0 ? amount : 10000, 100);
    const fmtRupee = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    let suitabilityWarning: string | null = null;

    if (duration === "LESS_THAN_1_YEAR") {
      suitabilityWarning =
        "For an investment duration under 1 year, capital preservation is essential. Equities and high-beta assets carry high risk of short-term losses that cannot reliably recover in less than 12 months. The options below prioritize capital stability, fixed interest, and liquidity over volatile market exposure.";
    } else if (duration === "1_TO_3_YEARS" && riskLevel === "HIGH") {
      suitabilityWarning =
        "For a 1 to 3 year duration, pure equity exposure remains risky because market cycles can cause multi-quarter drawdowns. We recommend balanced or conservative structures that protect capital while providing controlled growth.";
    }

    interface GeneratedOption {
      id: string;
      name: string;
      category: "Fixed Deposit" | "Mutual Fund" | "Gold" | "Stocks" | "Debt Securities";
      riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
      duration: string;
      suggestedAmount: number;
      suggestedAmountText: string;
      illustrativeScenario: {
        rateOrRange: string;
        scenarioText: string;
        assumptionSource: string;
      };
      downsideScenario: string;
      benefits: string[];
      risks: string[];
      liquidity: string;
      whySuited: string;
      marketLinked: boolean;
    }

    const options: GeneratedOption[] = [];

    if (duration === "LESS_THAN_1_YEAR") {
      // 1. Bank FD
      const fdVal = Math.round(validAmount * (1 + 0.065 * 0.75));
      options.push({
        id: "short-term-fd",
        name: "High-Yield Bank Fixed Deposit",
        category: "Fixed Deposit",
        riskLevel: "Low Risk",
        duration: "6 to 12 months",
        suggestedAmount: validAmount,
        suggestedAmountText: `${fmtRupee(validAmount)} (Full allocation for certainty)`,
        illustrativeScenario: {
          rateOrRange: "6.5% – 7.0% p.a.",
          scenarioText: `At an illustrative 6.5% p.a., investing ${fmtRupee(validAmount)} for 9 months yields an illustrative ~${fmtRupee(fdVal)}.`,
          assumptionSource: "Based on standard scheduled commercial bank FD rates. Subject to bank terms, tenor, and tax slab.",
        },
        downsideScenario: "Virtually zero capital risk. Bank deposits are insured up to ₹5,00,000 per depositor per bank by DICGC (RBI subsidiary).",
        benefits: [
          "Guaranteed principal preservation and fixed interest.",
          "DICGC insurance coverage up to ₹5 lakh per bank.",
          "Simple booking and early withdrawal option in case of emergency.",
        ],
        risks: [
          "Interest income is fully taxable according to your income slab.",
          "Premature liquidation usually incurs a 0.5%–1.0% interest rate penalty.",
        ],
        liquidity: "High. Can be closed prematurely online at any time and credited to your savings account in minutes.",
        whySuited: "Matches your need for short-term certainty without subjecting hard-earned money to market drawdowns.",
        marketLinked: false,
      });

      // 2. Liquid Fund
      const liqVal = Math.round(validAmount * (1 + 0.0625 * 0.5));
      options.push({
        id: "liquid-debt-fund",
        name: "Liquid & Overnight Debt Mutual Fund",
        category: "Debt Securities",
        riskLevel: "Low Risk",
        duration: "1 to 9 months",
        suggestedAmount: validAmount,
        suggestedAmountText: `${fmtRupee(validAmount)} (Full or partial liquidity pool)`,
        illustrativeScenario: {
          rateOrRange: "6.0% – 6.6% p.a.",
          scenarioText: `At an illustrative 6.25% p.a., investing ${fmtRupee(validAmount)} for 6 months yields an illustrative ~${fmtRupee(liqVal)}.`,
          assumptionSource: "Based on short-term money market yields. Mutual fund yields fluctuate daily with money market conditions.",
        },
        downsideScenario: "Extremely low volatility. Funds hold top-tier sovereign and AAA paper with maturities under 91 days.",
        benefits: [
          "High flexibility with T+1 business day redemption directly to your bank account.",
          "Zero lock-in period after day 7 (no exit loads).",
          "Superior short-term yield compared to a standard bank savings account.",
        ],
        risks: [
          "Yields fluctuate with RBI monetary policy and repo rates.",
          "Short-term capital gains are taxed at your income slab rate.",
        ],
        liquidity: "Very High. Instant redemption available up to ₹50,000; balance credited on next business day (T+1).",
        whySuited: "Provides superior liquidity without locking into fixed tenors, ideal for funds awaiting planned deployment.",
        marketLinked: true,
      });

      // 3. T-Bills
      const tbillVal = Math.round(validAmount * (1 + 0.066 * 0.5));
      options.push({
        id: "sovereign-tbills",
        name: "Government Treasury Bills (T-Bills)",
        category: "Debt Securities",
        riskLevel: "Low Risk",
        duration: "91, 182, or 364 days",
        suggestedAmount: validAmount,
        suggestedAmountText: `${fmtRupee(validAmount)} (Sovereign allocation)`,
        illustrativeScenario: {
          rateOrRange: "6.4% – 6.8% p.a.",
          scenarioText: `At an illustrative 6.6% p.a., a 182-day T-Bill on ${fmtRupee(validAmount)} yields an illustrative ~${fmtRupee(tbillVal)}.`,
          assumptionSource: "Issued at discount and redeemed at face value by RBI. Cutoff yields determined at weekly RBI auctions.",
        },
        downsideScenario: "Zero credit risk. Fully backed and guaranteed by the Government of India.",
        benefits: [
          "Absolute sovereign safety with zero probability of default.",
          "Available directly to retail investors via RBI Retail Direct with no brokerage charges.",
        ],
        risks: [
          "Must generally be held to maturity unless sold through secondary bond markets.",
          "Fixed discount rate cannot capture subsequent interest rate rises.",
        ],
        liquidity: "Moderate. Tradable on exchange or RBI portal, but holding to maturity is most cost-effective.",
        whySuited: "Guarantees ultimate sovereign safety with zero credit risk for near-term capital.",
        marketLinked: false,
      });

      // 4. Arbitrage Fund
      const arbVal = Math.round(validAmount * (1 + 0.068 * 0.75));
      options.push({
        id: "arbitrage-fund",
        name: "Arbitrage Mutual Fund",
        category: "Mutual Fund",
        riskLevel: "Low Risk",
        duration: "6 to 12 months",
        suggestedAmount: validAmount,
        suggestedAmountText: `${fmtRupee(validAmount)} (Tax-efficient low risk)`,
        illustrativeScenario: {
          rateOrRange: "6.5% – 7.2% p.a.",
          scenarioText: `At an illustrative 6.8% p.a., investing ${fmtRupee(validAmount)} for 9 months yields an illustrative ~${fmtRupee(arbVal)}.`,
          assumptionSource: "Based on historical cash-futures spread rollovers in the Indian derivatives market.",
        },
        downsideScenario: "Directional market crash risk is eliminated because every stock purchase is paired with an equal short futures position.",
        benefits: [
          "Treated as equity for taxation (favourable tax treatment for holdings over 12 months).",
          "Hedging protects capital from stock market falls while harvesting derivative spreads.",
        ],
        risks: [
          "Spreads narrow when market volatility is depressed, lowering interim yields.",
          "Small exit load (typically 0.25%–0.50%) if redeemed within 15–30 days.",
        ],
        liquidity: "High. Redemptions processed in T+2 business days.",
        whySuited: "Combines debt-like stability with favourable tax treatment for investors in higher tax brackets.",
        marketLinked: true,
      });
    } else if (duration === "1_TO_3_YEARS") {
      const years = 2;
      if (riskLevel === "LOW") {
        const fdVal = Math.round(validAmount * Math.pow(1 + 0.07, years));
        options.push({
          id: "bank-fd-2yr",
          name: "1–3 Year Bank Fixed Deposit",
          category: "Fixed Deposit",
          riskLevel: "Low Risk",
          duration: "1 to 3 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Safe capital base)`,
          illustrativeScenario: {
            rateOrRange: "6.8% – 7.2% p.a.",
            scenarioText: `At an illustrative 7.0% p.a. compounded annually, ${fmtRupee(validAmount)} grows to ~${fmtRupee(fdVal)} over 2 years.`,
            assumptionSource: "Current 1-to-3 year scheduled commercial bank term deposit card rates.",
          },
          downsideScenario: "Zero capital loss risk up to ₹5 lakh per bank under DICGC deposit insurance.",
          benefits: [
            "Predetermined, predictable returns locked in for the full tenor.",
            "No market fluctuations or volatility to worry about.",
            "Option for monthly or quarterly interest payouts if income is needed.",
          ],
          risks: [
            "Returns may lag high inflation after tax deduction.",
            "Early break penalty of 0.5%–1.0%.",
          ],
          liquidity: "High. Can be liquidated online anytime.",
          whySuited: "Ideal for low-risk investors needing guaranteed returns over a 1 to 3 year timeframe.",
          marketLinked: false,
        });

        const debtVal = Math.round(validAmount * Math.pow(1 + 0.072, years));
        options.push({
          id: "short-debt-fund",
          name: "Banking & PSU / Short-Duration Debt Fund",
          category: "Debt Securities",
          riskLevel: "Low Risk",
          duration: "1 to 3 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Quality debt allocation)`,
          illustrativeScenario: {
            rateOrRange: "7.0% – 7.5% p.a.",
            scenarioText: `At an illustrative 7.2% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(debtVal)} over 2 years.`,
            assumptionSource: "Yield-to-maturity of AAA-rated corporate debt and PSU bond funds.",
          },
          downsideScenario: "Low volatility. Minor NAV fluctuations caused by interest rate cycles.",
          benefits: [
            "High portfolio credit quality (mostly public sector and AAA banks).",
            "No lock-in after 30 days.",
            "Better reinvestment compounding than single fixed-maturity accounts.",
          ],
          risks: [
            "NAV can dip slightly if RBI raises benchmark interest rates.",
            "Gains taxed at normal income slab rates.",
          ],
          liquidity: "High. T+2 business day redemption.",
          whySuited: "High-grade corporate debt exposure offering steady yield with minimal credit risk.",
          marketLinked: true,
        });

        const goldVal = Math.round(validAmount * Math.pow(1 + 0.08, years));
        options.push({
          id: "gold-etf-short",
          name: "Gold ETF / Digital Gold",
          category: "Gold",
          riskLevel: "Moderate Risk",
          duration: "1 to 3 years",
          suggestedAmount: Math.round(validAmount * 0.25) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.25) || validAmount)} (Recommended hedge portion)`,
          illustrativeScenario: {
            rateOrRange: "8.0% – 10.0% p.a. (Historical trend)",
            scenarioText: `At an illustrative 8.5% p.a. historical gold trend, ${fmtRupee(validAmount)} could reach ~${fmtRupee(goldVal)} over 2 years.`,
            assumptionSource: "Long-term historical domestic INR gold price movement. Gold does not generate periodic interest.",
          },
          downsideScenario: "Gold prices can remain flat or experience corrections of 5%–10% during strong economic booms.",
          benefits: [
            "Hedges against purchasing power erosion and currency depreciation.",
            "Zero storage, making, or purity concerns compared to physical gold.",
          ],
          risks: [
            "Generates no interest or dividend yield.",
            "Price fluctuates with global macroeconomic trends and exchange rates.",
          ],
          liquidity: "High. Sold instantly on stock exchanges during trading hours.",
          whySuited: "Acts as a defensive stabilizer in your portfolio over multi-year periods.",
          marketLinked: true,
        });
      } else {
        // MODERATE or HIGH for 1-3 years
        const hybridVal = Math.round(validAmount * Math.pow(1 + 0.088, years));
        options.push({
          id: "cons-hybrid",
          name: "Conservative Hybrid Mutual Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "1 to 3 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Balanced allocation)`,
          illustrativeScenario: {
            rateOrRange: "8.0% – 9.5% p.a.",
            scenarioText: `At an illustrative 8.8% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(hybridVal)} over 2 years.`,
            assumptionSource: "Historical rolling performance of 75% debt + 25% large-cap equity hybrid funds.",
          },
          downsideScenario: "Short-term pullbacks of 3%–6% are possible during equity market sell-offs, cushioned by the 75% debt allocation.",
          benefits: [
            "75% debt provides stability, while 25% equity provides an inflation-beating boost.",
            "Automated professional asset rebalancing by the fund manager.",
            "Smoother return profile than pure stock funds.",
          ],
          risks: [
            "Subject to modest equity market drawdowns.",
            "Returns will lag pure equity during strong stock market rallies.",
          ],
          liquidity: "High. T+2 business day redemption.",
          whySuited: "A well-balanced foundation for 1 to 3 year money that seeks more growth than an FD without heavy stock risk.",
          marketLinked: true,
        });

        const bafVal = Math.round(validAmount * Math.pow(1 + 0.098, years));
        options.push({
          id: "bal-adv-fund",
          name: "Balanced Advantage / Dynamic Asset Allocation Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "2 to 3 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Dynamic risk management)`,
          illustrativeScenario: {
            rateOrRange: "9.0% – 11.0% p.a.",
            scenarioText: `At an illustrative 9.8% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(bafVal)} over 2 years.`,
            assumptionSource: "Category averages of dynamically managed equity-debt funds across market cycles.",
          },
          downsideScenario: "Drawdowns generally limited to 5%–10% in severe market sell-offs due to dynamic hedging.",
          benefits: [
            "Automatically reduces equity exposure when markets are expensive and buys when markets are cheap.",
            "Equity taxation status typically maintained through derivatives.",
            "Hands-off asset allocation for busy investors.",
          ],
          risks: [
            "Manager valuation models may lag during rapid market shifts.",
            "Moderate volatility during market trend reversals.",
          ],
          liquidity: "High. T+2 business days.",
          whySuited: "Dynamically shifts between stocks and debt to shield capital over a 2–3 year timeframe.",
          marketLinked: true,
        });

        const corpVal = Math.round(validAmount * Math.pow(1 + 0.074, years));
        options.push({
          id: "corp-bond-fund",
          name: "Corporate Bond Debt Mutual Fund",
          category: "Debt Securities",
          riskLevel: "Low Risk",
          duration: "1 to 3 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Fixed-income anchor)`,
          illustrativeScenario: {
            rateOrRange: "7.2% – 7.8% p.a.",
            scenarioText: `At an illustrative 7.4% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(corpVal)} over 2 years.`,
            assumptionSource: "Yields of portfolios mandatorily investing >80% in AA+ and AAA rated corporate paper.",
          },
          downsideScenario: "Minimal default risk due to strict AAA mandate; minor mark-to-market bond price fluctuations.",
          benefits: [
            "Mandated to hold at least 80% in top-rated corporate issuers.",
            "Superior credit reliability with institutional diversification.",
          ],
          risks: [
            "Subject to interest rate cycle sensitivity.",
            "Capital gains taxed at regular income tax slabs.",
          ],
          liquidity: "High. T+2 business day redemption.",
          whySuited: "Provides dependable capital stability to balance riskier holdings in a multi-year portfolio.",
          marketLinked: true,
        });

        const goldVal2 = Math.round(validAmount * Math.pow(1 + 0.085, years));
        options.push({
          id: "gold-etf-mod",
          name: "Gold ETF (Exchange Traded Fund)",
          category: "Gold",
          riskLevel: "Moderate Risk",
          duration: "1 to 3 years",
          suggestedAmount: Math.round(validAmount * 0.2) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.2) || validAmount)} (Defensive asset allocation)`,
          illustrativeScenario: {
            rateOrRange: "8.0% – 10.0% p.a. (Historical trend)",
            scenarioText: `At an illustrative 8.5% p.a., ${fmtRupee(validAmount)} could reach ~${fmtRupee(goldVal2)} over 2 years.`,
            assumptionSource: "Domestic gold spot price trends. Gold does not produce recurring cash flows.",
          },
          downsideScenario: "Gold values can experience periods of stagnation during high global growth cycles.",
          benefits: [
            "Negative correlation with equities — often surges when equity markets drop.",
            "High liquidity on stock exchanges with 99.5% pure physical gold backing.",
          ],
          risks: [
            "No dividend or interest payments.",
            "Performance is tied to global currency movements and bullion prices.",
          ],
          liquidity: "High. Tradable on NSE/BSE during market hours.",
          whySuited: "Protects your purchasing power and provides portfolio defense during market turbulence.",
          marketLinked: true,
        });
      }
    } else if (duration === "3_TO_5_YEARS") {
      const years = 4;
      if (riskLevel === "LOW") {
        const fdVal = Math.round(validAmount * Math.pow(1 + 0.072, years));
        options.push({
          id: "medium-fd-4yr",
          name: "3–5 Year Bank Fixed Deposit",
          category: "Fixed Deposit",
          riskLevel: "Low Risk",
          duration: "3 to 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Guaranteed capital base)`,
          illustrativeScenario: {
            rateOrRange: "7.0% – 7.4% p.a.",
            scenarioText: `At an illustrative 7.2% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(fdVal)} over 4 years.`,
            assumptionSource: "Medium-term bank term deposit rates across premier commercial banks.",
          },
          downsideScenario: "Zero capital risk. Principal and accrued interest covered up to ₹5 lakh per bank.",
          benefits: [
            "Locks in today's interest rate for up to 5 full years.",
            "Complete certainty of final maturity value.",
          ],
          risks: [
            "Tax-drag on interest reduces real post-inflation wealth creation.",
            "Penalty on early withdrawal.",
          ],
          liquidity: "High. Can be liquidated online anytime.",
          whySuited: "Guarantees full capital return for investors who cannot tolerate any stock market drawdowns.",
          marketLinked: false,
        });

        const consVal = Math.round(validAmount * Math.pow(1 + 0.088, years));
        options.push({
          id: "cons-hybrid-4yr",
          name: "Conservative Hybrid Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "3 to 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Inflation-beating shield)`,
          illustrativeScenario: {
            rateOrRange: "8.5% – 9.5% p.a.",
            scenarioText: `At an illustrative 8.8% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(consVal)} over 4 years.`,
            assumptionSource: "Category averages of 75% debt + 25% equity funds over 4-year holding periods.",
          },
          downsideScenario: "Interim pullbacks of 3%–5% during equity corrections, smoothed by the 75% debt cushion.",
          benefits: [
            "Generates superior returns to bank FDs over 3–5 years.",
            "Low volatility suitable for conservative savers.",
          ],
          risks: ["Modest market risk on the 25% equity portion."],
          liquidity: "High. T+2 business day redemption.",
          whySuited: "Provides an inflation hedge without subjecting you to aggressive stock swings.",
          marketLinked: true,
        });

        const sgbVal = Math.round(validAmount * Math.pow(1 + 0.09, years));
        options.push({
          id: "gold-sgb-4yr",
          name: "Sovereign Gold Bond (SGB) / Gold ETF",
          category: "Gold",
          riskLevel: "Moderate Risk",
          duration: "3 to 5 years",
          suggestedAmount: Math.round(validAmount * 0.25) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.25) || validAmount)} (Diversified hedge)`,
          illustrativeScenario: {
            rateOrRange: "8.5% – 10.5% p.a. (Historical gold trend + 2.5% SGB interest)",
            scenarioText: `At an illustrative 9.0% p.a., ${fmtRupee(validAmount)} could reach ~${fmtRupee(sgbVal)} over 4 years.`,
            assumptionSource: "Historical domestic gold appreciation plus 2.5% semi-annual coupon for Sovereign Gold Bonds.",
          },
          downsideScenario: "Gold values can consolidate for multi-year periods if real interest rates surge globally.",
          benefits: [
            "SGBs offer a 2.5% annual interest payout on top of gold price appreciation.",
            "Zero default risk, backed by Government of India.",
          ],
          risks: [
            "Secondary market trading volumes can sometimes be thin.",
          ],
          liquidity: "Moderate. Tradable on exchange; primary SGB tenor is 8 years with exit window after year 5.",
          whySuited: "Adds an uncorrelated, inflation-resistant hedge to your medium-term savings.",
          marketLinked: true,
        });
      } else if (riskLevel === "MODERATE") {
        const niftyVal = Math.round(validAmount * Math.pow(1 + 0.118, years));
        options.push({
          id: "nifty-index-4yr",
          name: "Nifty 50 Large-Cap Index Mutual Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "3 to 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Core growth allocation)`,
          illustrativeScenario: {
            rateOrRange: "11.0% – 12.5% p.a.",
            scenarioText: `At an illustrative 11.8% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(niftyVal)} over 4 years.`,
            assumptionSource: "15-year rolling historical average returns of the Nifty 50 Total Return Index (TRI). Past returns are not a guarantee.",
          },
          downsideScenario: "Temporary market drawdowns of 12%–20% can happen during bear phases, typically recovering over 3+ year horizons.",
          benefits: [
            "Invests in India's top 50 blue-chip market leaders with zero fund-manager bias.",
            "Extremely low expense ratio (typically 0.1% to 0.2%).",
            "Automatic inclusion of rising sectoral leaders over time.",
          ],
          risks: [
            "Subject to broad equity market volatility.",
            "Requires patience to stay invested through interim corrections.",
          ],
          liquidity: "High. T+2 business days with no lock-in.",
          whySuited: "The ideal cornerstone investment for 3–5 year horizons seeking dependable compounding.",
          marketLinked: true,
        });

        const aggrVal = Math.round(validAmount * Math.pow(1 + 0.108, years));
        options.push({
          id: "aggr-hybrid-4yr",
          name: "Aggressive Hybrid Mutual Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "3 to 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Compounding with debt cushion)`,
          illustrativeScenario: {
            rateOrRange: "10.0% – 11.5% p.a.",
            scenarioText: `At an illustrative 10.8% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(aggrVal)} over 4 years.`,
            assumptionSource: "Historical category performance of 65%–75% equity + 25% debt funds.",
          },
          downsideScenario: "Drawdowns of 8%–12% during severe market corrections, softened by the 25%–35% debt holdings.",
          benefits: [
            "Combines equity compounding power with a steady fixed-income buffer.",
            "Automatic rebalancing between stocks and bonds as market valuations move.",
            "Treated as an equity fund for favourable long-term capital gains tax.",
          ],
          risks: [
            "Underperforms 100% pure equity funds during runaway bull markets.",
            "Fund manager strategy risk.",
          ],
          liquidity: "High. T+2 business day redemption.",
          whySuited: "Balances substantial wealth compounding with downside shock absorption for moderate risk profiles.",
          marketLinked: true,
        });

        const debtVal2 = Math.round(validAmount * Math.pow(1 + 0.075, years));
        options.push({
          id: "corp-debt-4yr",
          name: "Corporate Bond & Banking Debt Fund",
          category: "Debt Securities",
          riskLevel: "Low Risk",
          duration: "3 to 5 years",
          suggestedAmount: Math.round(validAmount * 0.3) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.3) || validAmount)} (Defensive buffer portion)`,
          illustrativeScenario: {
            rateOrRange: "7.2% – 7.8% p.a.",
            scenarioText: `At an illustrative 7.5% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(debtVal2)} over 4 years.`,
            assumptionSource: "Yield-to-maturity of AAA rated domestic corporate bond portfolios.",
          },
          downsideScenario: "Negligible credit default risk due to AAA quality; modest bond price sensitivity to interest rate trends.",
          benefits: [
            "Provides an unshakeable capital foundation to balance equity risk.",
            "Predictable accrual yield with high institutional quality.",
          ],
          risks: ["Taxed at income tax slab rates; modest rate sensitivity."],
          liquidity: "High. T+2 business day redemption.",
          whySuited: "Stabilizes overall portfolio wealth while your equity allocations compound.",
          marketLinked: true,
        });
      } else {
        // HIGH RISK for 3-5 years
        const flexiVal = Math.round(validAmount * Math.pow(1 + 0.128, years));
        options.push({
          id: "flexicap-fund-4yr",
          name: "Flexi-Cap Equity Mutual Fund",
          category: "Mutual Fund",
          riskLevel: "High Risk",
          duration: "3 to 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Active wealth creation)`,
          illustrativeScenario: {
            rateOrRange: "12.0% – 14.0% p.a.",
            scenarioText: `At an illustrative 12.8% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(flexiVal)} over 4 years.`,
            assumptionSource: "Historical category performance of diversified flexi-cap equity schemes over 4+ year holding periods.",
          },
          downsideScenario: "Short-term drops of 15%–25% can occur during economic downturns before returning to long-term trendlines.",
          benefits: [
            "Fund managers can dynamically invest across large, mid, and small-cap winners.",
            "Captures emerging economic themes across Indian industries.",
            "Long-term capital gains tax benefits.",
          ],
          risks: [
            "Significant price volatility in the interim.",
            "Performance depends heavily on fund manager stock selection.",
          ],
          liquidity: "High. T+2 business day redemption with 1% exit load if redeemed within 1 year.",
          whySuited: "Maximizes compounding opportunities for high-risk investors with a 3–5 year investment runway.",
          marketLinked: true,
        });

        const niftyVal2 = Math.round(validAmount * Math.pow(1 + 0.12, years));
        options.push({
          id: "nifty-broad-4yr",
          name: "Broad Market Index Fund (Nifty 50 & Next 50)",
          category: "Mutual Fund",
          riskLevel: "High Risk",
          duration: "3 to 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Passive index compounding)`,
          illustrativeScenario: {
            rateOrRange: "11.5% – 13.0% p.a.",
            scenarioText: `At an illustrative 12.0% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(niftyVal2)} over 4 years.`,
            assumptionSource: "Blended historical average returns of Nifty 50 and Nifty Next 50 indices over 4-year horizons.",
          },
          downsideScenario: "Subject to broad stock market pullbacks of 15%–20% during recessionary or bearish phases.",
          benefits: [
            "Low expense ratio; zero active manager risk.",
            "Captures the performance of the top 100 listed Indian corporations.",
          ],
          risks: [
            "Interim volatility; full participation in market downturns.",
          ],
          liquidity: "High. T+2 business days.",
          whySuited: "Low-cost, broad equity market exposure for long-term wealth compounding.",
          marketLinked: true,
        });

        const stockVal = Math.round(validAmount * Math.pow(1 + 0.13, years));
        options.push({
          id: "direct-equity-4yr",
          name: "Blue-Chip Direct Equities Portfolio",
          category: "Stocks",
          riskLevel: "High Risk",
          duration: "3 to 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Direct ownership)`,
          illustrativeScenario: {
            rateOrRange: "Market-linked (Historical leader avg ~12%–14% p.a.)",
            scenarioText: `At an illustrative 13.0% p.a. corporate earnings growth, ${fmtRupee(validAmount)} could grow to ~${fmtRupee(stockVal)} over 4 years.`,
            assumptionSource: "Based on long-term compound earnings growth of premier Indian blue-chips. Highly company-dependent.",
          },
          downsideScenario: "Individual company share prices can fluctuate wildly (20%–35% drawdowns) based on quarterly earnings and sector trends.",
          benefits: [
            "Direct ownership in companies with zero ongoing fund management expense ratios.",
            "Receive dividends directly into your bank account.",
          ],
          risks: [
            "Company-specific business, regulatory, and governance risks.",
            "Requires active research and regular monitoring.",
          ],
          liquidity: "High. Tradeable in seconds on NSE/BSE during trading hours.",
          whySuited: "Suited for investors who want direct stock ownership in market leaders with zero intermediary costs.",
          marketLinked: true,
        });
      }
    } else {
      // MORE_THAN_5_YEARS
      const years = 5;
      if (riskLevel === "LOW") {
        const ppfVal = Math.round(validAmount * Math.pow(1 + 0.071, years));
        options.push({
          id: "ppf-scheme-5yr",
          name: "Public Provident Fund (PPF)",
          category: "Fixed Deposit",
          riskLevel: "Low Risk",
          duration: "More than 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Tax-free sovereign compounding)`,
          illustrativeScenario: {
            rateOrRange: "7.1% p.a. (Tax-Free)",
            scenarioText: `At 7.1% p.a. government notified interest, ${fmtRupee(validAmount)} grows to ~${fmtRupee(ppfVal)} in 5 years completely tax-free.`,
            assumptionSource: "Current Ministry of Finance notified PPF interest rates. Interest is compounded annually.",
          },
          downsideScenario: "Zero credit risk. Principal and interest are sovereign-backed by the Government of India.",
          benefits: [
            "Triple-E (Exempt-Exempt-Exempt) tax benefit: investment, interest, and maturity are completely tax-free.",
            "Absolute government safety with zero default risk.",
            "Immune to debt or equity market crashes.",
          ],
          risks: [
            "15-year statutory lock-in period with partial withdrawal limits after year 6.",
            "Annual deposit cap of ₹1,50,000 per financial year.",
          ],
          liquidity: "Low. Designed for long-term lock-in; loan facilities available from year 3.",
          whySuited: "The gold standard for conservative long-term capital preservation with 100% tax-free returns.",
          marketLinked: false,
        });

        const niftyVal = Math.round(validAmount * Math.pow(1 + 0.115, years));
        options.push({
          id: "nifty-cons-5yr",
          name: "Nifty 50 Index Mutual Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "More than 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Inflation-beating engine)`,
          illustrativeScenario: {
            rateOrRange: "11.0% – 12.0% p.a.",
            scenarioText: `At an illustrative 11.5% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(niftyVal)} over 5 years.`,
            assumptionSource: "15-year rolling returns of the Nifty 50 TRI. Over 5+ year holding periods, negative returns have been historically rare.",
          },
          downsideScenario: "Subject to cyclical equity drops, but historical data shows broad Indian equity indices recover and compound over 5+ year spans.",
          benefits: [
            "Beats inflation over the long haul while investing in the nation's 50 largest corporations.",
            "Low cost, high liquidity, and automated rebalancing.",
          ],
          risks: ["Interim market swings requiring disciplined patience."],
          liquidity: "High. T+2 business day redemption.",
          whySuited: "Gives conservative investors an inflation hedge over long multi-year horizons.",
          marketLinked: true,
        });

        const sgbVal = Math.round(validAmount * Math.pow(1 + 0.095, years));
        options.push({
          id: "sgb-gold-5yr",
          name: "Sovereign Gold Bonds (SGB)",
          category: "Gold",
          riskLevel: "Moderate Risk",
          duration: "More than 5 years",
          suggestedAmount: Math.round(validAmount * 0.2) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.2) || validAmount)} (Defensive store of value)`,
          illustrativeScenario: {
            rateOrRange: "9.0% – 11.0% p.a. (Historical gold return + 2.5% coupon)",
            scenarioText: `At an illustrative 9.5% p.a. combined return, ${fmtRupee(validAmount)} could reach ~${fmtRupee(sgbVal)} in 5 years.`,
            assumptionSource: "Historical domestic gold price compounding plus 2.5% p.a. fixed semi-annual coupon.",
          },
          downsideScenario: "Gold prices depend on international currency and geopolitical factors, which can remain stagnant for multiple quarters.",
          benefits: [
            "Capital gains are 100% tax-free when held to sovereign maturity.",
            "Additional 2.5% annual interest paid semi-annually directly into your bank.",
            "No storage fees, making charges, or theft risk.",
          ],
          risks: ["Secondary market liquidity can have pricing discounts before 8-year maturity."],
          liquidity: "Moderate. Tradable on exchange with RBI early redemption window from year 5.",
          whySuited: "The most tax-efficient and secure way to hold gold for 5+ years.",
          marketLinked: true,
        });
      } else if (riskLevel === "MODERATE") {
        const flexiVal = Math.round(validAmount * Math.pow(1 + 0.125, years));
        options.push({
          id: "flexicap-5yr",
          name: "Flexi-Cap Equity Mutual Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "More than 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Core long-term growth)`,
          illustrativeScenario: {
            rateOrRange: "12.0% – 13.5% p.a.",
            scenarioText: `At an illustrative 12.5% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(flexiVal)} over 5 years.`,
            assumptionSource: "Category 10-year rolling performance of multi-cap and flexi-cap mutual funds across Indian business cycles.",
          },
          downsideScenario: "Market pullbacks of 15%–20% will occur during intermediate corrections, but multi-year compounding historically overcomes them.",
          benefits: [
            "Flexibility to shift between large-cap security and mid-cap growth opportunities.",
            "Drives multi-year wealth accumulation without needing to pick individual stocks.",
            "Favourable equity capital gains tax rules.",
          ],
          risks: [
            "Equity volatility and active manager selection risk.",
          ],
          liquidity: "High. T+2 business days with zero lock-in after 1 year.",
          whySuited: "The primary growth engine for a 5+ year moderate-risk investment strategy.",
          marketLinked: true,
        });

        const niftyVal = Math.round(validAmount * Math.pow(1 + 0.12, years));
        options.push({
          id: "nifty-50-index-5yr",
          name: "Nifty 50 Index Mutual Fund",
          category: "Mutual Fund",
          riskLevel: "Moderate Risk",
          duration: "More than 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Passive blue-chip core)`,
          illustrativeScenario: {
            rateOrRange: "11.5% – 13.0% p.a.",
            scenarioText: `At an illustrative 12.0% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(niftyVal)} over 5 years.`,
            assumptionSource: "15-year historical average annualized rolling return of the Nifty 50 TRI benchmark.",
          },
          downsideScenario: "Interim corrections will occur during global bear markets, typically rebounding over 3-to-5 year economic cycles.",
          benefits: [
            "Ultra-low expense ratio; no risk of fund manager underperformance.",
            "Direct participation in the growth of India's 50 most valuable companies.",
          ],
          risks: ["Full exposure to market-wide pullbacks without downside cash hedging."],
          liquidity: "High. T+2 business days.",
          whySuited: "Clean, reliable, and low-cost equity wealth creation for 5+ year horizons.",
          marketLinked: true,
        });

        const ppfVal2 = Math.round(validAmount * Math.pow(1 + 0.071, years));
        options.push({
          id: "ppf-anchor-5yr",
          name: "Public Provident Fund (PPF) / AAA Debt Fund",
          category: "Fixed Deposit",
          riskLevel: "Low Risk",
          duration: "More than 5 years",
          suggestedAmount: Math.round(validAmount * 0.25) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.25) || validAmount)} (Defensive stability anchor)`,
          illustrativeScenario: {
            rateOrRange: "7.1% – 7.5% p.a.",
            scenarioText: `At an illustrative 7.1% p.a., ${fmtRupee(validAmount)} grows to ~${fmtRupee(ppfVal2)} over 5 years with zero risk.`,
            assumptionSource: "Current Government of India notified PPF interest rates.",
          },
          downsideScenario: "Zero default risk. Sovereign backing.",
          benefits: [
            "Protects your portfolio from sudden volatility spikes.",
            "Completely tax-free interest under PPF rules.",
          ],
          risks: ["Long statutory lock-in."],
          liquidity: "Low to Moderate.",
          whySuited: "Acts as a solid, safe harbor balancing your equity investments over 5+ years.",
          marketLinked: false,
        });

        const sgbVal2 = Math.round(validAmount * Math.pow(1 + 0.095, years));
        options.push({
          id: "sgb-gold-mod-5yr",
          name: "Sovereign Gold Bonds (SGB)",
          category: "Gold",
          riskLevel: "Moderate Risk",
          duration: "More than 5 years",
          suggestedAmount: Math.round(validAmount * 0.15) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.15) || validAmount)} (Hedge & store of value)`,
          illustrativeScenario: {
            rateOrRange: "9.0% – 11.0% p.a.",
            scenarioText: `At an illustrative 9.5% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(sgbVal2)} over 5 years.`,
            assumptionSource: "Long-term historical domestic gold compounding plus 2.5% sovereign coupon.",
          },
          downsideScenario: "Can underperform equity during rapid economic expansions.",
          benefits: [
            "Tax-free capital gains at maturity plus 2.5% annual guaranteed interest.",
            "Universal crisis hedge and currency debasement defense.",
          ],
          risks: ["Thin secondary market liquidity before maturity."],
          liquidity: "Moderate.",
          whySuited: "Essential diversification asset providing resilient purchasing power defense.",
          marketLinked: true,
        });
      } else {
        // HIGH RISK for 5+ years
        const midVal = Math.round(validAmount * Math.pow(1 + 0.14, years));
        options.push({
          id: "midcap-fund-5yr",
          name: "Mid-Cap & Flexi-Cap Equity Funds",
          category: "Mutual Fund",
          riskLevel: "High Risk",
          duration: "More than 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Maximum compounding potential)`,
          illustrativeScenario: {
            rateOrRange: "13.0% – 15.0% p.a.",
            scenarioText: `At an illustrative 14.0% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(midVal)} over 5 years.`,
            assumptionSource: "Historical 10-year rolling performance of mid-cap and emerging leader mutual funds. Past returns are not guaranteed.",
          },
          downsideScenario: "High volatility. Sharp pullbacks of 25%–35% during bear cycles before compounding resumes.",
          benefits: [
            "Invests in fast-growing mid-sized companies poised to become tomorrow's market leaders.",
            "Higher wealth compounding potential than mature large-caps over 5–7+ year holding periods.",
          ],
          risks: [
            "Higher price volatility and longer recovery times during market corrections.",
            "Requires conviction to stay invested through large temporary drawdowns.",
          ],
          liquidity: "High. T+2 business days with 1% exit load if redeemed within 1 year.",
          whySuited: "Designed for aggressive investors seeking maximum wealth creation over 5+ year horizons.",
          marketLinked: true,
        });

        const niftyVal3 = Math.round(validAmount * Math.pow(1 + 0.125, years));
        options.push({
          id: "nifty-50-next50-5yr",
          name: "Nifty 50 & Nifty Next 50 Index Funds",
          category: "Mutual Fund",
          riskLevel: "High Risk",
          duration: "More than 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Top 100 corporations)`,
          illustrativeScenario: {
            rateOrRange: "12.0% – 13.5% p.a.",
            scenarioText: `At an illustrative 12.5% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(niftyVal3)} over 5 years.`,
            assumptionSource: "Blended historical 15-year return average of the top 100 listed Indian corporations.",
          },
          downsideScenario: "Subject to macroeconomic equity cycles with drawdowns up to 20% during recessionary periods.",
          benefits: [
            "Captures the entire top 100 Indian corporate spectrum at minimal management cost.",
            "Eliminates fund manager risk while delivering market compounding.",
          ],
          risks: ["Full participation in market corrections."],
          liquidity: "High. T+2 business days.",
          whySuited: "A low-cost, high-growth core allocation that scales with the long-term expansion of the Indian economy.",
          marketLinked: true,
        });

        const equityVal = Math.round(validAmount * Math.pow(1 + 0.14, years));
        options.push({
          id: "direct-stocks-5yr",
          name: "Quality Direct Equities Portfolio",
          category: "Stocks",
          riskLevel: "High Risk",
          duration: "More than 5 years",
          suggestedAmount: validAmount,
          suggestedAmountText: `${fmtRupee(validAmount)} (Direct business ownership)`,
          illustrativeScenario: {
            rateOrRange: "Market-linked (Corporate earnings growth ~13%–15% p.a.)",
            scenarioText: `At an illustrative 14.0% p.a. earnings growth, ${fmtRupee(validAmount)} could grow to ~${fmtRupee(equityVal)} over 5 years.`,
            assumptionSource: "Long-term historical profit growth of high return-on-equity (ROE) industry leaders.",
          },
          downsideScenario: "Company-specific drawdowns of 30%+ can happen if earnings falter or sectors face regulatory headwinds.",
          benefits: [
            "Direct equity ownership with zero management fees.",
            "Dividends deposited directly into your bank account.",
          ],
          risks: [
            "Company-specific operational, management, and regulatory risks.",
            "Requires ongoing fundamental tracking and financial literacy.",
          ],
          liquidity: "High. Real-time liquidity on NSE/BSE during market hours.",
          whySuited: "For experienced, hands-on investors seeking direct equity ownership in proven market leaders.",
          marketLinked: true,
        });

        const sgbVal3 = Math.round(validAmount * Math.pow(1 + 0.095, years));
        options.push({
          id: "sgb-gold-high-5yr",
          name: "Sovereign Gold Bonds (SGB) / Gold ETF",
          category: "Gold",
          riskLevel: "Moderate Risk",
          duration: "More than 5 years",
          suggestedAmount: Math.round(validAmount * 0.1) || validAmount,
          suggestedAmountText: `${fmtRupee(Math.round(validAmount * 0.1) || validAmount)} (Uncorrelated crisis hedge)`,
          illustrativeScenario: {
            rateOrRange: "9.0% – 11.0% p.a.",
            scenarioText: `At an illustrative 9.5% p.a., ${fmtRupee(validAmount)} could grow to ~${fmtRupee(sgbVal3)} over 5 years.`,
            assumptionSource: "Long-term historical domestic gold appreciation plus 2.5% p.a. sovereign coupon.",
          },
          downsideScenario: "Gold can lag during equity bull runs.",
          benefits: [
            "Uncorrelated with corporate earnings; provides downside ballast when bear markets hit.",
            "Tax-free capital gains at sovereign maturity.",
          ],
          risks: ["No dividends; returns depend on bullion price cycles."],
          liquidity: "Moderate to High.",
          whySuited: "Provides a smart defensive cushion in an otherwise high-risk portfolio.",
          marketLinked: true,
        });
      }
    }

    return {
      riskLevel,
      duration,
      amount: validAmount,
      suitabilityWarning,
      options: options.slice(0, 4),
      disclaimer: EDUCATIONAL_DISCLAIMER,
    };
  },
};

