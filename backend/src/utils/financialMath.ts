/**
 * FinSight Deterministic Financial Calculation Engine
 * 
 * Provides precision-verified calculations for:
 * 1. Loan EMI, total interest, and total payable
 * 2. Systematic Investment Plan (SIP) future value and wealth gain
 * 3. Affordability analysis against monthly net cash flow and liquid buffers
 * 4. Goal timeline projection
 * 5. Compound interest (leveraging fdCalculator)
 */

export interface EMICalculationResult {
  principal: number;
  annualRatePct: number;
  tenureMonths: number;
  monthlyEMI: number;
  totalInterest: number;
  totalPayable: number;
  principalPct: number;
  interestPct: number;
}

/**
 * Standard reducing-balance EMI formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * Where r = annualRate / 12 / 100, n = tenureMonths
 */
export function calculateEMI(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): EMICalculationResult {
  const P = Math.max(0, Number(principal) || 0);
  const annualRate = Math.max(0, Number(annualRatePct) || 0);
  const n = Math.max(1, Math.round(Number(tenureMonths) || 1));

  if (P === 0) {
    return {
      principal: 0,
      annualRatePct: annualRate,
      tenureMonths: n,
      monthlyEMI: 0,
      totalInterest: 0,
      totalPayable: 0,
      principalPct: 100,
      interestPct: 0,
    };
  }

  // 0% interest edge-case
  if (annualRate === 0) {
    const emi = Math.round((P / n) * 100) / 100;
    return {
      principal: P,
      annualRatePct: 0,
      tenureMonths: n,
      monthlyEMI: emi,
      totalInterest: 0,
      totalPayable: P,
      principalPct: 100,
      interestPct: 0,
    };
  }

  const r = annualRate / (12 * 100);
  const factor = Math.pow(1 + r, n);
  const rawEMI = (P * r * factor) / (factor - 1);
  const emi = Math.round(rawEMI * 100) / 100;
  const totalPayable = Math.round(emi * n * 100) / 100;
  const totalInterest = Math.max(0, Math.round((totalPayable - P) * 100) / 100);

  const principalPct = totalPayable > 0 ? Math.round((P / totalPayable) * 1000) / 10 : 100;
  const interestPct = totalPayable > 0 ? Math.round((totalInterest / totalPayable) * 1000) / 10 : 0;

  return {
    principal: P,
    annualRatePct: annualRate,
    tenureMonths: n,
    monthlyEMI: emi,
    totalInterest,
    totalPayable,
    principalPct,
    interestPct,
  };
}

export interface SIPCalculationResult {
  monthlyInvestment: number;
  expectedAnnualReturnPct: number;
  tenureYears: number;
  totalInvested: number;
  estimatedReturns: number;
  futureValue: number;
}

/**
 * Standard monthly SIP formula:
 * M = P * ((1 + i)^n - 1) / i * (1 + i)
 * Where i = annualReturnPct / 12 / 100, n = tenureYears * 12
 */
export function calculateSIP(
  monthlyInvestment: number,
  expectedAnnualReturnPct: number,
  tenureYears: number
): SIPCalculationResult {
  const P = Math.max(0, Number(monthlyInvestment) || 0);
  const annualReturn = Math.max(0, Number(expectedAnnualReturnPct) || 0);
  const years = Math.max(0.1, Number(tenureYears) || 1);
  const n = Math.round(years * 12);

  const totalInvested = Math.round(P * n);

  if (P === 0 || annualReturn === 0) {
    return {
      monthlyInvestment: P,
      expectedAnnualReturnPct: annualReturn,
      tenureYears: years,
      totalInvested,
      estimatedReturns: 0,
      futureValue: totalInvested,
    };
  }

  const i = annualReturn / (12 * 100);
  const factor = Math.pow(1 + i, n);
  const rawFutureValue = P * ((factor - 1) / i) * (1 + i);
  const futureValue = Math.round(rawFutureValue);
  const estimatedReturns = Math.max(0, futureValue - totalInvested);

  return {
    monthlyInvestment: P,
    expectedAnnualReturnPct: annualReturn,
    tenureYears: years,
    totalInvested,
    estimatedReturns,
    futureValue,
  };
}

