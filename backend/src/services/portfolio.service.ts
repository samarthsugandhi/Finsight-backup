import { Prisma, HoldingType, GoldPurity } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { computeFdCurrentValue } from "@/utils/fixedDeposit";
import { AddHoldingInput, AddTransactionInput, UpdateHoldingInput } from "@/validators/portfolio.validator";

const { Decimal } = Prisma;
const ZERO = new Decimal(0);

function num(d: Prisma.Decimal | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return Number(d.toFixed(2));
}

type SnapshotRow = {
  snapshotDate: Date | string;
  totalValue: Prisma.Decimal | number | string;
};

function formatHistoryPointDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

async function upsertDailyPortfolioSnapshot(userId: number, totalValue: number) {
  await prisma.$executeRaw`
    INSERT INTO portfolio_value_snapshots (userId, snapshotDate, totalValue, createdAt, updatedAt)
    VALUES (${userId}, CURDATE(), ${totalValue}, NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE totalValue = VALUES(totalValue), updatedAt = NOW(3)
  `;
}

async function loadPortfolioHistory(userId: number, lookbackDays = 180) {
  try {
    const rows = await prisma.$queryRaw<SnapshotRow[]>`
      SELECT snapshotDate, totalValue
      FROM portfolio_value_snapshots
      WHERE userId = ${userId}
        AND snapshotDate >= DATE_SUB(CURDATE(), INTERVAL ${lookbackDays} DAY)
      ORDER BY snapshotDate ASC
    `;

    return rows.map((row) => {
      const date = row.snapshotDate instanceof Date ? row.snapshotDate : new Date(row.snapshotDate);
      const value = Number(row.totalValue);
      return {
        date: formatHistoryPointDate(date),
        value: Number.isFinite(value) ? Number(value.toFixed(2)) : 0,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Computes remaining quantity, weighted-average cost basis, and invested amount
 * using a running WAVAC (Weighted Average Cost) algorithm.
 *
 * Key invariant: sells reduce the holding at the current running average cost;
 * subsequent buys update the running average.
 *
 * Example:
 *   BUY  10 @ ₹10  → qty=10, avg=10,  cost=100
 *   SELL  5 @ ₹15  → qty=5,  avg=10,  cost=50   (realized: 5×(15−10)=25)
 *   BUY   5 @ ₹20  → qty=10, avg=15,  cost=150
 *
 * Uses transaction chronological order (preserve insertion/date order from DB).
 */
function computeQuantityAndCost(transactions: Array<{ side: string; quantity: Prisma.Decimal; price: Prisma.Decimal }>) {
  // Running-average state
  let currentQty = ZERO;      // units currently held
  let currentCost = ZERO;     // total cost basis of current holding
  let totalSellQty = ZERO;    // cumulative sold units (for sell-guard validation)

  for (const t of transactions) {
    if (t.side === "BUY") {
      // New avg = (currentCost + newCost) / (currentQty + newQty)
      currentQty  = currentQty.plus(t.quantity);
      currentCost = currentCost.plus(t.quantity.times(t.price));
    } else {
      // SELL: reduce holding at current running average
      const sellQty = Decimal.min(t.quantity, currentQty); // defensive clamp
      const costRemoved = sellQty.times(
        currentQty.greaterThan(ZERO) ? currentCost.div(currentQty) : ZERO
      );
      currentQty  = Decimal.max(ZERO, currentQty.minus(sellQty));
      currentCost = Decimal.max(ZERO, currentCost.minus(costRemoved));
      totalSellQty = totalSellQty.plus(t.quantity);
    }
  }

  const remainingQty = currentQty;
  // avgBuyPrice = current cost basis per remaining unit
  const avgBuyPrice = remainingQty.greaterThan(ZERO) ? currentCost.div(remainingQty) : ZERO;
  const investedAmount = currentCost; // exact remaining cost basis (not avg × qty to avoid rounding drift)

  return { remainingQty, avgBuyPrice, investedAmount };
}

function computeHoldingView(
  holding: Prisma.PortfolioHoldingGetPayload<{ include: { transactions: true } }>
) {
  if (holding.type === "FIXED_DEPOSIT") {
    const investedAmount = holding.principal ?? ZERO;
    const currentValue = computeFdCurrentValue({
      principal: investedAmount,
      interestRate: holding.interestRate,
      startDate: holding.startDate,
      maturityDate: holding.maturityDate,
      maturityAmount: holding.maturityAmount,
    });
    const profitLoss = currentValue.minus(investedAmount);
    const returnPct = investedAmount.greaterThan(ZERO) ? profitLoss.div(investedAmount).times(100) : ZERO;

    // Days to maturity computation
    let daysToMaturity: number | null = null;
    let isMatured = false;
    if (holding.maturityDate) {
      const now = new Date();
      const diffMs = new Date(holding.maturityDate).getTime() - now.getTime();
      daysToMaturity = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isMatured = daysToMaturity <= 0;
    }

    return {
      investedAmount,
      currentValue,
      profitLoss,
      returnPct,
      dayChange: ZERO,
      remainingQty: null as Prisma.Decimal | null,
      avgBuyPrice: null as Prisma.Decimal | null,
      priceSource: "FIXED_DEPOSIT" as const,
      valuationSource: "Fixed Deposit Accrual",
      valuationDate: holding.startDate ? new Date(holding.startDate) : holding.createdAt,
      marketStatus: null as string | null,
      currency: "INR",
      daysToMaturity,
      isMatured,
    };
  }

  const { remainingQty, avgBuyPrice, investedAmount } = computeQuantityAndCost(holding.transactions);

  let currentPrice: Prisma.Decimal | null = null;
  let priceSource: "MANUAL" | "STATEMENT" | "UNAVAILABLE" = "UNAVAILABLE";
  let valuationSource = "Unavailable";
  let valuationDate: Date | null = null;
  const currency = "INR";

  // 1. Directly reported manual/statement current value takes precedence
  if (holding.manualCurrentValue !== null && holding.manualCurrentValue !== undefined) {
    const currentValue = holding.manualCurrentValue;
    const profitLoss = currentValue.minus(investedAmount);
    const returnPct = investedAmount.greaterThan(ZERO) ? profitLoss.div(investedAmount).times(100) : ZERO;
    const isStatement = holding.source && holding.source !== "MANUAL";
    priceSource = (isStatement ? "STATEMENT" : "MANUAL") as typeof priceSource;
    valuationSource = isStatement ? `Statement (${holding.source})` : "Manual Valuation";
    valuationDate = holding.createdAt;

    return {
      investedAmount,
      currentValue,
      profitLoss,
      returnPct,
      dayChange: ZERO,
      remainingQty,
      avgBuyPrice,
      priceSource,
      valuationSource,
      valuationDate,
      marketStatus: null as string | null,
      currency,
      daysToMaturity: null as number | null,
      isMatured: false,
    };
  }

  // 2. Manual per-unit price (explicitly user supplied or set via updateManualPrice)
  if (holding.manualPrice !== null && holding.manualPrice !== undefined) {
    currentPrice = holding.manualPrice;
    priceSource = "MANUAL";
    valuationSource = "Manual Unit Price";
    valuationDate = holding.createdAt;
  }

  // 3. If a current price was resolved, compute value; otherwise mark as UNAVAILABLE (never invent a value)
  const currentValue: Prisma.Decimal | null = currentPrice ? remainingQty.times(currentPrice) : null;
  const profitLoss: Prisma.Decimal | null = currentPrice ? (currentValue!).minus(investedAmount) : null;
  const returnPct: Prisma.Decimal | null =
    currentPrice && investedAmount.greaterThan(ZERO)
      ? (profitLoss!).div(investedAmount).times(100)
      : null;

  return {
    investedAmount,
    currentValue,
    profitLoss,
    returnPct,
    dayChange: ZERO,
    remainingQty,
    avgBuyPrice,
    priceSource,
    valuationSource,
    valuationDate,
    marketStatus: null as string | null,
    currency,
    daysToMaturity: null as number | null,
    isMatured: false,
  };
}

export const portfolioService = {
  async captureDailySnapshot(userId: number) {
    const snapshot = await this.list(userId);
    const totalValue = Number(snapshot.summary.totalCurrent ?? 0);
    await upsertDailyPortfolioSnapshot(userId, Number(totalValue.toFixed(2)));
    return { userId, totalValue: Number(totalValue.toFixed(2)) };
  },

  async addHolding(userId: number, input: AddHoldingInput) {
    // 1. FIXED DEPOSIT — Manual Only
    if (input.type === "FIXED_DEPOSIT") {
      return prisma.portfolioHolding.create({
        data: {
          type: "FIXED_DEPOSIT",
          name: input.name,
          principal: new Prisma.Decimal(input.principal),
          interestRate: input.interestRate !== undefined ? new Prisma.Decimal(input.interestRate) : undefined,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          maturityDate: input.maturityDate ? new Date(input.maturityDate) : undefined,
          maturityAmount: input.maturityAmount !== undefined && input.maturityAmount !== null ? new Prisma.Decimal(input.maturityAmount) : undefined,
          notes: input.notes ?? null,
          source: input.source ?? "MANUAL",
          userId,
        },
      });
    }

    // 2. GOLD — Manual Only (never substitute cost as current value unless explicitly provided)
    if (input.type === "GOLD") {
      const quantity = input.quantity;
      let avgPrice = input.averageBuyPrice || 0;
      let purchaseVal = input.purchaseValue || 0;

      if (purchaseVal > 0 && avgPrice === 0) {
        avgPrice = purchaseVal / quantity;
      } else if (avgPrice > 0 && purchaseVal === 0) {
        purchaseVal = avgPrice * quantity;
      }

      // Explicit current value only — never fabricate purchaseVal as current valuation
      const currentVal = input.currentValue ?? input.manualCurrentValue ?? null;

      return prisma.$transaction(async (tx) => {
        const holding = await tx.portfolioHolding.create({
          data: {
            type: "GOLD",
            name: input.name,
            symbol: input.symbol ?? null,
            subType: input.subType || "PHYSICAL_GOLD",
            purity: input.purity as GoldPurity | null,
            manualCurrentValue: currentVal && currentVal > 0 ? new Prisma.Decimal(currentVal) : undefined,
            notes: input.notes ?? null,
            source: input.source ?? "MANUAL",
            userId,
          },
        });

        await tx.portfolioTransaction.create({
          data: {
            holdingId: holding.id,
            userId,
            side: "BUY",
            quantity: new Prisma.Decimal(quantity),
            price: new Prisma.Decimal(avgPrice),
            date: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
          },
        });

        return holding;
      });
    }

    // 3. STOCKS, ETFS, MUTUAL FUNDS, BONDS, OTHER
    return prisma.$transaction(async (tx) => {
      // Do NOT set manualPrice = averageBuyPrice; averageBuyPrice is recorded on transaction.
      // manualPrice is reserved for actual current valuation.
      const currentVal = input.manualCurrentValue ?? null;
      const currentUnitRate = input.manualPrice ?? null;

      const holding = await tx.portfolioHolding.create({
        data: {
          type: input.type as HoldingType,
          name: input.name,
          symbol: input.symbol ?? null,
          subType: input.subType || (input.type === "STOCK" && /etf|bees/i.test(input.name) ? "ETF" : input.type),
          notes: input.notes ?? null,
          source: input.source ?? "MANUAL",
          manualCurrentValue: currentVal && currentVal > 0 ? new Prisma.Decimal(currentVal) : undefined,
          manualPrice: currentUnitRate && currentUnitRate > 0 ? new Prisma.Decimal(currentUnitRate) : undefined,
          userId,
        },
      });

      await tx.portfolioTransaction.create({
        data: {
          holdingId: holding.id,
          userId,
          side: "BUY",
          quantity: new Prisma.Decimal(input.quantity),
          price: new Prisma.Decimal(input.averageBuyPrice),
          date: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
        },
      });

      return holding;
    });
  },

  async list(userId: number) {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
      include: { transactions: true },
      orderBy: { createdAt: "desc" },
    });

    let totalInvested = ZERO;
    let totalKnownCurrent = ZERO;
    let totalDayChange = ZERO;
    let pricedInvested = ZERO;
    let pricedCurrent = ZERO;
    let unpricedInvested = ZERO;
    let unpricedCount = 0;
    const allocation = new Map<string, Prisma.Decimal>();

    const serializedHoldings = holdings.map((holding) => {
      const view = computeHoldingView(holding);

      totalInvested = totalInvested.plus(view.investedAmount);

      if (view.priceSource !== "UNAVAILABLE" && view.currentValue !== null) {
        pricedInvested = pricedInvested.plus(view.investedAmount);
        pricedCurrent = pricedCurrent.plus(view.currentValue);
        totalKnownCurrent = totalKnownCurrent.plus(view.currentValue);

        // Only include supported types in the allocation chart
        if (["STOCK", "MUTUAL_FUND", "GOLD", "FIXED_DEPOSIT"].includes(holding.type)) {
          const allocKey = holding.type;
          allocation.set(allocKey, (allocation.get(allocKey) ?? ZERO).plus(view.currentValue));
        }
      } else {
        unpricedInvested = unpricedInvested.plus(view.investedAmount);
        unpricedCount += 1;

        // Fallback: allocate by cost basis — only for supported types
        if (["STOCK", "MUTUAL_FUND", "GOLD", "FIXED_DEPOSIT"].includes(holding.type)) {
          const allocKey = holding.type;
          allocation.set(allocKey, (allocation.get(allocKey) ?? ZERO).plus(view.investedAmount));
        }
      }

      return {
        id: holding.id,
        type: holding.type,
        subType: holding.subType || holding.type,
        name: holding.name,
        symbol: holding.symbol,
        purity: holding.purity ?? null,
        source: holding.source || "MANUAL",
        notes: holding.notes ?? null,
        createdAt: holding.createdAt,
        // Fixed Deposit fields
        principal: holding.principal ? num(holding.principal) : null,
        interestRate: holding.interestRate ? num(holding.interestRate) : null,
        startDate: holding.startDate,
        maturityDate: holding.maturityDate,
        maturityAmount: holding.maturityAmount ? num(holding.maturityAmount) : null,
        daysToMaturity: view.daysToMaturity,
        isMatured: view.isMatured,
        // Computed fields
        quantity: view.remainingQty ? num(view.remainingQty) : null,
        avgBuyPrice: view.avgBuyPrice ? num(view.avgBuyPrice) : null,
        investedAmount: num(view.investedAmount) ?? 0,
        // currentValue is null when no reliable valuation exists — never invent a value
        currentValue: view.currentValue !== null ? num(view.currentValue) : null,
        profitLoss: view.profitLoss !== null ? num(view.profitLoss) : null,
        returnPct: view.returnPct !== null ? num(view.returnPct) : null,
        priceSource: view.priceSource,
        valuationSource: view.valuationSource,
        valuationDate: view.valuationDate ? view.valuationDate.toISOString().split("T")[0] : null,
        marketStatus: view.marketStatus,
        currency: view.currency,
      };
    });

    const allocationObj: Record<string, number> = {};
    for (const [type, value] of allocation) allocationObj[type] = num(value)!;

    // Returns are computed strictly on assets with verified current valuations
    const pricedReturns = pricedCurrent.minus(pricedInvested);
    const pricedReturnsPct = pricedInvested.greaterThan(ZERO)
      ? Number(pricedReturns.div(pricedInvested).times(100).toFixed(2))
      : 0;

    // Estimated total value combines known current value + cost basis for unpriced holdings
    const estimatedTotalValue = totalKnownCurrent.plus(unpricedInvested);

    // Filter into categorized shelves
    const stocksAndEtfs = serializedHoldings.filter(
      (h) => h.type === "STOCK" || h.subType === "ETF"
    );
    const mutualFunds = serializedHoldings.filter((h) => h.type === "MUTUAL_FUND");
    const gold = serializedHoldings.filter((h) => h.type === "GOLD");
    const fixedDeposits = serializedHoldings.filter((h) => h.type === "FIXED_DEPOSIT");
    const otherAssets = serializedHoldings.filter(
      (h) => h.type === "BOND" || h.type === "OTHER" || h.type === "CRYPTO"
    );

    // Summary performance insight
    let performanceInsight = "";
    if (pricedInvested.greaterThan(ZERO)) {
      if (pricedReturns.greaterThan(ZERO)) {
        performanceInsight = `Your priced assets are up by ${pricedReturnsPct.toFixed(1)}% (+₹${Math.round(Number(pricedReturns)).toLocaleString("en-IN")}) overall.`;
      } else if (pricedReturns.lessThan(ZERO)) {
        performanceInsight = `Your priced assets are currently down by ${Math.abs(pricedReturnsPct).toFixed(1)}% overall.`;
      } else {
        performanceInsight = `Your priced asset value is aligned with your invested capital.`;
      }
    } else {
      performanceInsight = `Your asset value reflects your recorded cost basis. Add manual valuations or statement imports to track live returns.`;
    }

    const history = await loadPortfolioHistory(userId);

    return {
      holdings: serializedHoldings,
      shelves: {
        stocksAndEtfs,
        mutualFunds,
        gold,
        fixedDeposits,
        otherAssets,
      },
      categorized: {
        stocksAndEtfs,
        mutualFunds,
        gold,
        fixedDeposits,
        otherAssets,
      },
      summary: {
        totalInvested: num(totalInvested) ?? 0,
        totalCurrent: num(totalKnownCurrent) ?? 0,
        totalKnownCurrent: num(totalKnownCurrent) ?? 0,
        estimatedTotalValue: num(estimatedTotalValue) ?? 0,
        hasUnpriced: unpricedCount > 0,
        isFullyPriced: unpricedCount === 0 && holdings.length > 0,
        returns: num(pricedReturns) ?? 0,
        returnsPct: pricedReturnsPct,
        dayChange: num(totalDayChange) ?? 0,
        dayChangePct: 0,
        pricedInvested: num(pricedInvested) ?? 0,
        pricedCurrent: num(pricedCurrent) ?? 0,
        pricedReturns: num(pricedReturns) ?? 0,
        pricedReturnsPct,
        unpricedInvested: num(unpricedInvested) ?? 0,
        unpricedCount,
        allocation: allocationObj,
        performanceInsight,
      },
      history,
    };
  },

  /**
   * Live market status is not available — FinSight no longer polls external
   * market APIs. Returns an empty array so that existing routes remain
   * functional without throwing 404s.
   */
  async getMarketStatus(_userId: number) {
    return [];
  },

  async remove(userId: number, holdingId: number) {
    const holding = await prisma.portfolioHolding.findFirst({
      where: { id: holdingId, userId },
    });

    if (!holding) {
      throw new AppError("Holding not found", 404);
    }

    await prisma.portfolioHolding.delete({
      where: { id: holdingId },
    });

    return { success: true };
  },

  async updateHolding(userId: number, holdingId: number, input: UpdateHoldingInput) {
    const holding = await prisma.portfolioHolding.findFirst({
      where: { id: holdingId, userId },
    });

    if (!holding) {
      throw new AppError("Holding not found", 404);
    }

    const data: Prisma.PortfolioHoldingUpdateInput = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.symbol !== undefined) data.symbol = input.symbol;
    if (input.notes !== undefined) data.notes = input.notes;

    if (holding.type === "FIXED_DEPOSIT") {
      if (input.principal !== undefined) data.principal = new Prisma.Decimal(input.principal);
      if (input.interestRate !== undefined) data.interestRate = new Prisma.Decimal(input.interestRate);
      if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
      if (input.maturityDate !== undefined) data.maturityDate = input.maturityDate ? new Date(input.maturityDate) : null;
      if (input.maturityAmount !== undefined) data.maturityAmount = input.maturityAmount ? new Prisma.Decimal(input.maturityAmount) : null;
    }

    if (input.manualPrice !== undefined) {
      data.manualPrice = input.manualPrice ? new Prisma.Decimal(input.manualPrice) : null;
    }
    if (input.manualCurrentValue !== undefined) {
      data.manualCurrentValue = input.manualCurrentValue ? new Prisma.Decimal(input.manualCurrentValue) : null;
    }

    const updated = await prisma.portfolioHolding.update({
      where: { id: holdingId },
      data,
      include: { transactions: true },
    });

    return computeHoldingView(updated);
  },

  async addTransaction(userId: number, holdingId: number, input: AddTransactionInput) {
    const holding = await prisma.portfolioHolding.findFirst({
      where: { id: holdingId, userId },
      include: { transactions: true },
    });

    if (!holding) {
      throw new AppError("Holding not found", 404);
    }

    if (holding.type === "FIXED_DEPOSIT") {
      throw new AppError("Transactions cannot be added to Fixed Deposits", 400);
    }

    return prisma.$transaction(async (tx) => {
      const { remainingQty, avgBuyPrice } = computeQuantityAndCost(holding.transactions);

      if (input.side === "SELL" && new Decimal(input.quantity).greaterThan(remainingQty)) {
        throw new AppError(
          `Cannot sell ${input.quantity} units; you only hold ${remainingQty.toFixed(4)} units`,
          400
        );
      }

      const txDate = input.date ? new Date(input.date) : new Date();

      const createdTx = await tx.portfolioTransaction.create({
        data: {
          holdingId,
          userId,
          side: input.side,
          quantity: new Prisma.Decimal(input.quantity),
          price: new Prisma.Decimal(input.price),
          date: txDate,
        },
      });

      if (input.side === "SELL") {
        const qtyDec = new Decimal(input.quantity);
        const salePriceDec = new Decimal(input.price);
        const realizedGainDec = salePriceDec.minus(avgBuyPrice).times(qtyDec);

        await tx.realizedGain.create({
          data: {
            holdingId,
            transactionId: createdTx.id,
            userId,
            quantity: new Prisma.Decimal(input.quantity),
            salePrice: new Prisma.Decimal(input.price),
            avgCostBasis: new Prisma.Decimal(avgBuyPrice.toFixed(4)),
            realizedGain: new Prisma.Decimal(realizedGainDec.toFixed(4)),
            date: txDate,
          },
        });
      }

      return createdTx;
    });
  },

  async getTransactions(userId: number, holdingId: number) {
    const holding = await prisma.portfolioHolding.findFirst({
      where: { id: holdingId, userId },
    });

    if (!holding) {
      throw new AppError("Holding not found", 404);
    }

    return prisma.portfolioTransaction.findMany({
      where: { holdingId, userId },
      orderBy: { date: "desc" },
    });
  },

  async updateManualPrice(userId: number, holdingId: number, price: number, currentValue?: number) {
    const holding = await prisma.portfolioHolding.findFirst({
      where: { id: holdingId, userId },
    });

    if (!holding) {
      throw new AppError("Holding not found", 404);
    }

    return prisma.portfolioHolding.update({
      where: { id: holdingId },
      data: {
        manualPrice: new Prisma.Decimal(price),
        manualCurrentValue: currentValue !== undefined ? new Prisma.Decimal(currentValue) : holding.manualCurrentValue,
      },
    });
  },

  async getRealizedGains(userId: number, filters: { startDate?: string; endDate?: string } = {}) {
    const where: Prisma.RealizedGainWhereInput = { userId };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const gains = await prisma.realizedGain.findMany({
      where,
      include: { holding: true },
      orderBy: { date: "desc" },
    });

    let totalRealizedGain = ZERO;
    let totalGain = ZERO;
    let totalLoss = ZERO;

    const items = gains.map((g) => {
      const gainDec = g.realizedGain;
      totalRealizedGain = totalRealizedGain.plus(gainDec);
      if (gainDec.greaterThan(ZERO)) {
        totalGain = totalGain.plus(gainDec);
      } else {
        totalLoss = totalLoss.plus(gainDec);
      }

      const gainNum = num(gainDec) ?? 0;
      const basis = num(g.avgCostBasis) ?? 0;
      const gainPct = basis > 0 ? Number(((gainNum / (basis * (num(g.quantity) ?? 1))) * 100).toFixed(2)) : 0;

      return {
        id: g.id,
        holdingId: g.holdingId,
        holdingName: g.holding.name,
        holdingType: g.holding.type,
        quantity: num(g.quantity),
        salePrice: num(g.salePrice),
        avgCostBasis: num(g.avgCostBasis),
        realizedGain: gainNum,
        gainPct,
        date: g.date,
        createdAt: g.createdAt,
      };
    });

    return {
      realizedGains: items,
      summary: {
        totalRealizedGain: num(totalRealizedGain) ?? 0,
        totalGain: num(totalGain) ?? 0,
        totalLoss: num(totalLoss) ?? 0,
        count: items.length,
      },
    };
  },

  async getAllocationTargets(userId: number) {
    const SUPPORTED_HOLDING_TYPES: Array<{ type: HoldingType; label: string }> = [
      { type: "STOCK",         label: "Stocks" },
      { type: "MUTUAL_FUND",   label: "Mutual Funds" },
      { type: "GOLD",          label: "Gold" },
      { type: "FIXED_DEPOSIT", label: "Fixed Deposits" },
    ];

    const [targets, portfolioResult] = await Promise.all([
      prisma.portfolioAllocationTarget.findMany({
        where: { userId },
      }),
      this.list(userId),
    ]);

    const targetMap = new Map<string, number>();
    for (const t of targets) {
      targetMap.set(t.holdingType, num(t.targetPct) ?? 0);
    }

    const totalCurrent = portfolioResult.summary.totalCurrent || 0;
    const allocation = portfolioResult.summary.allocation;

    let totalTargetPct = 0;
    const items = SUPPORTED_HOLDING_TYPES.map(({ type, label }) => {
      const currentValue = allocation[type] || 0;
      const actualPct = totalCurrent > 0 ? Number(((currentValue / totalCurrent) * 100).toFixed(1)) : 0;
      const targetPct = targetMap.get(type) ?? 0;
      totalTargetPct += targetPct;
      const driftPct = Number((actualPct - targetPct).toFixed(1));

      let status: "OVER" | "UNDER" | "ON_TARGET" = "ON_TARGET";
      if (driftPct > 2) {
        status = "OVER";
      } else if (driftPct < -2) {
        status = "UNDER";
      }

      return {
        holdingType: type,
        label,
        currentValue,
        actualPct,
        targetPct,
        driftPct,
        status,
      };
    });

    return {
      targets: items,
      summary: {
        totalTargetPct: Number(totalTargetPct.toFixed(1)),
        hasTargets: targets.length > 0,
      },
    };
  },

  async setAllocationTargets(
    userId: number,
    targets: Array<{ holdingType: HoldingType; targetPct: number }>
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.portfolioAllocationTarget.deleteMany({ where: { userId } });

      const toCreate = targets
        .filter((t) => t.targetPct > 0)
        .map((t) => ({
          userId,
          holdingType: t.holdingType,
          targetPct: new Prisma.Decimal(t.targetPct),
        }));

      if (toCreate.length > 0) {
        await tx.portfolioAllocationTarget.createMany({ data: toCreate });
      }

      return this.getAllocationTargets(userId);
    });
  },
};
