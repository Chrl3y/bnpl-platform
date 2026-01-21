// Affordability and limit calculation engine

import { BUSINESS_RULES, PRICING } from './types.tsx';
import type { BNPLLimit, EmployerPolicy } from './types.tsx';

export interface AffordabilityResult {
  approved: boolean;
  max_amount_1_month: number;
  max_amount_2_months: number;
  max_amount_3_months: number;
  reason?: string;
}

/**
 * Calculate maximum BNPL limit based on salary and debt service ratio
 */
export function calculateAffordability(
  policy: EmployerPolicy,
  existingContractsMonthlyPayment: number = 0,
): AffordabilityResult {
  const netSalary = policy.net_salary;

  // Check minimum salary requirement
  if (netSalary < BUSINESS_RULES.MIN_NET_SALARY) {
    return {
      approved: false,
      max_amount_1_month: 0,
      max_amount_2_months: 0,
      max_amount_3_months: 0,
      reason: `Net salary ${netSalary} is below minimum requirement of ${BUSINESS_RULES.MIN_NET_SALARY}`,
    };
  }

  // Calculate available monthly payment capacity
  const maxMonthlyPayment =
    netSalary * BUSINESS_RULES.MAX_DEBT_SERVICE_RATIO -
    existingContractsMonthlyPayment;

  if (maxMonthlyPayment <= 0) {
    return {
      approved: false,
      max_amount_1_month: 0,
      max_amount_2_months: 0,
      max_amount_3_months: 0,
      reason: 'Debt service ratio exceeded',
    };
  }

  // Calculate principal amount that can be supported
  // Formula: principal * (1 + total_fee_rate * tenor) = total_payable
  // total_payable / tenor = installment_amount
  // installment_amount <= maxMonthlyPayment
  //
  // Therefore: principal * (1 + total_fee_rate * tenor) / tenor <= maxMonthlyPayment
  // principal <= (maxMonthlyPayment * tenor) / (1 + total_fee_rate * tenor)

  const calculateMaxPrincipal = (tenorMonths: number): number => {
    const totalFeeRate = PRICING.TOTAL_MONTHLY_FEE;
    const maxPrincipal =
      (maxMonthlyPayment * tenorMonths) / (1 + totalFeeRate * tenorMonths);
    return Math.floor(maxPrincipal); // Round down to be conservative
  };

  return {
    approved: true,
    max_amount_1_month: calculateMaxPrincipal(1),
    max_amount_2_months: calculateMaxPrincipal(2),
    max_amount_3_months: calculateMaxPrincipal(3),
  };
}

/**
 * Calculate total payable amount including all fees
 */
export function calculateTotalPayable(
  principal: number,
  tenorMonths: number,
): number {
  const totalFeeRate = PRICING.TOTAL_MONTHLY_FEE;
  return principal * (1 + totalFeeRate * tenorMonths);
}

/**
 * Calculate monthly installment amount
 */
export function calculateInstallmentAmount(
  principal: number,
  tenorMonths: number,
): number {
  const totalPayable = calculateTotalPayable(principal, tenorMonths);
  return totalPayable / tenorMonths;
}

/**
 * Validate if requested amount is within limit
 */
export function validateAmountWithinLimit(
  requestedAmount: number,
  limit: BNPLLimit,
): { valid: boolean; reason?: string } {
  if (requestedAmount > limit.max_amount) {
    return {
      valid: false,
      reason: `Requested amount ${requestedAmount} exceeds maximum limit ${limit.max_amount} for ${limit.tenor_months} month tenor`,
    };
  }

  if (requestedAmount > limit.available_amount) {
    return {
      valid: false,
      reason: `Requested amount ${requestedAmount} exceeds available limit ${limit.available_amount}`,
    };
  }

  return { valid: true };
}

/**
 * Calculate fee breakdown
 */
export function calculateFeeBreakdown(principal: number, tenorMonths: number) {
  return {
    principal,
    interest: principal * PRICING.INTEREST_RATE * tenorMonths,
    operational_fee: principal * PRICING.OPERATIONAL_FEE * tenorMonths,
    collection_fee: principal * PRICING.COLLECTION_FEE * tenorMonths,
    total_fees:
      principal * PRICING.TOTAL_MONTHLY_FEE * tenorMonths,
    total_payable: calculateTotalPayable(principal, tenorMonths),
    installment_amount: calculateInstallmentAmount(principal, tenorMonths),
    tenor_months: tenorMonths,
  };
}
