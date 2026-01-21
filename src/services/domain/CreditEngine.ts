/**
 * Credit Engine
 * Real-time affordability checks and limit calculations
 * Inputs: net salary, existing deductions, employer rules, lender rules, CRB, active contracts
 * Output: approved amount, tenor, pricing, assigned lender
 */

import {
  Employee,
  Employer,
  LenderProduct,
  CreditDecision,
  BNPLContract,
  DeductionInstruction,
} from './types';

export interface CreditCheckInput {
  employee: Employee;
  employer: Employer;
  requestedAmount: number; // UGX
  requestedTenor: number; // Days
  crbScore: number; // 0-1000
  activeContracts: BNPLContract[];
}

export class CreditEngine {
  /**
   * Affordability Calculation
   *
   * Constraint 1: Monthly Deduction Capacity
   *   Available = (Net Salary × Deduction Ratio) - Existing Deductions
   *
   * Constraint 2: Outstanding Deduction Limit
   *   Total active deductions <= Net Salary × 0.30 (30% max)
   *
   * Constraint 3: Tenor Matching
   *   Maximum tenor = 6 months (180 days) for most tier 1/2
   *   Maximum tenor = 3 months (90 days) for tier 3
   *
   * Constraint 4: Risk Adjustment
   *   CRB flags, payment history reduce capacity
   */
  public static calculateAffordableAmount(input: CreditCheckInput): {
    maxAmount: number;
    monthlyPayment: number;
    affordinessScore: number;
  } {
    const { employee, employer, requestedTenor, crbScore, activeContracts } = input;

    // Base salary constraints
    const netSalary = employee.netSalary;
    const deductionRatio = this.getDeductionRatio(employee.riskTier);

    // Calculate existing monthly deductions
    const existingMonthlyDeductions = this.calculateExistingDeductions(
      employee.existingDeductions,
      activeContracts
    );

    // Available deduction capacity per month
    const availableDeductionCapacity = netSalary * deductionRatio - existingMonthlyDeductions;

    if (availableDeductionCapacity <= 0) {
      return {
        maxAmount: 0,
        monthlyPayment: 0,
        affordinessScore: 0,
      };
    }

    // Tenor constraints
    const maxTenor = this.getMaxTenor(employee.riskTier);
    const effectiveTenor = Math.min(requestedTenor, maxTenor);

    // Maximum amount based on monthly capacity and tenor
    // Assuming ~3% monthly interest (36% p.a.) and 1% processing fee
    const monthlyRate = 0.03;
    const maxAmount = this.calculatePrincipal(
      availableDeductionCapacity,
      effectiveTenor / 30, // Convert days to months
      monthlyRate
    );

    // CRB-based risk adjustment
    const crbAdjustment = this.getCRBAdjustment(crbScore);
    const adjustedMaxAmount = maxAmount * crbAdjustment;

    // Payment history adjustment
    const paymentHistoryAdjustment = this.getPaymentHistoryAdjustment(activeContracts);
    const finalMaxAmount = adjustedMaxAmount * paymentHistoryAdjustment;

    // Cap to employee's deduction limit
    const employerLimitAdjustedAmount = Math.min(finalMaxAmount, employee.deductionLimit);

    // Calculate monthly payment
    const monthlyPayment = this.calculateMonthlyPayment(
      employerLimitAdjustedAmount,
      effectiveTenor / 30,
      monthlyRate
    );

    // Affordability score (0-100)
    const affordinessScore = Math.min(
      100,
      (availableDeductionCapacity / monthlyPayment) * 20 * (crbScore / 1000)
    );

    return {
      maxAmount: Math.floor(employerLimitAdjustedAmount),
      monthlyPayment: Math.ceil(monthlyPayment),
      affordinessScore: Math.round(affordinessScore),
    };
  }

