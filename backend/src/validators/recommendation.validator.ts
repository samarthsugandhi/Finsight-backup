import { z } from "zod";

export const riskLevelEnum = z.enum(["LOW", "MODERATE", "HIGH"]);
export const goalEnum = z.enum([
  "WEALTH_CREATION",
  "MAJOR_PURCHASE",
  "RETIREMENT",
  "EDUCATION",
  "OTHER",
]);
export const horizonEnum = z.enum([
  "LESS_THAN_1_YEAR",
  "1_TO_3_YEARS",
  "3_TO_5_YEARS",
  "MORE_THAN_5_YEARS",
]);
export const reactionToDropEnum = z.enum(["SELL_ALL", "WAIT", "BUY_MORE"]);
export const emergencySavingsEnum = z.enum(["YES", "NO", "PARTIALLY"]);
export const experienceEnum = z.enum(["BEGINNER", "INTERMEDIATE", "EXPERIENCED"]);

export const questionnaireSchema = z.object({
  goal: goalEnum,
  horizon: horizonEnum,
  reactionToDrop: reactionToDropEnum,
  monthlyInvestable: z.number().nonnegative(),
  emergencySavings: emergencySavingsEnum,
  highInterestDebt: z.boolean(),
  experience: experienceEnum,
  selectedRiskLevel: riskLevelEnum.optional(),
  investmentAmount: z.number().positive().optional(),
});

export const calculateRecommendationSchema = z.object({
  body: z.object({
    questionnaire: questionnaireSchema,
    investmentAmount: z.number().positive().optional(),
    customRiskLevel: riskLevelEnum.optional(),
  }),
});

export const investmentOptionsSchema = z.object({
  body: z.object({
    riskLevel: riskLevelEnum,
    amount: z.number().positive(),
    duration: horizonEnum,
  }),
});

export type InvestmentOptionsInput = z.infer<typeof investmentOptionsSchema>["body"];

export const saveRecommendationSchema = z.object({
  body: z.object({
    selectedRiskLevel: riskLevelEnum,
    computedRiskScore: z.number().min(0).max(100),
    computedRiskProfile: riskLevelEnum,
    riskTolerance: z.string(),
    riskCapacity: z.string(),
    investmentHorizon: horizonEnum,
    monthlyInvestableAmount: z.number().nonnegative().optional().nullable(),
    hasEmergencySavings: emergencySavingsEnum,
    hasHighInterestDebt: z.boolean(),
    experienceLevel: experienceEnum,
    answers: z.record(z.string(), z.any()),
    plannedInvestmentAmount: z.number().positive().optional().nullable(),
    allocations: z.array(
      z.object({
        category: z.string(),
        name: z.string(),
        percentage: z.number().min(0).max(100),
        amount: z.number().nonnegative(),
        rationale: z.string().optional(),
        risks: z.string().optional(),
      })
    ).refine(
      (items) => {
        const sum = items.reduce((acc, curr) => acc + curr.percentage, 0);
        return Math.abs(sum - 100) < 0.05;
      },
      { message: "Total allocation percentage must equal exactly 100%" }
    ),
    syncToPortfolioTargets: z.boolean().optional(),
    notes: z.string().optional().nullable(),
  }),
});

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
export type CalculateRecommendationInput = z.infer<typeof calculateRecommendationSchema>["body"];
export type SaveRecommendationInput = z.infer<typeof saveRecommendationSchema>["body"];
