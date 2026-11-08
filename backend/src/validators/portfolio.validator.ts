import { z } from "zod";

export const addHoldingSchema = z.object({
  body: z.discriminatedUnion("type", [
    // Stocks & Mutual Funds (only supported tradeable types)
    z.object({
      type: z.enum(["STOCK", "MUTUAL_FUND"]),
      name: z.string().trim().min(1, "Asset name is required"),
      symbol: z.string().trim().optional().nullable(),
      subType: z.string().trim().optional().nullable(),
      quantity: z.number().positive("Quantity must be positive"),
      averageBuyPrice: z.number().positive("Average buy price must be positive"),
      purchaseDate: z.string().optional().nullable(),
      manualCurrentValue: z.number().nonnegative().optional().nullable(),
      manualPrice: z.number().nonnegative().optional().nullable(),
      notes: z.string().trim().optional().nullable(),
      source: z.string().trim().optional().nullable(),
    }),
    // Gold — Manual Only
    z.object({
      type: z.literal("GOLD"),
      name: z.string().trim().min(1, "Name/Description is required"),
      subType: z.enum(["PHYSICAL_GOLD", "DIGITAL_GOLD", "GOLD_ETF", "SGB", "OTHER"]).default("PHYSICAL_GOLD"),
      symbol: z.string().trim().optional().nullable(),
      quantity: z.number().positive("Quantity (grams or units) must be positive"),
      purchaseValue: z.number().positive("Purchase value must be positive").optional(),
      averageBuyPrice: z.number().positive().optional(),
      purchaseDate: z.string().optional().nullable(),
      currentValue: z.number().nonnegative().optional().nullable(),
      manualCurrentValue: z.number().nonnegative().optional().nullable(),
      purity: z.enum(["PURITY_24K", "PURITY_22K", "PURITY_18K", "OTHER"]).optional().nullable(),
      notes: z.string().trim().optional().nullable(),
      source: z.string().trim().optional().nullable(),
    }),
    // Fixed Deposit — Manual Only
    z.object({
      type: z.literal("FIXED_DEPOSIT"),
      name: z.string().trim().min(1, "Bank or institution name is required"),
      principal: z.number().positive("Principal amount must be positive"),
      interestRate: z.number().min(0).max(100).optional(),
      startDate: z.string().optional().nullable(),
      maturityDate: z.string().optional().nullable(),
      maturityAmount: z.number().positive().optional().nullable(),
      notes: z.string().trim().optional().nullable(),
      source: z.string().trim().optional().nullable(),
    }),
  ]),
});

export type AddHoldingInput = z.infer<typeof addHoldingSchema>["body"];

export const addTransactionSchema = z.object({
  body: z.object({
    side: z.enum(["BUY", "SELL"]),
    quantity: z.number().positive(),
    price: z.number().positive(),
    date: z.string().optional(),
  }),
});

export type AddTransactionInput = z.infer<typeof addTransactionSchema>["body"];

export const updateManualPriceSchema = z.object({
  body: z.object({
    price: z.number().positive(),
    currentValue: z.number().nonnegative().optional(),
  }),
});

export const updateHoldingSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    symbol: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    principal: z.number().positive().optional(),
    interestRate: z.number().min(0).max(100).optional(),
    startDate: z.string().optional().nullable(),
    maturityDate: z.string().optional().nullable(),
    maturityAmount: z.number().positive().optional().nullable(),
    manualCurrentValue: z.number().nonnegative().optional().nullable(),
    manualPrice: z.number().nonnegative().optional().nullable(),
  }),
});

export type UpdateHoldingInput = z.infer<typeof updateHoldingSchema>["body"];

export const setAllocationTargetsSchema = z.object({
  body: z.object({
    targets: z.array(
      z.object({
        holdingType: z.enum(["STOCK", "MUTUAL_FUND", "GOLD", "FIXED_DEPOSIT"]),
        targetPct: z.number().min(0).max(100),
      })
    ).refine(
      (items) => {
        const sum = items.reduce((acc, curr) => acc + curr.targetPct, 0);
        return sum <= 100.001;
      },
      { message: "Allocation targets must sum to at most 100%" }
    ),
  }),
});

export type SetAllocationTargetsInput = z.infer<typeof setAllocationTargetsSchema>["body"];

export const getRealizedGainsSchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
});

export const fdCalculatorSchema = z.object({
  body: z.object({
    depositAmount: z
      .number()
      .min(100, "Deposit amount must be at least ₹100.")
      .max(1000000000, "Deposit amount exceeds allowable maximum.")
      .refine(
        (val) => {
          const parts = val.toString().split(".");
          return parts.length <= 1 || parts[1].length <= 2;
        },
        { message: "Deposit amount cannot have more than 2 decimal places." }
      ),
    interestRate: z
      .number()
      .gt(0, "Interest rate must be greater than 0%.")
      .max(30, "Interest rate cannot exceed 30%.")
      .refine(
        (val) => {
          const parts = val.toString().split(".");
          return parts.length <= 1 || parts[1].length <= 2;
        },
        { message: "Interest rate cannot have more than 2 decimal places." }
      ),
    years: z.number().int("Years must be a valid integer.").min(0, "Years must be a non-negative whole number."),
    months: z.number().int("Months must be a valid integer.").min(0, "Months must be a non-negative whole number."),
    compoundingFrequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const),
  }).refine((data) => data.years * 12 + data.months >= 1, {
    message: "Minimum deposit duration is 1 month.",
    path: ["months"],
  }).refine((data) => data.years * 12 + data.months <= 120, {
    message: "Maximum deposit duration is 10 years (120 months).",
    path: ["years"],
  }),
});

export type FDCalculatorSchemaInput = z.infer<typeof fdCalculatorSchema>["body"];