export interface AffordabilityAssessment {
  itemType: string;
  totalCost: number;
  isAffordable: boolean;
  verdict: "AFFORDABLE" | "STRETCH_RISK" | "NOT_RECOMMENDED" | "INSUFFICIENT_DATA";
  reason: string;
  monthlySurplus: number;
  estimatedEMI?: number;
  dtiPct?: number; // EMI as % of monthly income
  upfrontImpactPct?: number; // Out of pocket vs available savings
  recommendation: string;
}

export function assessAffordability(params: {
  purchaseAmount: number;
  isLoanFinanced?: boolean;
  userMonthlyIncome: number;
  userMonthlyExpense: number;
  userAvailableSavings?: number;
  userEmergencyFund?: number;
  loanTenureMonths?: number;
  annualInterestRatePct?: number;
  itemDescription?: string;
}): AffordabilityAssessment {
  const cost = Number(params.purchaseAmount) || 0;
  const income = Number(params.userMonthlyIncome) || 0;
  const expense = Number(params.userMonthlyExpense) || 0;
  const savings = Math.max(0, Number(params.userAvailableSavings) || 0);
  const surplus = Math.round(income - expense);
  const item = params.itemDescription || "purchase";

  // Case 1: No recorded income data
  if (income <= 0) {
    return {
      itemType: item,
      totalCost: cost,
      isAffordable: false,
      verdict: "INSUFFICIENT_DATA",
      reason: "No recurring monthly income transactions are currently recorded in your FinSight account.",
      monthlySurplus: surplus,
      recommendation: "To determine if this is affordable, please share your monthly take-home salary or record an Income transaction.",
    };
  }

  // Case 2: Financed purchase (e.g. Car, Home, major loan, or high-value asset > 2x monthly income)
  const isFinanced = params.isLoanFinanced ?? (cost > income * 2);

  if (isFinanced) {
    const rate = params.annualInterestRatePct ?? 9.0; // standard commercial vehicle / personal benchmark rate
    const tenure = params.loanTenureMonths ?? 60; // default 5 years for vehicle/major loans
    const loanPrincipal = Math.round(cost * 0.85); // assumes 15% down payment
    const emiResult = calculateEMI(loanPrincipal, rate, tenure);
    const emi = emiResult.monthlyEMI;
    const dtiPct = Math.round((emi / income) * 1000) / 10;

    let verdict: AffordabilityAssessment["verdict"] = "AFFORDABLE";
    let isAffordable = true;
    let reason = "";
    let recommendation = "";

    if (surplus < emi) {
      verdict = "NOT_RECOMMENDED";
      isAffordable = false;
      reason = `The estimated EMI of ₹${emi.toLocaleString("en-IN")}/mo exceeds your current monthly net cash flow surplus of ₹${surplus.toLocaleString("en-IN")}.`;
      recommendation = "Taking this on would create monthly negative cash flow unless you increase income or curtail discretionary expenses.";
    } else if (dtiPct > 35) {
      verdict = "STRETCH_RISK";
      isAffordable = false;
      reason = `The estimated EMI of ₹${emi.toLocaleString("en-IN")}/mo consumes ${dtiPct}% of your total monthly income (prudent benchmark is under 20-25%).`;
      recommendation = "Consider saving a larger down payment (30-40%) or choosing a slightly lower price bracket to avoid debt strain.";
    } else {
      verdict = "AFFORDABLE";
      isAffordable = true;
      reason = `The estimated EMI of ₹${emi.toLocaleString("en-IN")}/mo (with ~15% down payment) represents ${dtiPct}% of your income and fits within your ₹${surplus.toLocaleString("en-IN")} monthly surplus.`;
      recommendation = "Ensure you maintain at least 3-6 months of expenses in an emergency fund before committing to this loan.";
    }

    return {
      itemType: item,
      totalCost: cost,
      isAffordable,
      verdict,
      reason,
      monthlySurplus: surplus,
      estimatedEMI: emi,
      dtiPct,
      recommendation,
    };
  }

  // Case 3: Outright / One-time cash purchase (e.g. phone, gadget, holiday)
  if (cost <= surplus) {
    return {
      itemType: item,
      totalCost: cost,
      isAffordable: true,
      verdict: "AFFORDABLE",
      reason: `At ₹${cost.toLocaleString("en-IN")}, this purchase fits entirely within your current single-month surplus of ₹${surplus.toLocaleString("en-IN")}.`,
      monthlySurplus: surplus,
      recommendation: "You can comfortably pay for this out of this month's savings without dipping into emergency reserves or taking high-cost debt.",
    };
  }

  if (savings >= cost * 2) {
    return {
      itemType: item,
      totalCost: cost,
      isAffordable: true,
      verdict: "AFFORDABLE",
      reason: `While ₹${cost.toLocaleString("en-IN")} exceeds one month's surplus (₹${surplus.toLocaleString("en-IN")}), your liquid savings (₹${savings.toLocaleString("en-IN")}) comfortably cover it.`,
      monthlySurplus: surplus,
      recommendation: "Ensure that after this purchase, your remaining emergency fund still covers at least 3 months of essential expenses.",
    };
  }

  return {
    itemType: item,
    totalCost: cost,
    isAffordable: false,
    verdict: "STRETCH_RISK",
    reason: `Cost of ₹${cost.toLocaleString("en-IN")} exceeds your monthly net surplus (₹${surplus.toLocaleString("en-IN")}) and would significantly deplete your available savings buffer.`,
    monthlySurplus: surplus,
    recommendation: `Consider creating a savings goal and setting aside ₹${Math.round(cost / 3).toLocaleString("en-IN")}/month for 3 months rather than purchasing outright today.`,
  };
}

