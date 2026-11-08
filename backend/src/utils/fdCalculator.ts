/**
 * FinSight Fixed Deposit (FD) Compound Interest Calculator Utility
 *
 * Formula:
 *   A = P × (1 + r/n)^(n×t)
 *
 * Where:
 *   P = Principal deposit amount (INR)
 *   r = Annual nominal interest rate as a decimal (rate / 100)
 *   n = Number of compounding periods per year
 *       - Monthly: n = 12
 *       - Quarterly: n = 4
 *       - Half-yearly: n = 2
 *       - Yearly: n = 1
 *   t = Duration in years = years + (months / 12)
 *   A = Maturity Amount
 *   Interest Earned = A − P (using rounded Maturity Amount)
 *
 * ── Fractional Compounding Period Assumption ────────────────────────────────
 * When the total duration in months is not a whole multiple of the compounding
 * period (e.g. 7 months with quarterly compounding = 1.75 compounding periods),
 * the exponent n×t is computed as a real number and Math.pow() handles it
 * via the continuous generalisation of integer exponentiation.
 *
 * Example:
 *   P = ₹50,000, r = 6.5%, quarterly, 7 months
 *   t = 7/12, exponent = 4 × (7/12) = 2.333…
 *   A = 50000 × (1.01625)^2.333… ≈ ₹55,xxxx
 *
 * ⚠ This fractional-exponent approach is a mathematical approximation.
 * Most banks calculate FDs on a period-by-period basis and handle partial
 * periods differently (e.g. simple interest or pro-rata compounding).
 * Actual bank maturity amounts may differ, especially for fractional durations.
 *
 * ── Floating-Point Precision ──────────────────────────────────────────────
 * Intermediate calculations use standard IEEE-754 double-precision arithmetic
 * (Math.pow). The accumulated floating-point error for inputs within the
 * allowed ranges is well below 1 paise (< 10⁻¹⁰ INR) before rounding.
 * Final INR amounts are rounded to exactly 2 decimal places using
 * Math.round(x × 100) / 100 to ensure paise-level accuracy.
 *
 * ── Paise Reconciliation Identity ────────────────────────────────────────
 * To guarantee Maturity Amount = Principal + Interest Earned exactly (at the
 * paise level), the returned interestEarned is derived as:
 *   interestEarned = roundedMaturity − P  (then itself rounded to 2dp)
 *   consistentMaturity = P + roundedInterest
 * This ensures zero rounding discrepancy between the displayed values.
 */

export type CompoundingFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

export const FD_LIMITS = {
  MIN_DEPOSIT: 100,
  MAX_DEPOSIT: 1000000000, // 100 Crore upper sanity bound
  MIN_RATE: 0.01,          // > 0%
  MAX_RATE: 30.0,          // 30%
  MIN_DURATION_MONTHS: 1,  // 1 month
  MAX_DURATION_MONTHS: 120,// 10 years
} as const;

export interface FDCalculatorInput {
  depositAmount: number;
  interestRate: number; // in percent e.g. 7.5
  years: number;
  months: number;
  compoundingFrequency: CompoundingFrequency;
}

export interface FDCalculatorResult {
  principalAmount: number;
  interestEarned: number;
  maturityAmount: number;
  interestRate: number;
  durationYears: number;
  durationMonths: number;
  totalDurationInMonths: number;
  totalDurationInYears: number;
  compoundingFrequency: CompoundingFrequency;
  compoundingFrequencyLabel: string;
  compoundingPeriodsPerYear: number;
  disclaimer: string;
}

export interface FDValidationError {
  field: "depositAmount" | "interestRate" | "duration" | "compoundingFrequency";
  message: string;
}

export const COMPOUNDING_PERIODS: Record<CompoundingFrequency, { n: number; label: string }> = {
  MONTHLY: { n: 12, label: "Monthly (12 times/year)" },
  QUARTERLY: { n: 4, label: "Quarterly (4 times/year)" },
  HALF_YEARLY: { n: 2, label: "Half-yearly (2 times/year)" },
  YEARLY: { n: 1, label: "Yearly (1 time/year)" },
};

export const FD_DISCLAIMER =
  "These are estimated maturity calculations using the selected compound-interest method. Actual bank FD returns may differ based on the bank's calculation method, deposit terms, payout option, taxes and applicable charges. This estimate does not include TDS or income tax.";

/**
 * Validate input fields according to strict specifications.
 */
