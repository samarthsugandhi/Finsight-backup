import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "@/database/prisma";
import { TransactionType } from "@prisma/client";
import { transactionService } from "@/services/transaction.service";
import { reportService, isInternalTransferTransaction } from "@/services/report.service";
import { matchKeyword, KEYWORD_DICTIONARY } from "@/utils/categorizationRules";

describe("FinSight Personal Transfers Test Suite", () => {
  let userAId: number;
  let userBId: number;
  let salaryCatId: number;
  let foodCatId: number;
  let transferCatId: number;

  before(async () => {
    // 1. Setup isolated test users
    const userA = await prisma.user.upsert({
      where: { email: "transfer-test-user-a@finsight.dev" },
      update: { totalIncome: 0, totalExpense: 0 },
      create: {
        email: "transfer-test-user-a@finsight.dev",
        name: "Transfer Tester A",
        passwordHash: "hash123",
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.upsert({
      where: { email: "transfer-test-user-b@finsight.dev" },
      update: { totalIncome: 0, totalExpense: 0 },
      create: {
        email: "transfer-test-user-b@finsight.dev",
        name: "Transfer Tester B",
        passwordHash: "hash123",
      },
    });
    userBId = userB.id;

    // 2. Setup categories
    const sal = await prisma.category.upsert({
      where: { name: "Salary" },
      update: { type: TransactionType.INCOME },
      create: { name: "Salary", type: TransactionType.INCOME },
    });
    salaryCatId = sal.id;

    const food = await prisma.category.upsert({
      where: { name: "Food & Dining" },
      update: { type: TransactionType.EXPENSE },
      create: { name: "Food & Dining", type: TransactionType.EXPENSE },
    });
    foodCatId = food.id;

    const trf = await prisma.category.upsert({
      where: { name: "Internal Transfer" },
      update: { type: TransactionType.TRANSFER },
      create: { name: "Internal Transfer", type: TransactionType.TRANSFER },
    });
    transferCatId = trf.id;

    // Clean any prior test transactions
    await prisma.transaction.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
  });

  after(async () => {
    await prisma.transaction.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
  });

  // ==========================================================================
  // 1. MANUAL CLASSIFICATION & RECLASSIFICATION WORKFLOW
  // ==========================================================================
  describe("1. Manual Classification & Reclassification", () => {
    it("creates a transaction as TRANSFER without inflating user totalIncome or totalExpense", async () => {
      const initialUser = await prisma.user.findUnique({ where: { id: userAId } });
      const initialInc = Number(initialUser?.totalIncome ?? 0);
      const initialExp = Number(initialUser?.totalExpense ?? 0);

      const tx = await transactionService.create(userAId, {
        amount: 15000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "Self transfer from Savings to Zerodha",
        sourceAccount: "HDFC Bank",
        destinationAccount: "Zerodha Trading Account",
      });

      assert.strictEqual(tx.type, "TRANSFER");
      assert.strictEqual(tx.sourceAccount, "HDFC Bank");
      assert.strictEqual(tx.destinationAccount, "Zerodha Trading Account");
      assert.strictEqual(tx.linkedTransactionId, null);

      const updatedUser = await prisma.user.findUnique({ where: { id: userAId } });
      assert.strictEqual(Number(updatedUser?.totalIncome ?? 0), initialInc);
      assert.strictEqual(Number(updatedUser?.totalExpense ?? 0), initialExp);
    });

    it("reclassifies an existing EXPENSE to TRANSFER and adjusts user totals", async () => {
      const initialUser = await prisma.user.findUnique({ where: { id: userAId } });
      const baseExp = Number(initialUser?.totalExpense ?? 0);

      // Create an expense
      const expTx = await transactionService.create(userAId, {
        amount: 5000,
        type: TransactionType.EXPENSE,
        categoryId: foodCatId,
        description: "Erroneously categorized transfer",
      });

      const userAfterExp = await prisma.user.findUnique({ where: { id: userAId } });
      assert.strictEqual(Number(userAfterExp?.totalExpense), baseExp + 5000);

      // Reclassify to TRANSFER
      const reclassified = await transactionService.update(userAId, expTx.id, {
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        sourceAccount: "Axis Bank",
        destinationAccount: "HDFC Bank",
      });

      assert.strictEqual(reclassified.type, "TRANSFER");
      assert.strictEqual(reclassified.sourceAccount, "Axis Bank");
      assert.strictEqual(reclassified.destinationAccount, "HDFC Bank");

      const userAfterReclass = await prisma.user.findUnique({ where: { id: userAId } });
      assert.strictEqual(Number(userAfterReclass?.totalExpense), baseExp);
    });

    it("allows optional source and destination accounts without inventing unknown data", async () => {
      const tx = await transactionService.create(userAId, {
        amount: 2500,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "Transfer without specified accounts",
      });

      assert.strictEqual(tx.sourceAccount, null);
      assert.strictEqual(tx.destinationAccount, null);
    });
  });

  // ==========================================================================
  // 2. CANDIDATE MATCHING & SUGGESTIONS
  // ==========================================================================
  describe("2. Candidate Matching Logic", () => {
    it("suggests candidate matches within 3-day window with matching amount and opposite direction", async () => {
      const targetDate = new Date("2026-10-15T10:00:00.000Z");

      // Target: Outgoing transfer (debit) of ₹8,000
      const targetTx = await transactionService.create(userAId, {
        amount: 8000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "Transfer to SBI checking",
        date: targetDate.toISOString(),
      });

      // Candidate 1: Same day credit of ₹8,000 (HIGH confidence)
      const cand1 = await transactionService.create(userAId, {
        amount: 8000,
        type: TransactionType.INCOME,
        categoryId: salaryCatId,
        description: "Deposit from own checking (cr)",
        date: new Date("2026-10-15T11:00:00.000Z").toISOString(),
      });

      // Candidate 2: 1 day later credit of ₹8,000 with self transfer keyword (HIGH confidence)
      const cand2 = await transactionService.create(userAId, {
        amount: 8000,
        type: TransactionType.INCOME,
        categoryId: salaryCatId,
        description: "Self transfer credit",
        date: new Date("2026-10-16T09:00:00.000Z").toISOString(),
      });

      // Unmatched Candidate 3: Outside date window (7 days later)
      await transactionService.create(userAId, {
        amount: 8000,
        type: TransactionType.INCOME,
        categoryId: salaryCatId,
        description: "Deposit late",
        date: new Date("2026-10-22T09:00:00.000Z").toISOString(),
      });

      // Unmatched Candidate 4: Different amount (₹5,000)
      await transactionService.create(userAId, {
        amount: 5000,
        type: TransactionType.INCOME,
        categoryId: salaryCatId,
        description: "Different amount",
        date: new Date("2026-10-15T10:30:00.000Z").toISOString(),
      });

      const candidates = await transactionService.getTransferCandidates(userAId, targetTx.id);

      const candidateIds = candidates.map((c) => c.transaction.id);
      assert.ok(candidateIds.includes(cand1.id), "Candidate 1 should be suggested");
      assert.ok(candidateIds.includes(cand2.id), "Candidate 2 should be suggested");
      assert.strictEqual(candidates.length, 2, "Only 2 candidates within window should be returned");

      const top = candidates[0];
      assert.strictEqual(top.confidence, "HIGH");
      assert.strictEqual(top.isExactAmount, true);
    });

    it("does not classify transactions as transfers based on amount alone", () => {
      // Normal transaction with description "Swiggy order" should not match transfer keywords
      const isTransfer = isInternalTransferTransaction("Food & Dining", "Swiggy order #99238");
      assert.strictEqual(isTransfer, false);

      const isTransfer2 = isInternalTransferTransaction("Shopping", "Payment of 8000 at Reliance Digital");
      assert.strictEqual(isTransfer2, false);
    });
  });

  // ==========================================================================
  // 3. TRANSFER PAIR LINKING & UNLINKING
  // ==========================================================================
  describe("3. Transfer Pair Linking & Unlinking", () => {
    it("links an outgoing and incoming entry as a pair without deleting either original transaction", async () => {
      const initialUser = await prisma.user.findUnique({ where: { id: userAId } });
      const baseInc = Number(initialUser?.totalIncome ?? 0);
      const baseExp = Number(initialUser?.totalExpense ?? 0);

      // Create original outgoing bank entry (EXPENSE)
      const outgoing = await transactionService.create(userAId, {
        amount: 30000,
        type: TransactionType.EXPENSE,
        categoryId: foodCatId,
        description: "HDFC A/C DR 30000 to ICICI",
      });

      // Create original incoming bank entry (INCOME)
      const incoming = await transactionService.create(userAId, {
        amount: 30000,
        type: TransactionType.INCOME,
        categoryId: salaryCatId,
        description: "ICICI A/C CR 30000 from HDFC",
      });

      // Link as pair
      const result = await transactionService.linkTransfer(userAId, outgoing.id, incoming.id);

      // Verify both original transactions exist (neither deleted)
      const outgoingInDb = await prisma.transaction.findUnique({ where: { id: outgoing.id } });
      const incomingInDb = await prisma.transaction.findUnique({ where: { id: incoming.id } });

      assert.ok(outgoingInDb, "Outgoing transaction must remain in DB");
      assert.ok(incomingInDb, "Incoming transaction must remain in DB");

      assert.strictEqual(outgoingInDb.type, "TRANSFER");
      assert.strictEqual(incomingInDb.type, "TRANSFER");

      // Verify reciprocal link
      assert.strictEqual(outgoingInDb.linkedTransactionId, incoming.id);
      assert.strictEqual(incomingInDb.linkedTransactionId, outgoing.id);

      // Verify user income/expense reverted
      const userAfter = await prisma.user.findUnique({ where: { id: userAId } });
      assert.strictEqual(Number(userAfter?.totalIncome), baseInc);
      assert.strictEqual(Number(userAfter?.totalExpense), baseExp);
    });

    it("unlinks a transfer pair safely, preserving both transactions as unlinked", async () => {
      const txA = await transactionService.create(userAId, {
        amount: 10000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "Transfer Out",
      });
      const txB = await transactionService.create(userAId, {
        amount: 10000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "Transfer In",
      });

      await transactionService.linkTransfer(userAId, txA.id, txB.id);

      // Unlink
      const unlinkRes = await transactionService.unlinkTransfer(userAId, txA.id);
      assert.strictEqual(unlinkRes.success, true);

      const txAAfter = await prisma.transaction.findUnique({ where: { id: txA.id } });
      const txBAfter = await prisma.transaction.findUnique({ where: { id: txB.id } });

      assert.strictEqual(txAAfter?.linkedTransactionId, null);
      assert.strictEqual(txBAfter?.linkedTransactionId, null);
      assert.ok(txAAfter, "txA still exists");
      assert.ok(txBAfter, "txB still exists");
    });
  });

  // ==========================================================================
  // 4. ORDINARY PAYMENTS VS PERSONAL TRANSFERS
  // ==========================================================================
  describe("4. Statement Descriptions & P2P / Merchant Discrimination", () => {
    it("recognizes explicit self-transfer narrations", () => {
      assert.strictEqual(isInternalTransferTransaction("Internal Transfer", "Monthly deposit"), true);
      assert.strictEqual(isInternalTransferTransaction(null, "Self transfer to ICICI account"), true);
      assert.strictEqual(isInternalTransferTransaction(null, "Between own accounts transfer"), true);
      assert.strictEqual(isInternalTransferTransaction(null, "Transfer to own a/c"), true);
    });

    it("does not treat payments to other individuals or merchants as personal transfers", () => {
      assert.strictEqual(isInternalTransferTransaction("Transfers - Sent (P2P)", "Paid to Punith"), false);
      assert.strictEqual(isInternalTransferTransaction(null, "Paid to Rahul for dinner"), false);
      assert.strictEqual(isInternalTransferTransaction(null, "UPI/23901920/Sneha/groceries"), false);
      assert.strictEqual(isInternalTransferTransaction(null, "Swiggy order #10293"), false);
      assert.strictEqual(isInternalTransferTransaction(null, "Amazon Pay merchant checkout"), false);
    });
  });

  // ==========================================================================
  // 5. USER ISOLATION & AUTHENTICATED OWNERSHIP
  // ==========================================================================
  describe("5. User Isolation & Security", () => {
    it("prevents User B from querying transfer candidates for User A's transaction", async () => {
      const userATx = await transactionService.create(userAId, {
        amount: 7000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "User A private transfer",
      });

      await assert.rejects(
        async () => {
          await transactionService.getTransferCandidates(userBId, userATx.id);
        },
        /Transaction not found/
      );
    });

    it("prevents User B from linking User A's transaction", async () => {
      const userATx = await transactionService.create(userAId, {
        amount: 7000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "User A private transfer 1",
      });

      const userBTx = await transactionService.create(userBId, {
        amount: 7000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "User B transfer 2",
      });

      await assert.rejects(
        async () => {
          await transactionService.linkTransfer(userBId, userATx.id, userBTx.id);
        },
        /not found or do not belong to you/
      );
    });
  });

  // ==========================================================================
  // 6. REPORT TOTALS & FINANCIAL METRICS
  // ==========================================================================
  describe("6. Exclusion from Reports & Totals", () => {
    it("excludes transfers from income, expense, and savings rate while counting under totalTransfers", async () => {
      const periodDate = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Clean up previous transactions for User A to ensure absolute test isolation
      await prisma.transaction.deleteMany({ where: { userId: userAId } });

      // User A baseline:
      // +50,000 Salary (Income)
      // -20,000 Dining (Expense)
      // 15,000 Transfer (should not affect income or expense)
      await transactionService.create(userAId, {
        amount: 50000,
        type: TransactionType.INCOME,
        categoryId: salaryCatId,
        description: "Monthly Salary Income",
      });

      await transactionService.create(userAId, {
        amount: 20000,
        type: TransactionType.EXPENSE,
        categoryId: foodCatId,
        description: "Monthly Dining Expenses",
      });

      await transactionService.create(userAId, {
        amount: 15000,
        type: TransactionType.TRANSFER,
        categoryId: transferCatId,
        description: "Transfer to Savings",
      });

      const report = await reportService.generateReport(userAId, {
        period: "monthly",
        year,
        month,
        content: "summary",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      assert.strictEqual(report.summary.totalIncome, 50000, "Income must be exactly 50,000");
      assert.strictEqual(report.summary.totalExpenses, 20000, "Expenses must be exactly 20,000");
      assert.strictEqual(report.summary.netCashFlow, 30000, "Net cash flow must be 30,000");
      assert.strictEqual(report.summary.savingsRate, 60, "Savings rate must be 60%");
      assert.strictEqual(report.summary.totalTransfers, 15000, "Total transfers must track 15,000");

      // Verify transfer filter in report
      const transferReport = await reportService.generateReport(userAId, {
        period: "monthly",
        year,
        month,
        content: "transactions",
        type: "TRANSFER",
        page: 1,
        limit: 50,
      });

      assert.strictEqual(transferReport.transactions.items.length, 1);
      assert.strictEqual(transferReport.transactions.items[0].amount, 15000);
      assert.strictEqual(transferReport.transactions.items[0].isInternalTransfer, true);
    });
  });
});
