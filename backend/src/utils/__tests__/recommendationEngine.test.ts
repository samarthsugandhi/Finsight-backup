import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { recommendationService } from "@/services/recommendation.service";
import { QuestionnaireInput } from "@/validators/recommendation.validator";

describe("FinSight — Recommendation & Risk Assessment Engine Tests", () => {
  // ── 1. Amount Distribution & Exact Rupee Precision ──
  describe("Amount Distribution Precision", () => {
    it("ensures allocated amounts sum to exactly the entered amount for standard inputs", () => {
      const amounts = [5000, 10000, 25000, 50000, 100000];
      const profiles: Array<"LOW" | "MODERATE" | "HIGH"> = ["LOW", "MODERATE", "HIGH"];

      for (const amount of amounts) {
        for (const profile of profiles) {
          const result = recommendationService.evaluate(
            {
              goal: "WEALTH_CREATION",
              horizon: "3_TO_5_YEARS",
              reactionToDrop: "WAIT",
              monthlyInvestable: 5000,
              emergencySavings: "YES",
              highInterestDebt: false,
              experience: "INTERMEDIATE",
              selectedRiskLevel: profile,
            },
            amount
          );

          // 1. Percentages sum to 100%
          const totalPct = result.allocations.reduce((sum, a) => sum + a.percentage, 0);
          assert.equal(totalPct, 100, `Profile ${profile} percentages should total 100%`);

          // 2. Rupee amounts sum exactly to entered amount
          const totalAllocated = result.allocations.reduce((sum, a) => sum + a.amount, 0);
          assert.equal(
            totalAllocated,
            amount,
            `Rupee sum (${totalAllocated}) must equal entered amount (${amount}) for ${profile}`
          );
        }
      }
    });

    it("handles odd and irregular amounts with exact precision (no rupee loss)", () => {
      const oddAmounts = [12345, 99999, 1, 7777, 333333];

      for (const amount of oddAmounts) {
        const result = recommendationService.evaluate(
          {
            goal: "WEALTH_CREATION",
            horizon: "MORE_THAN_5_YEARS",
            reactionToDrop: "BUY_MORE",
            monthlyInvestable: 10000,
            emergencySavings: "YES",
            highInterestDebt: false,
            experience: "EXPERIENCED",
            selectedRiskLevel: "HIGH",
          },
          amount
        );

        const sum = result.allocations.reduce((acc, a) => acc + a.amount, 0);
        assert.equal(sum, amount, `Irregular amount ₹${amount} must equal sum ₹${sum}`);
      }
    });

    it("handles zero or negative amounts gracefully", () => {
      const result = recommendationService.evaluate(
        {
          goal: "RETIREMENT",
          horizon: "MORE_THAN_5_YEARS",
          reactionToDrop: "WAIT",
          monthlyInvestable: 0,
          emergencySavings: "YES",
          highInterestDebt: false,
          experience: "BEGINNER",
          selectedRiskLevel: "MODERATE",
        },
        0
      );

      for (const a of result.allocations) {
        assert.equal(a.amount, 0);
      }
    });
  });

  // ── 2. Risk Profiles & Scoring ──
  describe("Risk Assessment & Scoring", () => {
    it("correctly identifies a Low Risk profile for conservative answers", () => {
      const answers: QuestionnaireInput = {
        goal: "MAJOR_PURCHASE",
        horizon: "1_TO_3_YEARS",
        reactionToDrop: "SELL_ALL",
        monthlyInvestable: 5000,
        emergencySavings: "PARTIALLY",
        highInterestDebt: false,
        experience: "BEGINNER",
        selectedRiskLevel: "LOW",
      };

      const result = recommendationService.evaluate(answers);
      assert.equal(result.computedRiskProfile, "LOW");
      assert.equal(result.riskTolerance, "CONSERVATIVE");
      assert.ok(result.computedRiskScore < 50);
      assert.ok(result.allocations.some((a) => a.category === "FIXED_DEPOSIT" && a.percentage >= 50));
    });

    it("correctly identifies a High Risk profile for long horizon, high capacity, aggressive tolerance", () => {
      const answers: QuestionnaireInput = {
        goal: "WEALTH_CREATION",
        horizon: "MORE_THAN_5_YEARS",
        reactionToDrop: "BUY_MORE",
        monthlyInvestable: 25000,
        emergencySavings: "YES",
        highInterestDebt: false,
        experience: "EXPERIENCED",
        selectedRiskLevel: "HIGH",
      };

      const result = recommendationService.evaluate(answers);
      assert.equal(result.computedRiskProfile, "HIGH");
      assert.equal(result.riskTolerance, "AGGRESSIVE");
      assert.equal(result.riskCapacity, "HIGH");
      assert.ok(result.computedRiskScore >= 70);
    });

    it("correctly identifies a Moderate Risk profile for balanced inputs", () => {
      const answers: QuestionnaireInput = {
        goal: "WEALTH_CREATION",
        horizon: "3_TO_5_YEARS",
        reactionToDrop: "WAIT",
        monthlyInvestable: 15000,
        emergencySavings: "YES",
        highInterestDebt: false,
        experience: "INTERMEDIATE",
        selectedRiskLevel: "MODERATE",
      };

      const result = recommendationService.evaluate(answers);
      assert.equal(result.computedRiskProfile, "MODERATE");
      assert.equal(result.riskTolerance, "MODERATE");
    });
  });

  // ── 3. Conflict & Safety Constraint Detection ──
  describe("Financial Capacity Constraints & Conflict Detection", () => {
    it("detects conflict and warns when user selects High Risk but carries high-interest debt", () => {
      const answers: QuestionnaireInput = {
        goal: "WEALTH_CREATION",
        horizon: "MORE_THAN_5_YEARS",
        reactionToDrop: "BUY_MORE",
        monthlyInvestable: 10000,
        emergencySavings: "YES",
        highInterestDebt: true, // High interest debt!
        experience: "EXPERIENCED",
        selectedRiskLevel: "HIGH",
      };

      const result = recommendationService.evaluate(answers);
      assert.equal(result.hasConflict, true, "Should flag conflict");
      assert.ok(result.conflictReason?.includes("high-interest debt"));
      assert.ok(result.priorityAlert?.includes("High-interest debt"));
      // Capacity must be LOW and profile capped
      assert.equal(result.riskCapacity, "LOW");
      assert.equal(result.computedRiskProfile, "LOW");
    });

    it("detects conflict when user selects High Risk but has no emergency savings", () => {
      const answers: QuestionnaireInput = {
        goal: "WEALTH_CREATION",
        horizon: "MORE_THAN_5_YEARS",
        reactionToDrop: "BUY_MORE",
        monthlyInvestable: 10000,
        emergencySavings: "NO", // No emergency savings!
        highInterestDebt: false,
        experience: "EXPERIENCED",
        selectedRiskLevel: "HIGH",
      };

      const result = recommendationService.evaluate(answers);
      assert.equal(result.hasConflict, true, "Should flag conflict");
      assert.ok(result.priorityAlert?.includes("emergency"));
      assert.equal(result.computedRiskProfile, "LOW");
    });

    it("caps recommended profile at Low when investment horizon is less than 1 year", () => {
      const answers: QuestionnaireInput = {
        goal: "MAJOR_PURCHASE",
        horizon: "LESS_THAN_1_YEAR", // Horizon too short for equities
        reactionToDrop: "BUY_MORE",
        monthlyInvestable: 20000,
        emergencySavings: "YES",
        highInterestDebt: false,
        experience: "EXPERIENCED",
        selectedRiskLevel: "HIGH",
      };

      const result = recommendationService.evaluate(answers);
      assert.equal(result.hasConflict, true);
      assert.equal(result.computedRiskProfile, "LOW");
      assert.ok(result.conflictReason?.includes("under 1 year is too short"));
    });

    it("caps recommended profile at Low when saving for major purchase in 1-3 years", () => {
      const answers: QuestionnaireInput = {
        goal: "MAJOR_PURCHASE",
        horizon: "1_TO_3_YEARS",
        reactionToDrop: "WAIT",
        monthlyInvestable: 15000,
        emergencySavings: "YES",
        highInterestDebt: false,
        experience: "INTERMEDIATE",
        selectedRiskLevel: "MODERATE",
      };

      const result = recommendationService.evaluate(answers);
      assert.equal(result.computedRiskProfile, "LOW");
      assert.equal(result.hasConflict, true);
      assert.ok(result.conflictReason?.includes("near-term purchase"));
    });
  });

  // ── 4. Transparency & Disclaimers ──
  describe("Transparency & Regulatory Compliance", () => {
    it("includes a clear educational disclaimer on all recommendations", () => {
      const result = recommendationService.evaluate({
        goal: "WEALTH_CREATION",
        horizon: "3_TO_5_YEARS",
        reactionToDrop: "WAIT",
        monthlyInvestable: 10000,
        emergencySavings: "YES",
        highInterestDebt: false,
        experience: "INTERMEDIATE",
        selectedRiskLevel: "MODERATE",
      });

      assert.ok(result.disclaimer.length > 20);
      assert.ok(result.disclaimer.includes("educational"));
      assert.ok(result.disclaimer.includes("Returns are not guaranteed") || result.disclaimer.includes("returns are not guaranteed"));
    });

    it("includes rationales and risk disclosures for every suggested category", () => {
      const result = recommendationService.evaluate({
        goal: "RETIREMENT",
        horizon: "MORE_THAN_5_YEARS",
        reactionToDrop: "WAIT",
        monthlyInvestable: 10000,
        emergencySavings: "YES",
        highInterestDebt: false,
        experience: "INTERMEDIATE",
        selectedRiskLevel: "MODERATE",
      });

      for (const a of result.allocations) {
        assert.ok(a.rationale && a.rationale.length > 10, `Category ${a.category} must have a rationale`);
        assert.ok(a.risks && a.risks.length > 10, `Category ${a.category} must disclose key risks`);
      }
    });
  });

  // ── 5. Simplified 3-Input Investment Planner Options ──
  describe("Simplified Investment Planner Options Engine", () => {
    it("generates 3 to 4 suitable options for standard inputs", () => {
      const res = recommendationService.generateInvestmentOptions("MODERATE", 50000, "3_TO_5_YEARS");
      assert.ok(res.options.length >= 3 && res.options.length <= 4, "Must generate 3-4 options");
      assert.equal(res.amount, 50000);
      assert.equal(res.riskLevel, "MODERATE");
      assert.equal(res.duration, "3_TO_5_YEARS");

      for (const opt of res.options) {
        assert.ok(opt.name && opt.name.length > 3);
        assert.ok(opt.category);
        assert.ok(opt.riskLevel);
        assert.ok(opt.duration);
        assert.ok(opt.suggestedAmount > 0);
        assert.ok(opt.illustrativeScenario.rateOrRange);
        assert.ok(opt.illustrativeScenario.scenarioText.includes("₹"));
        assert.ok(opt.illustrativeScenario.assumptionSource);
        assert.ok(opt.downsideScenario && opt.downsideScenario.length > 10);
        assert.ok(opt.benefits.length >= 2);
        assert.ok(opt.risks.length >= 1);
        assert.ok(opt.liquidity && opt.liquidity.length > 5);
        assert.ok(opt.whySuited && opt.whySuited.length > 10);
      }
    });

    it("enforces suitability safeguard: does not recommend volatile stocks for duration < 1 year even if High Risk is selected", () => {
      const res = recommendationService.generateInvestmentOptions("HIGH", 100000, "LESS_THAN_1_YEAR");
      assert.ok(res.suitabilityWarning, "Must display short-term suitability warning");
      assert.ok(res.suitabilityWarning.includes("under 1 year"));

      // Options must not contain direct stocks
      const hasDirectStocks = res.options.some((o) => o.category === "Stocks");
      assert.equal(hasDirectStocks, false, "Direct stocks must not be recommended for < 1 year duration");

      // Must prioritize safe capital preservation
      const hasFdOrLiquid = res.options.some((o) => o.category === "Fixed Deposit" || o.category === "Debt Securities");
      assert.equal(hasFdOrLiquid, true, "Must include Fixed Deposit or Debt securities for < 1 year");
    });

    it("displays suitability guidance for 1-3 years with High Risk", () => {
      const res = recommendationService.generateInvestmentOptions("HIGH", 75000, "1_TO_3_YEARS");
      assert.ok(res.suitabilityWarning, "Must display suitability guidance for 1-3 years with High Risk");
      assert.ok(res.options.length >= 3);
    });

    it("includes transparent regulatory disclaimers without guaranteed profit claims", () => {
      const res = recommendationService.generateInvestmentOptions("LOW", 25000, "MORE_THAN_5_YEARS");
      assert.ok(res.disclaimer.includes("educational"));
      assert.ok(res.disclaimer.includes("not guaranteed") || res.disclaimer.includes("Not guaranteed") || res.disclaimer.includes("risk"));

      for (const opt of res.options) {
        // Must clearly mark illustrative scenarios
        assert.ok(
          opt.illustrativeScenario.scenarioText.toLowerCase().includes("illustrative") ||
          opt.illustrativeScenario.assumptionSource.toLowerCase().includes("not a guarantee") ||
          opt.illustrativeScenario.assumptionSource.toLowerCase().includes("rates") ||
          opt.illustrativeScenario.assumptionSource.toLowerCase().includes("historical")
        );
      }
    });
  });
});