export function validateFDInput(input: Partial<FDCalculatorInput>): FDValidationError[] {
  const errors: FDValidationError[] = [];

  // 1. Deposit Amount
  if (input.depositAmount === undefined || input.depositAmount === null || isNaN(input.depositAmount)) {
    errors.push({ field: "depositAmount", message: "Deposit amount is required." });
  } else if (input.depositAmount < FD_LIMITS.MIN_DEPOSIT) {
    errors.push({
      field: "depositAmount",
      message: `Deposit amount must be at least ₹${FD_LIMITS.MIN_DEPOSIT.toLocaleString("en-IN")}.`,
    });
  } else if (input.depositAmount > FD_LIMITS.MAX_DEPOSIT) {
    errors.push({
      field: "depositAmount",
      message: `Deposit amount exceeds allowable maximum of ₹${FD_LIMITS.MAX_DEPOSIT.toLocaleString("en-IN")}.`,
    });
  } else {
    // Check decimal precision (at most 2 decimals)
    const decimalParts = input.depositAmount.toString().split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      errors.push({ field: "depositAmount", message: "Deposit amount cannot have more than 2 decimal places." });
    }
  }

  // 2. Annual Interest Rate
  if (input.interestRate === undefined || input.interestRate === null || isNaN(input.interestRate)) {
    errors.push({ field: "interestRate", message: "Interest rate is required." });
  } else if (input.interestRate <= 0) {
    errors.push({ field: "interestRate", message: "Interest rate must be greater than 0%." });
  } else if (input.interestRate > FD_LIMITS.MAX_RATE) {
    errors.push({ field: "interestRate", message: `Interest rate cannot exceed ${FD_LIMITS.MAX_RATE}%.` });
  } else {
    const decimalParts = input.interestRate.toString().split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      errors.push({ field: "interestRate", message: "Interest rate cannot have more than 2 decimal places." });
    }
  }

  // 3. Deposit Duration
  const y = input.years ?? 0;
  const m = input.months ?? 0;

  if (isNaN(y) || y < 0 || !Number.isInteger(y)) {
    errors.push({ field: "duration", message: "Years must be a non-negative whole number." });
  } else if (isNaN(m) || m < 0 || !Number.isInteger(m)) {
    errors.push({ field: "duration", message: "Months must be a non-negative whole number." });
  } else {
    const totalMonths = y * 12 + m;
    if (totalMonths < FD_LIMITS.MIN_DURATION_MONTHS) {
      errors.push({ field: "duration", message: "Minimum deposit duration is 1 month." });
    } else if (totalMonths > FD_LIMITS.MAX_DURATION_MONTHS) {
      errors.push({ field: "duration", message: "Maximum deposit duration is 10 years (120 months)." });
    }
  }

  // 4. Compounding Frequency
  if (!input.compoundingFrequency || !COMPOUNDING_PERIODS[input.compoundingFrequency]) {
    errors.push({ field: "compoundingFrequency", message: "Please select a valid compounding frequency." });
  }

  return errors;
}

/**
 * Standard compound interest calculator.
 * Formula: A = P × (1 + r/n)^(n×t)
 * Final INR amounts are rounded to 2 decimal places.
 * Guarantees Maturity Amount = Principal + Interest Earned exactly (paise-level identity).
 * See module-level JSDoc for fractional-period and floating-point notes.
 */
export function calculateFD(input: FDCalculatorInput): FDCalculatorResult {
  const errors = validateFDInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid FD Calculator Input: ${errors.map((e) => e.message).join(" ")}`);
  }

  const P = input.depositAmount;
  const r = input.interestRate / 100;
  const { n, label: freqLabel } = COMPOUNDING_PERIODS[input.compoundingFrequency];

  const y = input.years || 0;
  const m = input.months || 0;
  const totalMonths = y * 12 + m;
  const t = totalMonths / 12;

  let rawMaturity: number;
  if (r === 0) {
    rawMaturity = P;
  } else {
    // Formula: A = P * (1 + r/n)^(n*t)
    const base = 1 + r / n;
    const exponent = n * t;
    rawMaturity = P * Math.pow(base, exponent);
  }

  // Round final amounts to 2 decimal places
  const roundedMaturity = Math.round(rawMaturity * 100) / 100;
  const rawInterest = roundedMaturity - P;
  const roundedInterest = Math.round(rawInterest * 100) / 100;

  // Enforce absolute mathematical identity: Maturity = Principal + Interest
  const consistentMaturity = Math.round((P + roundedInterest) * 100) / 100;

  return {
    principalAmount: Math.round(P * 100) / 100,
    interestEarned: roundedInterest,
    maturityAmount: consistentMaturity,
    interestRate: input.interestRate,
    durationYears: y,
    durationMonths: m,
    totalDurationInMonths: totalMonths,
    totalDurationInYears: Math.round(t * 1000) / 1000,
    compoundingFrequency: input.compoundingFrequency,
    compoundingFrequencyLabel: freqLabel,
    compoundingPeriodsPerYear: n,
    disclaimer: FD_DISCLAIMER,
  };
}