  /**
   * Make a credit decision
   */
  public static makeDecision(
    input: CreditCheckInput,
    interestRate: number = 0.36, // 36% p.a.
    processingFee: number = 0.01 // 1%
  ): CreditDecision {
    const { employee, requestedTenor, crbScore } = input;
    const affordability = this.calculateAffordableAmount(input);

    const approved = affordability.maxAmount > 0 && affordability.affordinessScore >= 40;
    const approvedAmount = approved ? affordability.maxAmount : 0;

    return {
      employeeId: employee.id,
      approved,
      approvedAmount,
      tenor: requestedTenor,
      interestRate,
      processingFee: Math.ceil(approvedAmount * processingFee),
      assignedLenderId: '', // Will be set by allocation engine
      reasoning: this.generateReasoning(input, affordability, approved),
      confidenceScore: Math.min(100, affordability.affordinessScore),
      timestamp: new Date(),
    };
  }

  /**
   * Private helpers
   */

  private static getDeductionRatio(riskTier: string): number {
    const ratios: Record<string, number> = {
      TIER_1: 0.40, // 40% of salary
      TIER_2: 0.30, // 30% of salary
      TIER_3: 0.20, // 20% of salary
    };
    return ratios[riskTier] || 0.20;
  }

  private static getMaxTenor(riskTier: string): number {
    const tenors: Record<string, number> = {
      TIER_1: 180, // 6 months
      TIER_2: 120, // 4 months
      TIER_3: 90, // 3 months
    };
    return tenors[riskTier] || 90;
  }

  private static calculateExistingDeductions(
    deductionInstructions: DeductionInstruction[],
    activeContracts: BNPLContract[]
  ): number {
    return activeContracts.reduce((sum, contract) => {
      // Find matching deduction instruction
      const deduction = deductionInstructions.find((d) => d.contractId === contract.id);
      return sum + (deduction?.monthlyDeduction || 0);
    }, 0);
  }

  private static calculatePrincipal(
    monthlyPayment: number,
    tenorMonths: number,
    monthlyRate: number
  ): number {
    // Present Value of Annuity formula
    // PV = PMT × [(1 - (1 + r)^-n) / r]
    const factor = (1 - Math.pow(1 + monthlyRate, -tenorMonths)) / monthlyRate;
    return monthlyPayment * factor;
  }

  private static calculateMonthlyPayment(
    principal: number,
    tenorMonths: number,
    monthlyRate: number
  ): number {
    // Future Value Annuity: PMT = P × [r(1 + r)^n] / [(1 + r)^n - 1]
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, tenorMonths);
    const denominator = Math.pow(1 + monthlyRate, tenorMonths) - 1;
    return principal * (numerator / denominator);
  }

  private static getCRBAdjustment(crbScore: number): number {
    if (crbScore >= 800) return 1.0; // Excellent: no adjustment
    if (crbScore >= 650) return 0.9; // Good
    if (crbScore >= 500) return 0.7; // Fair
    return 0.5; // Poor
  }

  private static getPaymentHistoryAdjustment(activeContracts: BNPLContract[]): number {
    if (activeContracts.length === 0) return 1.0;

    const onTimePayments = activeContracts.filter((c) =>
      c.installments.every((i) => i.status !== 'OVERDUE')
    ).length;

    const ratio = onTimePayments / activeContracts.length;
    return 0.8 + ratio * 0.2; // 80-100% based on payment history
  }

  private static generateReasoning(
    input: CreditCheckInput,
    affordability: { maxAmount: number; monthlyPayment: number; affordinessScore: number },
    approved: boolean
  ): string {
    if (!approved) {
      return `Insufficient affordability. Max affordable: UGX ${affordability.maxAmount}. Score: ${affordability.affordinessScore}/100.`;
    }
    return `Approved. Salary: UGX ${input.employee.netSalary}. Max capacity: UGX ${affordability.maxAmount}. Tier: ${input.employee.riskTier}. CRB: ${input.crbScore}/1000.`;
  }
}
