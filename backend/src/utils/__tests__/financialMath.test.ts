import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateEMI,
  calculateSIP,
  assessAffordability,
  detectAndCalculateMath,
} from "../financialMath";

describe("FinSight — Financial Math & Calculations Engine Test Suite", () => {
  describe("Loan EMI Calculations", () => {
    it("calculates exact EMI for ₹10,00,000 @ 8.5% for 5 years (60 months)", () => {
      // Standard formula: P = 1,000,000, r = 0.085 / 12, n = 60
      // EMI = 1000000 * (0.085/12) * (1 + 0.085/12)^60 / ((1 + 0.085/12)^60 - 1) = 20,516.53
      const res = calculateEMI(1000000, 8.5, 60);

      assert.equal(res.principal, 1000000);
      assert.equal(res.annualRatePct, 8.5);
      assert.equal(res.tenureMonths, 60);
      assert.equal(res.monthlyEMI, 20516.53);
      assert.equal(res.totalPayable, 1230991.80);
      assert.equal(res.totalInterest, 230991.80);
      assert.equal(Math.round(res.principalPct + res.interestPct), 100);
    });

    it("handles 0% interest loan accurately (e.g. No-Cost EMI)", () => {
      const res = calculateEMI(60000, 0, 6);
      assert.equal(res.monthlyEMI, 10000);
      assert.equal(res.totalInterest, 0);
      assert.equal(res.totalPayable, 60000);
    });

    it("handles zero principal gracefully", () => {
      const res = calculateEMI(0, 10, 12);
      assert.equal(res.monthlyEMI, 0);
      assert.equal(res.totalPayable, 0);
    });
  });

  describe("SIP Future Value & Wealth Accumulation", () => {
    it("calculates monthly SIP of ₹5,000 @ 12% for 10 years", () => {
      // M = 5000 * ((1 + 0.01)^120 - 1) / 0.01 * 1.01 = 11,61,695
      const res = calculateSIP(5000, 12, 10);

      assert.equal(res.totalInvested, 600000);
      assert.equal(res.futureValue, 1161695);
      assert.equal(res.estimatedReturns, 561695);
    });

    it("handles zero return rate (just savings accumulation)", () => {
      const res = calculateSIP(2000, 0, 5);
      assert.equal(res.totalInvested, 120000);
      assert.equal(res.futureValue, 120000);
      assert.equal(res.estimatedReturns, 0);
    });
  });

  describe("Affordability Assessment", () => {
    it("identifies purchase as affordable when monthly surplus comfortably covers it", () => {
      const res = assessAffordability({
        purchaseAmount: 20000,
        userMonthlyIncome: 80000,
        userMonthlyExpense: 45000,
        userAvailableSavings: 150000,
        itemDescription: "smartphone",
      });

      assert.equal(res.isAffordable, true);
      assert.equal(res.verdict, "AFFORDABLE");
      assert.equal(res.monthlySurplus, 35000);
    });

    it("flags vehicle as unaffordable when estimated EMI exceeds monthly cash flow surplus", () => {
      const res = assessAffordability({
        purchaseAmount: 1500000,
        isLoanFinanced: true,
        userMonthlyIncome: 50000,
        userMonthlyExpense: 45000, // surplus only 5,000
        userAvailableSavings: 50000,
        itemDescription: "car",
      });

      assert.equal(res.isAffordable, false);
      assert.equal(res.verdict, "NOT_RECOMMENDED");
      assert.ok(res.estimatedEMI! > 5000);
    });

    it("flags INSUFFICIENT_DATA when user has no recorded income in FinSight", () => {
      const res = assessAffordability({
        purchaseAmount: 500000,
        userMonthlyIncome: 0,
        userMonthlyExpense: 0,
        itemDescription: "car",
      });

      assert.equal(res.verdict, "INSUFFICIENT_DATA");
      assert.ok(res.recommendation.includes("record an Income"));
    });
  });

  describe("Natural Language Math Query Detection", () => {
    it("detects car affordability query and injects deterministic calculation", () => {
      const out = detectAndCalculateMath("Can I afford a 15 lakh car?", 100000, 50000, 200000);
      assert.ok(out !== null);
      assert.ok(out.includes("Vehicle Affordability Check"));
      assert.ok(out.includes("15,00,000"));
      assert.ok(out.includes("Estimated 5-Year Loan EMI"));
    });

    it("detects loan EMI query and produces exact calculations", () => {
      const out = detectAndCalculateMath("What is the EMI for 10 lakh loan at 8.5% for 5 years?", 100000, 50000, 200000);
      assert.ok(out !== null);
      assert.ok(out.includes("Loan EMI Breakdown"));
      assert.ok(out.includes("20,516.53"));
    });

    it("returns null for non-mathematical general education questions", () => {
      const out = detectAndCalculateMath("What is the difference between equity and debt?", 100000, 50000, 200000);
      assert.equal(out, null);
    });
  });
});

