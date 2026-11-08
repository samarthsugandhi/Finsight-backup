import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "@/database/prisma";
import { TransactionType } from "@prisma/client";
import {
  reportService,
  resolveDateRanges,
  isInternalTransferTransaction,
  ReportData,
} from "@/services/report.service";
import { reportCsvService, escapeCsvField } from "@/services/reportCsv.service";
import { reportPdfService } from "@/services/reportPdf.service";
import { ReportQuerySchema } from "@/validators/report.validator";

describe("FinSight Reports Module Test Suite", () => {
  let testUserIdA: number;
  let testUserIdB: number;
  let salaryCatId: number;
  let diningCatId: number;
  let refundCatId: number;
  let transferCatId: number;

  before(async () => {
    // 1. Ensure test users exist
    const userA = await prisma.user.upsert({
      where: { email: "report-test-user-a@finsight.dev" },
      update: {},
      create: {
        email: "report-test-user-a@finsight.dev",
        name: "Report Tester A",
        passwordHash: "dummyhash",
      },
    });
    testUserIdA = userA.id;

    const userB = await prisma.user.upsert({
      where: { email: "report-test-user-b@finsight.dev" },
      update: {},
      create: {
        email: "report-test-user-b@finsight.dev",
        name: "Report Tester B",
        passwordHash: "dummyhash",
      },
    });
    testUserIdB = userB.id;

    // 2. Fetch or create categories
    const salCat = await prisma.category.upsert({
      where: { name: "Salary" },
      update: {},
      create: { name: "Salary", type: TransactionType.INCOME },
    });
    salaryCatId = salCat.id;

    const dinCat = await prisma.category.upsert({
      where: { name: "Food & Dining" },
      update: {},
      create: { name: "Food & Dining", type: TransactionType.EXPENSE },
    });
    diningCatId = dinCat.id;

    const refCat = await prisma.category.upsert({
      where: { name: "Refunds" },
      update: {},
      create: { name: "Refunds", type: TransactionType.INCOME },
    });
    refundCatId = refCat.id;

    const transCat = await prisma.category.upsert({
      where: { name: "Internal Transfer" },
      update: {},
      create: { name: "Internal Transfer", type: TransactionType.EXPENSE },
    });
    transferCatId = transCat.id;

    // 3. Clean any existing transactions for test users
    await prisma.transaction.deleteMany({
      where: { userId: { in: [testUserIdA, testUserIdB] } },
    });

    // 4. Seed test transactions for User A in Year 2026:
    // January 2026:
    // - Salary: +100,000 (INCOME)
    // - Food: -30,000 (EXPENSE)
    // - Internal Transfer: -20,000 (TRANSFER - should be excluded from income/expense)
    // - Refund: +5,000 (INCOME)
    // Expected Jan 2026: Income = 105,000, Expense = 30,000, Net = 75,000, SavingsRate = (75,000 / 105,000) * 100 = 71.4%
    await prisma.transaction.createMany({
      data: [
        {
          userId: testUserIdA,
          amount: 100000,
          type: TransactionType.INCOME,
          description: "Monthly Tech Salary",
          date: new Date("2026-01-05T10:00:00.000Z"),
          categoryId: salaryCatId,
          transactionHash: `test-hash-a1-${Date.now()}`,
        },
        {
          userId: testUserIdA,
          amount: 30000,
          type: TransactionType.EXPENSE,
          description: "Restaurants and groceries",
          date: new Date("2026-01-12T15:00:00.000Z"),
          categoryId: diningCatId,
          transactionHash: `test-hash-a2-${Date.now()}`,
        },
        {
          userId: testUserIdA,
          amount: 20000,
          type: TransactionType.EXPENSE,
          description: "Self Transfer to Savings Account",
          date: new Date("2026-01-15T12:00:00.000Z"),
          categoryId: transferCatId,
          transactionHash: `test-hash-a3-${Date.now()}`,
        },
        {
          userId: testUserIdA,
          amount: 5000,
          type: TransactionType.INCOME,
          description: "Amazon refund for damaged gadget",
          date: new Date("2026-01-20T11:00:00.000Z"),
          categoryId: refundCatId,
          transactionHash: `test-hash-a4-${Date.now()}`,
        },
        // February 2026 (for previous period / multi-month tests):
        // - Salary: +100,000
        // - Food: -40,000
        // Expected Feb: Income = 100,000, Expense = 40,000, Net = 60,000, SavingsRate = 60.0%
        {
          userId: testUserIdA,
          amount: 100000,
          type: TransactionType.INCOME,
          description: "February Salary",
          date: new Date("2026-02-05T10:00:00.000Z"),
          categoryId: salaryCatId,
          transactionHash: `test-hash-a5-${Date.now()}`,
        },
        {
          userId: testUserIdA,
          amount: 40000,
          type: TransactionType.EXPENSE,
          description: "Dinner outings & groceries",
          date: new Date("2026-02-18T14:00:00.000Z"),
          categoryId: diningCatId,
          transactionHash: `test-hash-a6-${Date.now()}`,
        },
        // User B isolation check: User B has a giant 1,000,000 transaction
        {
          userId: testUserIdB,
          amount: 1000000,
          type: TransactionType.INCOME,
          description: "User B Secret Consulting",
          date: new Date("2026-01-10T10:00:00.000Z"),
          categoryId: salaryCatId,
          transactionHash: `test-hash-b1-${Date.now()}`,
        },
      ],
    });
  });

  after(async () => {
    if (testUserIdA && testUserIdB) {
      await prisma.transaction.deleteMany({
        where: { userId: { in: [testUserIdA, testUserIdB] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUserIdA, testUserIdB] } },
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. DATE BOUNDARY RESOLUTION TESTS
  // ─────────────────────────────────────────────────────────────
  describe("1. Date Range & Boundary Resolution", () => {
    it("resolves monthly date range and previous month correctly", () => {
      const ranges = resolveDateRanges({ period: "monthly", month: 10, year: 2026, content: "summary", type: "ALL", page: 1, limit: 50 });
      assert.strictEqual(ranges.current.start.toISOString(), "2026-10-01T00:00:00.000Z");
      assert.strictEqual(ranges.current.end.toISOString(), "2026-10-31T23:59:59.999Z");
      assert.strictEqual(ranges.current.label, "October 2026");

      assert.strictEqual(ranges.previous.start.toISOString(), "2026-09-01T00:00:00.000Z");
      assert.strictEqual(ranges.previous.end.toISOString(), "2026-09-30T23:59:59.999Z");
      assert.strictEqual(ranges.previous.label, "September 2026");
    });

    it("handles January previous month rolling back to December of previous year", () => {
      const ranges = resolveDateRanges({ period: "monthly", month: 1, year: 2026, content: "summary", type: "ALL", page: 1, limit: 50 });
      assert.strictEqual(ranges.current.label, "January 2026");
      assert.strictEqual(ranges.previous.label, "December 2025");
      assert.strictEqual(ranges.previous.start.toISOString(), "2025-12-01T00:00:00.000Z");
      assert.strictEqual(ranges.previous.end.toISOString(), "2025-12-31T23:59:59.999Z");
    });

    it("resolves calendar year boundaries and previous calendar year", () => {
      const ranges = resolveDateRanges({ period: "yearly", year: 2026, content: "summary", type: "ALL", page: 1, limit: 50 });
      assert.strictEqual(ranges.current.start.toISOString(), "2026-01-01T00:00:00.000Z");
      assert.strictEqual(ranges.current.end.toISOString(), "2026-12-31T23:59:59.999Z");
      assert.strictEqual(ranges.current.label, "Calendar Year 2026");

      assert.strictEqual(ranges.previous.start.toISOString(), "2025-01-01T00:00:00.000Z");
      assert.strictEqual(ranges.previous.end.toISOString(), "2025-12-31T23:59:59.999Z");
      assert.strictEqual(ranges.previous.label, "Calendar Year 2025");
    });

    it("resolves custom date range boundaries and previous equivalent duration", () => {
      const ranges = resolveDateRanges({
        period: "custom",
        startDate: "2026-04-01",
        endDate: "2026-04-10",
        content: "summary",
        type: "ALL",
        page: 1,
        limit: 50,
      });
      assert.strictEqual(ranges.current.start.toISOString(), "2026-04-01T00:00:00.000Z");
      assert.strictEqual(ranges.current.end.toISOString(), "2026-04-10T23:59:59.999Z");
      assert.strictEqual(ranges.current.label, "2026-04-01 to 2026-04-10");
      assert.ok(ranges.previous.end < ranges.current.start);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. QUERY SCHEMA VALIDATION TESTS
  // ─────────────────────────────────────────────────────────────
  describe("2. Request Validation & Error Handling", () => {
    it("validates valid monthly and yearly query parameters", () => {
      const monthly = ReportQuerySchema.parse({ period: "monthly", month: "10", year: "2026" });
      assert.strictEqual(monthly.period, "monthly");
      assert.strictEqual(monthly.month, 10);
      assert.strictEqual(monthly.year, 2026);

      const yearly = ReportQuerySchema.parse({ period: "yearly", year: "2026" });
      assert.strictEqual(yearly.period, "yearly");
      assert.strictEqual(yearly.year, 2026);
    });

    it("rejects invalid month outside 1-12", () => {
      assert.throws(() => {
        ReportQuerySchema.parse({ period: "monthly", month: "13", year: "2026" });
      });
    });

    it("rejects custom range when startDate is missing or endDate is missing", () => {
      assert.throws(() => {
        ReportQuerySchema.parse({ period: "custom", startDate: "2026-01-01" });
      });
    });

    it("rejects custom range when startDate > endDate", () => {
      assert.throws(() => {
        ReportQuerySchema.parse({
          period: "custom",
          startDate: "2026-05-10",
          endDate: "2026-05-01",
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. TRANSFER IDENTIFICATION TESTS
  // ─────────────────────────────────────────────────────────────
  describe("3. Canonical Transfer Classification", () => {
    it("identifies internal transfer by category name", () => {
      assert.strictEqual(isInternalTransferTransaction("Internal Transfer", "Monthly deposit"), true);
      assert.strictEqual(isInternalTransferTransaction("Self Transfer", null), true);
      assert.strictEqual(isInternalTransferTransaction("Account Transfer", ""), true);
    });

    it("identifies internal transfer by description keywords", () => {
      assert.strictEqual(isInternalTransferTransaction("Miscellaneous Expense", "Self transfer to ICICI account"), true);
      assert.strictEqual(isInternalTransferTransaction(null, "Funds transfer between own accounts"), true);
    });

    it("does not classify regular expenses as internal transfers", () => {
      assert.strictEqual(isInternalTransferTransaction("Food & Dining", "Swiggy order"), false);
      assert.strictEqual(isInternalTransferTransaction("Salary", "Monthly Salary"), false);
      assert.strictEqual(isInternalTransferTransaction("Shopping", "Amazon Purchase"), false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. FINANCIAL CALCULATIONS & BUSINESS RULES
  // ─────────────────────────────────────────────────────────────
  describe("4. Canonical Financial Calculations & User Isolation", () => {
    it("excludes internal transfers from income and expenses and tracks them separately", async () => {
      const report = await reportService.generateReport(testUserIdA, {
        period: "monthly",
        month: 1,
        year: 2026,
        content: "summary",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      // Income = Salary (100,000) + Refund (5,000) = 105,000
      assert.strictEqual(report.summary.totalIncome, 105000);
      // Expense = Food (30,000). The 20,000 transfer is EXCLUDED from expenses.
      assert.strictEqual(report.summary.totalExpenses, 30000);
      // Transfer = 20,000 tracked in totalTransfers
      assert.strictEqual(report.summary.totalTransfers, 20000);
      // Net Cash Flow = 105,000 - 30,000 = 75,000
      assert.strictEqual(report.summary.netCashFlow, 75000);
      // Savings rate = (75,000 / 105,000) * 100 = 71.4%
      assert.strictEqual(report.summary.savingsRate, 71.4);
    });

    it("enforces strict user isolation — User B's transactions are not included in User A's report", async () => {
      const reportA = await reportService.generateReport(testUserIdA, {
        period: "yearly",
        year: 2026,
        content: "detailed",
        type: "ALL",
        page: 1,
        limit: 100,
      });

      // Total transactions for User A should be 6, and income should not include User B's 1,000,000
      assert.strictEqual(reportA.summary.transactionCount, 6);
      assert.ok(reportA.summary.totalIncome < 500000);
      assert.strictEqual(reportA.transactions.items.some((t) => t.amount === 1000000), false);
    });

    it("calculates annual totals from underlying transactions, not averages", async () => {
      const yearlyReport = await reportService.generateReport(testUserIdA, {
        period: "yearly",
        year: 2026,
        content: "summary",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      // Jan: Income 105,000, Expense 30,000
      // Feb: Income 100,000, Expense 40,000
      // Total Year: Income 205,000, Expense 70,000, Net 135,000
      assert.strictEqual(yearlyReport.summary.totalIncome, 205000);
      assert.strictEqual(yearlyReport.summary.totalExpenses, 70000);
      assert.strictEqual(yearlyReport.summary.netCashFlow, 135000);
      // Savings rate: (135,000 / 205,000) * 100 = 65.9%
      assert.strictEqual(yearlyReport.summary.savingsRate, 65.9);

      // Verify month-by-month trend array has 12 months with accurate values
      assert.strictEqual(yearlyReport.monthlyTrends.length, 12);
      const jan = yearlyReport.monthlyTrends[0];
      const feb = yearlyReport.monthlyTrends[1];
      assert.strictEqual(jan.income, 105000);
      assert.strictEqual(jan.expense, 30000);
      assert.strictEqual(feb.income, 100000);
      assert.strictEqual(feb.expense, 40000);
    });

    it("returns null savings rate ('N/A') and handles empty periods gracefully", async () => {
      // Month 11 2026 has zero transactions
      const emptyReport = await reportService.generateReport(testUserIdA, {
        period: "monthly",
        month: 11,
        year: 2026,
        content: "summary",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      assert.strictEqual(emptyReport.summary.totalIncome, 0);
      assert.strictEqual(emptyReport.summary.totalExpenses, 0);
      assert.strictEqual(emptyReport.summary.netCashFlow, 0);
      assert.strictEqual(emptyReport.summary.savingsRate, null);
      assert.strictEqual(emptyReport.spendingByCategory.length, 0);
      assert.strictEqual(emptyReport.transactions.items.length, 0);
    });

    it("computes previous-period comparisons accurately", async () => {
      // For Feb 2026, previous period is Jan 2026
      const reportFeb = await reportService.generateReport(testUserIdA, {
        period: "monthly",
        month: 2,
        year: 2026,
        content: "summary",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      assert.strictEqual(reportFeb.comparison.hasPreviousData, true);
      assert.strictEqual(reportFeb.comparison.previousIncome, 105000);
      assert.strictEqual(reportFeb.comparison.previousExpense, 30000);
      // Income went from 105k to 100k (-4.8%)
      assert.strictEqual(reportFeb.comparison.incomeChangePct, -4.8);
      // Expense went from 30k to 40k (+33.3%)
      assert.strictEqual(reportFeb.comparison.expenseChangePct, 33.3);
      // Net cash flow went from 75k to 60k (-15,000)
      assert.strictEqual(reportFeb.comparison.netCashFlowDiff, -15000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. CSV EXPORT TESTS
  // ─────────────────────────────────────────────────────────────
  describe("5. CSV Export Formatting & RFC 4180 Escaping", () => {
    it("escapes fields with commas, quotes, and newlines properly", () => {
      assert.strictEqual(escapeCsvField("Clean Text"), "Clean Text");
      assert.strictEqual(escapeCsvField('Item with "quotes"'), '"Item with ""quotes"""');
      assert.strictEqual(escapeCsvField("Item, with, commas"), '"Item, with, commas"');
      assert.strictEqual(escapeCsvField("Item\nwith\nnewline"), '"Item\nwith\nnewline"');
      assert.strictEqual(escapeCsvField(null), "");
      assert.strictEqual(escapeCsvField(undefined), "");
    });

    it("generates transaction CSV with UTF-8 BOM, headers, and numeric amounts", () => {
      const mockTxs = [
        {
          id: 1,
          date: "2026-01-05",
          description: "Monthly Salary, Tech Corp",
          categoryName: "Salary",
          categoryId: 1,
          type: TransactionType.INCOME,
          isInternalTransfer: false,
          amount: 100000,
          notes: null,
        },
      ];

      const csv = reportCsvService.generateTransactionsCsv(mockTxs);
      // Checks UTF-8 BOM
      assert.ok(csv.startsWith("\uFEFF"));
      // Checks headers
      assert.ok(csv.includes("Date,Description,Category,Type,Amount (INR),Notes"));
      // Checks numeric amount (no currency symbols)
      assert.ok(csv.includes("100000.00"));
      // Checks escaped description
      assert.ok(csv.includes('"Monthly Salary, Tech Corp"'));
    });

    it("generates detailed multi-section CSV report with summary and ledger", async () => {
      const report = await reportService.generateReport(testUserIdA, {
        period: "monthly",
        month: 1,
        year: 2026,
        content: "detailed",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      const csv = reportCsvService.generateDetailedCsv(report, report.transactions.items);
      assert.ok(csv.startsWith("\uFEFF"));
      assert.ok(csv.includes("FinSight Financial Performance Report"));
      assert.ok(csv.includes("EXECUTIVE SUMMARY METRIC"));
      assert.ok(csv.includes("Total Income,105000.00"));
      assert.ok(csv.includes("Total Expenses,30000.00"));
      assert.ok(csv.includes("SPENDING BY CATEGORY"));
      assert.ok(csv.includes("Food & Dining,30000.00"));
      assert.ok(csv.includes("TRANSACTION LEDGER"));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. PDF EXPORT GENERATION TESTS
  // ─────────────────────────────────────────────────────────────
  describe("6. PDF Generation & Multi-Page Capability", () => {
    it("generates a valid, readable PDF buffer starting with %PDF- header", async () => {
      const report = await reportService.generateReport(testUserIdA, {
        period: "yearly",
        year: 2026,
        content: "detailed",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      const pdfBuffer = await reportPdfService.generatePdf(
        report,
        "detailed",
        report.transactions.items
      );

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 500);
      const pdfHeader = pdfBuffer.slice(0, 5).toString("ascii");
      assert.strictEqual(pdfHeader, "%PDF-");
    });

    it("generates long transaction ledger across multiple pages without crashing", async () => {
      const report = await reportService.generateReport(testUserIdA, {
        period: "monthly",
        month: 1,
        year: 2026,
        content: "transactions",
        type: "ALL",
        page: 1,
        limit: 50,
      });

      // Create 80 mock transactions to test multi-page table pagination
      const manyTxs = Array.from({ length: 80 }).map((_, i) => ({
        id: i + 1,
        date: "2026-01-15",
        description: `Grocery purchase item number ${i + 1}`,
        categoryName: "Food & Dining",
        categoryId: diningCatId,
        type: TransactionType.EXPENSE,
        isInternalTransfer: false,
        amount: 250 + i * 10,
        notes: null,
      }));

      const pdfBuffer = await reportPdfService.generatePdf(report, "transactions", manyTxs);
      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 3000);
      assert.strictEqual(pdfBuffer.slice(0, 5).toString("ascii"), "%PDF-");
    });
  });
});