/**
 * Parses user questions for financial numerical requests (EMI, SIP, Affordability, etc.)
 */
export function detectAndCalculateMath(question: string, userIncome: number, userExpense: number, userSavings: number): string | null {
  const q = question.toLowerCase();

  // Pattern A: Car / Bike / Big ticket affordability: "Can I afford a 15 lakh car", "Can I afford a 12L car"
  const affordCarMatch = q.match(/afford(?:\s+a)?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)\s*(lakh|lac|l|crore|cr|k)?\s*(car|bike|vehicle|auto|house|home|flat)/i);
  if (affordCarMatch) {
    let num = parseFloat(affordCarMatch[1]);
    const unit = (affordCarMatch[2] || "").toLowerCase();
    if (unit === "lakh" || unit === "lac" || unit === "l") num *= 100_000;
    else if (unit === "crore" || unit === "cr") num *= 10_000_000;
    else if (unit === "k") num *= 1_000;
    else if (num < 100) num *= 100_000; // e.g. "15 car" assumed 15 lakh

    const assessment = assessAffordability({
      purchaseAmount: num,
      isLoanFinanced: true,
      userMonthlyIncome: userIncome,
      userMonthlyExpense: userExpense,
      userAvailableSavings: userSavings,
      itemDescription: affordCarMatch[3] || "car",
    });

    return `[Backend Calculation - Vehicle Affordability Check]:
- Item: ₹${num.toLocaleString("en-IN")} ${assessment.itemType}
- Estimated 5-Year Loan EMI @ 9% (15% down payment): ₹${assessment.estimatedEMI?.toLocaleString("en-IN")}/month
- User Income: ₹${userIncome.toLocaleString("en-IN")} | Monthly Surplus: ₹${assessment.monthlySurplus.toLocaleString("en-IN")}
- Debt-to-Income impact: ${assessment.dtiPct}%
- Verdict: ${assessment.verdict}
- Mathematical Reason: ${assessment.reason}
- Guidance: ${assessment.recommendation}`;
  }

  // Pattern B: Gadget / holiday affordability: "Can I buy a 60,000 phone", "Can I afford a 50k vacation/holiday/laptop"
  const affordGadgetMatch = q.match(/(?:afford|buy|purchase|get)(?:\s+a)?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)\s*(k|lakh|lac)?\s*(phone|mobile|iphone|laptop|tv|holiday|trip|vacation|watch)/i);
  if (affordGadgetMatch) {
    let raw = affordGadgetMatch[1].replace(/,/g, "");
    let num = parseFloat(raw);
    const unit = (affordGadgetMatch[2] || "").toLowerCase();
    if (unit === "k") num *= 1_000;
    else if (unit === "lakh" || unit === "lac") num *= 100_000;

    const assessment = assessAffordability({
      purchaseAmount: num,
      isLoanFinanced: false,
      userMonthlyIncome: userIncome,
      userMonthlyExpense: userExpense,
      userAvailableSavings: userSavings,
      itemDescription: affordGadgetMatch[3] || "purchase",
    });

    return `[Backend Calculation - Purchase Affordability Check]:
- Item: ₹${num.toLocaleString("en-IN")} ${assessment.itemType}
- User Income: ₹${userIncome.toLocaleString("en-IN")} | Monthly Surplus: ₹${assessment.monthlySurplus.toLocaleString("en-IN")}
- Available Savings Buffer: ₹${userSavings.toLocaleString("en-IN")}
- Verdict: ${assessment.verdict}
- Mathematical Reason: ${assessment.reason}
- Guidance: ${assessment.recommendation}`;
  }

  // Pattern C: Loan EMI Calculation: "What is EMI for 10 lakh loan at 8.5% for 5 years"
  const emiMatch = q.match(/emi\s*(?:for|on)?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(lakh|lac|l|cr|k)?\s*(?:loan)?.*?(?:at|@)\s*([0-9]+(?:\.[0-9]+)?)\s*%.*?([0-9]+)\s*(year|yr|month|mo)/i);
  if (emiMatch) {
    let rawP = emiMatch[1].replace(/,/g, "");
    let P = parseFloat(rawP);
    const unit = (emiMatch[2] || "").toLowerCase();
    if (unit === "lakh" || unit === "lac" || unit === "l") P *= 100_000;
    else if (unit === "cr") P *= 10_000_000;
    else if (unit === "k") P *= 1_000;

    const rate = parseFloat(emiMatch[3]);
    let tenure = parseInt(emiMatch[4], 10);
    const tenureUnit = (emiMatch[5] || "").toLowerCase();
    if (tenureUnit.startsWith("year") || tenureUnit.startsWith("yr")) {
      tenure *= 12;
    }

    const emi = calculateEMI(P, rate, tenure);
    return `[Backend Calculation - Loan EMI Breakdown]:
- Principal: ₹${emi.principal.toLocaleString("en-IN")}
- Interest Rate: ${emi.annualRatePct}% p.a.
- Tenure: ${emi.tenureMonths} Months (${emi.tenureMonths / 12} Years)
- Exact Monthly EMI: ₹${emi.monthlyEMI.toLocaleString("en-IN")}
- Total Interest Payable: ₹${emi.totalInterest.toLocaleString("en-IN")}
- Total Amount Payable: ₹${emi.totalPayable.toLocaleString("en-IN")}`;
  }

  // Pattern D: SIP Calculation: "SIP of 5000 at 12% for 10 years"
  const sipMatch = q.match(/sip\s*(?:of)?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:at|@)\s*([0-9]+(?:\.[0-9]+)?)\s*%.*?([0-9]+)\s*(year|yr)/i);
  if (sipMatch) {
    const p = parseFloat(sipMatch[1].replace(/,/g, ""));
    const r = parseFloat(sipMatch[2]);
    const y = parseInt(sipMatch[3], 10);
    const sip = calculateSIP(p, r, y);

    return `[Backend Calculation - SIP Wealth Accumulation]:
- Monthly Investment: ₹${sip.monthlyInvestment.toLocaleString("en-IN")}
- Expected Rate of Return: ${sip.expectedAnnualReturnPct}% p.a.
- Duration: ${sip.tenureYears} Years (${sip.tenureYears * 12} Installments)
- Total Amount Invested: ₹${sip.totalInvested.toLocaleString("en-IN")}
- Estimated Capital Growth: ₹${sip.estimatedReturns.toLocaleString("en-IN")}
- Estimated Total Maturity Value: ₹${sip.futureValue.toLocaleString("en-IN")}`;
  }

  return null;
}

