import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/database/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { CreateTransactionInput } from "@/validators/transaction.validator";
import { computeTransactionHash } from "@/utils/categorizationRules";
import { isInternalTransferTransaction } from "@/services/report.service";

function buildDateRange(filters: { period?: string; month?: number; year?: number }) {
  const { period, month, year } = filters;
  if (period === "all_time") return null;
  if (period === "yearly" && year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { gte: start, lt: end };
  }
  if (period === "monthly" && month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { gte: start, lt: end };
  }
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { gte: start, lt: end };
  }
  if (year && !month) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { gte: start, lt: end };
  }
  return null;
}

function isCreditLike(description?: string | null): boolean {
  if (!description) return false;
  const d = description.toLowerCase();
  return /\b(cr|credit|deposit|received|refund)\b/.test(d);
}

export const transactionService = {
  /** All-time income minus expense for a user, via DB-side aggregation.
   * Excludes TRANSFER transactions so personal movements never inflate income or expense. */
  async totalSavings(userId: number) {
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId, type: "INCOME" }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: "EXPENSE" }, _sum: { amount: true } }),
    ]);
    const income = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const expense = expenseAgg._sum.amount ?? new Prisma.Decimal(0);
    return { income, expense, savings: income.minus(expense) };
  },

  async create(userId: number, input: CreateTransactionInput) {
    const date = input.date ? new Date(input.date) : new Date();
    const hash = computeTransactionHash(
      userId,
      date,
      Number(input.amount),
      input.description || "",
      input.type
    );

    // 1. Strict Duplicate Check: prevent duplicate insertion anywhere in database
    const existingTx = await prisma.transaction.findFirst({
      where: { transactionHash: hash },
    });
    if (existingTx) {
      throw new AppError("A duplicate transaction with identical details already exists in the ledger.", 409);
    }

    return prisma.$transaction(async (tx) => {
      // 2. Insert into main Transaction ledger
      const transaction = await tx.transaction.create({
        data: {
          amount: input.amount,
          type: input.type,
          description: input.description,
          date,
          userId,
          categoryId: input.categoryId,
          sourceAccount: input.sourceAccount || null,
          destinationAccount: input.destinationAccount || null,
          linkedTransactionId: input.linkedTransactionId || null,
          transactionHash: hash,
        },
        include: {
          category: true,
          linkedTransaction: {
            select: { id: true, amount: true, type: true, description: true, date: true },
          },
        },
      });

      // 3. Remove any matching pending review queue item to ensure zero cross-table duplicates
      await tx.reviewQueueTransaction.deleteMany({
        where: {
          userId,
          transactionHash: hash,
        },
      });

      // 4. Atomically increment User totalIncome or totalExpense (transfers do not affect user income/expense)
      if (input.type === "INCOME") {
        await tx.user.update({
          where: { id: userId },
          data: { totalIncome: { increment: new Prisma.Decimal(input.amount) } },
        });
      } else if (input.type === "EXPENSE") {
        await tx.user.update({
          where: { id: userId },
          data: { totalExpense: { increment: new Prisma.Decimal(input.amount) } },
        });
      }

      return transaction;
    });
  },

  async list(
    userId: number,
    filters: { period?: string; month?: number; year?: number; type?: "INCOME" | "EXPENSE" | "TRANSFER"; categoryId?: number }
  ) {
    const dateRange = buildDateRange(filters);
    return prisma.transaction.findMany({
      where: {
        userId,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(dateRange ? { date: dateRange } : {}),
      },
      include: {
        category: true,
        linkedTransaction: {
          select: { id: true, amount: true, type: true, description: true, date: true },
        },
      },
      orderBy: { date: "desc" },
    });
  },

  async remove(userId: number, id: number) {
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError("Transaction not found", 404);

    await prisma.$transaction(async (tx) => {
      // If linked to another transaction, unlink the partner first so it remains safely unmatched
      if (existing.linkedTransactionId) {
        await tx.transaction.updateMany({
          where: { id: existing.linkedTransactionId, userId },
          data: { linkedTransactionId: null },
        });
      }
      await tx.transaction.updateMany({
        where: { linkedTransactionId: id, userId },
        data: { linkedTransactionId: null },
      });

      await tx.transaction.delete({ where: { id } });

      // Atomically decrement User totalIncome or totalExpense only if not a transfer
      if (existing.type === "INCOME") {
        await tx.user.update({
          where: { id: userId },
          data: { totalIncome: { decrement: existing.amount } },
        });
      } else if (existing.type === "EXPENSE") {
        await tx.user.update({
          where: { id: userId },
          data: { totalExpense: { decrement: existing.amount } },
        });
      }
    });
  },

  async summary(userId: number, filters: { period?: string; month?: number; year?: number }) {
    const dateRange = buildDateRange(filters);
    const [transactions, allTimeSavingsAgg] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, ...(dateRange ? { date: dateRange } : {}) },
        include: { category: true },
      }),
      this.totalSavings(userId),
    ]);

    const totals = transactions.reduce(
      (acc: { income: number; expense: number; transfers: number }, t) => {
        const amt = Number(t.amount);
        if (t.type === "INCOME") acc.income += amt;
        else if (t.type === "EXPENSE") acc.expense += amt;
        else if (t.type === "TRANSFER") acc.transfers += amt;
        return acc;
      },
      { income: 0, expense: 0, transfers: 0 }
    );

    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      const key = t.category?.name || "Uncategorized";
      byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
    }

    // Compute previous equivalent period comparison when reliable data is available
    let previous: {
      income: number;
      expense: number;
      savings: number;
      savingsRate: number;
      incomeChangePct: number | null;
      expenseChangePct: number | null;
      savingsDiff: number | null;
      hasData: boolean;
      label: string;
    } | null = null;

    if (filters.period === "monthly" && filters.month && filters.year) {
      const prevMonth = filters.month === 1 ? 12 : filters.month - 1;
      const prevYear = filters.month === 1 ? filters.year - 1 : filters.year;
      const prevStart = new Date(prevYear, prevMonth - 1, 1);
      const prevEnd = new Date(prevYear, prevMonth, 1);
      const prevTxs = await prisma.transaction.findMany({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
      });
      if (prevTxs.length > 0) {
        let pIncome = 0;
        let pExpense = 0;
        for (const t of prevTxs) {
          if (t.type === "INCOME") pIncome += Number(t.amount);
          else if (t.type === "EXPENSE") pExpense += Number(t.amount);
        }
        const pSavings = pIncome - pExpense;
        const pRate = pIncome > 0 ? pSavings / pIncome : 0;
        const incomeChangePct = pIncome > 0 ? Number((((totals.income - pIncome) / pIncome) * 100).toFixed(1)) : null;
        const expenseChangePct = pExpense > 0 ? Number((((totals.expense - pExpense) / pExpense) * 100).toFixed(1)) : null;
        const savingsDiff = (totals.income - totals.expense) - pSavings;
        previous = {
          income: pIncome,
          expense: pExpense,
          savings: pSavings,
          savingsRate: pRate,
          incomeChangePct,
          expenseChangePct,
          savingsDiff,
          hasData: true,
          label: `${prevMonth}/${prevYear}`,
        };
      }
    } else if (filters.period === "yearly" && filters.year) {
      const prevYear = filters.year - 1;
      const prevStart = new Date(prevYear, 0, 1);
      const prevEnd = new Date(prevYear + 1, 0, 1);
      const prevTxs = await prisma.transaction.findMany({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
      });
      if (prevTxs.length > 0) {
        let pIncome = 0;
        let pExpense = 0;
        for (const t of prevTxs) {
          if (t.type === "INCOME") pIncome += Number(t.amount);
          else if (t.type === "EXPENSE") pExpense += Number(t.amount);
        }
        const pSavings = pIncome - pExpense;
        const pRate = pIncome > 0 ? pSavings / pIncome : 0;
        const incomeChangePct = pIncome > 0 ? Number((((totals.income - pIncome) / pIncome) * 100).toFixed(1)) : null;
        const expenseChangePct = pExpense > 0 ? Number((((totals.expense - pExpense) / pExpense) * 100).toFixed(1)) : null;
        const savingsDiff = (totals.income - totals.expense) - pSavings;
        previous = {
          income: pIncome,
          expense: pExpense,
          savings: pSavings,
          savingsRate: pRate,
          incomeChangePct,
          expenseChangePct,
          savingsDiff,
          hasData: true,
          label: `${prevYear}`,
        };
      }
    }

    return {
      income: totals.income,
      expense: totals.expense,
      transfers: totals.transfers,
      savings: totals.income - totals.expense,
      savingsRate: totals.income > 0 ? (totals.income - totals.expense) / totals.income : 0,
      byCategory,
      allTimeSavings: Number(allTimeSavingsAgg.savings),
      previous,
    };
  },

  async update(userId: number, id: number, input: Partial<CreateTransactionInput>) {
    const tx = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) throw new AppError("Transaction not found", 404);

    const newAmount = input.amount !== undefined ? input.amount : tx.amount;
    const newType = input.type !== undefined ? input.type : tx.type;
    const newDate = input.date ? new Date(input.date) : tx.date;
    const newDesc = input.description !== undefined ? input.description : (tx.description || "");

    const newHash = computeTransactionHash(
      userId,
      newDate,
      Number(newAmount),
      newDesc || "",
      newType
    );

    return prisma.$transaction(async (prismaTx) => {
      const updated = await prismaTx.transaction.update({
        where: { id },
        data: {
          amount: input.amount !== undefined ? input.amount : undefined,
          type: input.type !== undefined ? input.type : undefined,
          description: input.description !== undefined ? input.description : undefined,
          date: input.date ? new Date(input.date) : undefined,
          categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
          sourceAccount: input.sourceAccount !== undefined ? input.sourceAccount : undefined,
          destinationAccount: input.destinationAccount !== undefined ? input.destinationAccount : undefined,
          linkedTransactionId: input.linkedTransactionId !== undefined ? input.linkedTransactionId : undefined,
          transactionHash: newHash,
        },
        include: {
          category: true,
          linkedTransaction: {
            select: { id: true, amount: true, type: true, description: true, date: true },
          },
        },
      });

      // Adjust user totals for type and amount changes
      if (tx.type === "INCOME") {
        await prismaTx.user.update({
          where: { id: userId },
          data: { totalIncome: { decrement: tx.amount } },
        });
      } else if (tx.type === "EXPENSE") {
        await prismaTx.user.update({
          where: { id: userId },
          data: { totalExpense: { decrement: tx.amount } },
        });
      }

      if (newType === "INCOME") {
        await prismaTx.user.update({
          where: { id: userId },
          data: { totalIncome: { increment: new Prisma.Decimal(newAmount) } },
        });
      } else if (newType === "EXPENSE") {
        await prismaTx.user.update({
          where: { id: userId },
          data: { totalExpense: { increment: new Prisma.Decimal(newAmount) } },
        });
      }
      // If newType === "TRANSFER", user totalIncome and totalExpense are unaffected

      return updated;
    });
  },

  /**
   * Discovers candidate counterpart transactions for potential transfer pairing.
   * Criteria:
   * 1. Belongs to the same user and is not already linked.
   * 2. Within a 3-day window of the target transaction date.
   * 3. Opposite direction (credit vs debit) and matching / identical amount.
   * Never classifies transfers on amount alone; returns scored suggestions for user review.
   */
  async getTransferCandidates(userId: number, transactionId: number) {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { category: true },
    });
    if (!tx) throw new AppError("Transaction not found", 404);

    const txAmount = Number(tx.amount);
    const txDate = new Date(tx.date);

    const windowStart = new Date(txDate);
    windowStart.setDate(windowStart.getDate() - 3);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(txDate);
    windowEnd.setDate(windowEnd.getDate() + 3);
    windowEnd.setHours(23, 59, 59, 999);

    const targetIsDebit =
      tx.type === "EXPENSE" ||
      (tx.type === "TRANSFER" && !isCreditLike(tx.description));

    const candidates = await prisma.transaction.findMany({
      where: {
        userId,
        id: { not: transactionId },
        linkedTransactionId: null,
        date: { gte: windowStart, lte: windowEnd },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const results = [];
    for (const cand of candidates) {
      const candAmount = Number(cand.amount);
      const candIsDebit =
        cand.type === "EXPENSE" ||
        (cand.type === "TRANSFER" && !isCreditLike(cand.description));

      const isOppositeDirection = targetIsDebit !== candIsDebit;
      const isExactAmount = Math.abs(candAmount - txAmount) < 0.01;

      const hasTransferKeyword =
        isInternalTransferTransaction(cand.category?.name, cand.description) ||
        isInternalTransferTransaction(tx.category?.name, tx.description);

      const dayDiff = Math.abs(new Date(cand.date).getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);

      // Do NOT consider candidates that don't match amount
      if (!isExactAmount) continue;

      let score = 0;
      if (isExactAmount) score += 50;
      if (isOppositeDirection) score += 25;
      if (dayDiff <= 0.5) score += 20;
      else if (dayDiff <= 1.5) score += 15;
      else if (dayDiff <= 3.0) score += 5;
      if (hasTransferKeyword) score += 20;

      const confidence: "HIGH" | "SUGGESTED" =
        isExactAmount && isOppositeDirection && (dayDiff <= 1.5 || hasTransferKeyword)
          ? "HIGH"
          : "SUGGESTED";

      results.push({
        transaction: {
          id: cand.id,
          amount: candAmount,
          type: cand.type,
          description: cand.description,
          date: cand.date,
          categoryName: cand.category?.name || "Uncategorized",
          sourceAccount: cand.sourceAccount,
          destinationAccount: cand.destinationAccount,
        },
        score,
        confidence,
        dayDifference: Math.round(dayDiff * 10) / 10,
        isOppositeDirection,
        isExactAmount,
        hasTransferKeyword,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  },

  /**
   * Links two transactions into a single logical personal transfer pair.
   * Both original transactions are preserved in the ledger (neither is deleted).
   * Both are updated to type TRANSFER and excluded from income and expenses.
   */
  async linkTransfer(userId: number, outgoingId: number, incomingId: number) {
    if (outgoingId === incomingId) {
      throw new AppError("Cannot link a transaction to itself", 400);
    }

    const [txA, txB] = await Promise.all([
      prisma.transaction.findFirst({ where: { id: outgoingId, userId } }),
      prisma.transaction.findFirst({ where: { id: incomingId, userId } }),
    ]);

    if (!txA || !txB) {
      throw new AppError("One or both transactions were not found or do not belong to you", 404);
    }

    let transferCat = await prisma.category.findFirst({ where: { type: "TRANSFER" } });
    if (!transferCat) {
      transferCat = await prisma.category.upsert({
        where: { name: "Internal Transfer" },
        update: { type: "TRANSFER" },
        create: { name: "Internal Transfer", type: "TRANSFER" },
      });
    }

    return prisma.$transaction(async (prismaTx) => {
      // Revert income/expense totals if either transaction was previously classified as INCOME or EXPENSE
      if (txA.type === "INCOME") {
        await prismaTx.user.update({ where: { id: userId }, data: { totalIncome: { decrement: txA.amount } } });
      } else if (txA.type === "EXPENSE") {
        await prismaTx.user.update({ where: { id: userId }, data: { totalExpense: { decrement: txA.amount } } });
      }

      if (txB.type === "INCOME") {
        await prismaTx.user.update({ where: { id: userId }, data: { totalIncome: { decrement: txB.amount } } });
      } else if (txB.type === "EXPENSE") {
        await prismaTx.user.update({ where: { id: userId }, data: { totalExpense: { decrement: txB.amount } } });
      }

      const updatedA = await prismaTx.transaction.update({
        where: { id: txA.id },
        data: {
          type: "TRANSFER",
          categoryId: transferCat!.id,
          linkedTransactionId: txB.id,
        },
        include: {
          category: true,
          linkedTransaction: {
            select: { id: true, amount: true, type: true, description: true, date: true },
          },
        },
      });

      const updatedB = await prismaTx.transaction.update({
        where: { id: txB.id },
        data: {
          type: "TRANSFER",
          categoryId: transferCat!.id,
          linkedTransactionId: txA.id,
        },
        include: {
          category: true,
          linkedTransaction: {
            select: { id: true, amount: true, type: true, description: true, date: true },
          },
        },
      });

      return { outgoing: updatedA, incoming: updatedB };
    });
  },

  /**
   * Unlinks a transfer pair so both remain safe, individual transactions.
   */
  async unlinkTransfer(userId: number, transactionId: number) {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });
    if (!tx) throw new AppError("Transaction not found", 404);

    return prisma.$transaction(async (prismaTx) => {
      if (tx.linkedTransactionId) {
        await prismaTx.transaction.updateMany({
          where: { id: tx.linkedTransactionId, userId },
          data: { linkedTransactionId: null },
        });
      }
      await prismaTx.transaction.update({
        where: { id: transactionId },
        data: { linkedTransactionId: null },
      });
      return { success: true };
    });
  },
};

