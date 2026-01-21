/**
 * Multi-Lender Allocation Engine
 * Assigns BNPL contracts to lenders based on strategy, capital availability, risk profile
 * Strategies: ROUND_ROBIN (balanced load), RISK_WEIGHTED (high risk → conservative lenders), 
 *            EMPLOYER_EXCLUSIVE (specific lenders for employers), PRIORITY (lender preference)
 */

import { Lender, LenderProduct, LenderAllocationRequest, LenderAllocationResult } from './types';

export interface LenderAllocationContext {
  lenders: Lender[];
  requestedAmount: number; // UGX
  tenor: number; // Days
  riskTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  employerId: string;
  strategy: 'ROUND_ROBIN' | 'RISK_WEIGHTED' | 'EMPLOYER_EXCLUSIVE' | 'PRIORITY';
  employerExclusivityMap?: Record<string, string>; // employerId -> lenderId
}

export class MultiLenderAllocationEngine {
  /**
   * Find best-fit lender for BNPL contract
   */
  public static allocate(context: LenderAllocationContext): LenderAllocationResult | null {
    // Filter eligible lenders
    const eligibleLenders = this.filterEligibleLenders(context);

    if (eligibleLenders.length === 0) {
      return null; // No lender can fund this request
    }

    // Apply strategy
    let selectedLender: Lender | null = null;
    let allocationStrategy: LenderAllocationResult['allocationStrategy'] = 'ROUND_ROBIN';
    let reason = '';

    switch (context.strategy) {
      case 'EMPLOYER_EXCLUSIVE':
        const result = this.allocateByEmployerExclusivity(context, eligibleLenders);
        if (result) return result;
        // Fall through to ROUND_ROBIN if no exclusive lender
        break;

      case 'RISK_WEIGHTED':
        const riskResult = this.allocateByRiskProfile(context, eligibleLenders);
        if (riskResult) return riskResult;
        break;

      case 'PRIORITY':
        const priorityResult = this.allocateByPriority(context, eligibleLenders);
        if (priorityResult) return priorityResult;
        break;

      case 'ROUND_ROBIN':
      default:
        const rrResult = this.allocateRoundRobin(context, eligibleLenders);
        if (rrResult) return rrResult;
    }

    return null;
  }

  /**
   * Employer Exclusive Strategy
   * Certain employers partner with specific lenders
   */
  private static allocateByEmployerExclusivity(
    context: LenderAllocationContext,
    eligibleLenders: Lender[]
  ): LenderAllocationResult | null {
    if (!context.employerExclusivityMap) {
      return null; // Fall back to other strategy
    }

    const preferredLenderId = context.employerExclusivityMap[context.employerId];
    if (!preferredLenderId) {
      return null; // No exclusive arrangement
    }

    const lender = eligibleLenders.find((l) => l.id === preferredLenderId);
    if (!lender) {
      return null; // Preferred lender not available
    }

    return {
      lenderId: lender.id,
      assignedAmount: context.requestedAmount,
      allocationStrategy: 'EMPLOYER_EXCLUSIVE',
      reason: `Employer ${context.employerId} has exclusive arrangement with ${lender.name}.`,
    };
  }

  /**
   * Risk-Weighted Strategy
   * Higher risk tiers → more conservative lenders (stable, large)
   * Lower risk tiers → can go with more aggressive lenders (higher ROI)
   */
  private static allocateByRiskProfile(
    context: LenderAllocationContext,
    eligibleLenders: Lender[]
  ): LenderAllocationResult | null {
    const riskWeighting: Record<string, (lender: Lender) => number> = {
      TIER_1: (lender) => {
        // Tier 1 can use aggressive lenders, prefer highest capital utilization (working hard)
        return (lender.capitalUtilized / lender.capitalLimit) * 100;
      },
      TIER_2: (lender) => {
        // Tier 2 balanced: moderate lenders
        const utilization = (lender.capitalUtilized / lender.capitalLimit) * 50;
        const appetite = lender.riskAppetite === 'MODERATE' ? 50 : 0;
        return utilization + appetite;
      },
      TIER_3: (lender) => {
        // Tier 3 high risk: prefer conservative (stable, large)
        const size = lender.capitalLimit > 100_000_000 ? 50 : 0; // UGX 100M+
        const appetite = lender.riskAppetite === 'CONSERVATIVE' ? 50 : 0;
        return size + appetite;
      },
    };

    const scorer = riskWeighting[context.riskTier];
    if (!scorer) return null;

    const scored = eligibleLenders.map((lender) => ({
      lender,
      score: scorer(lender),
    }));

    scored.sort((a, b) => b.score - a.score);
    const bestLender = scored[0].lender;

    return {
      lenderId: bestLender.id,
      assignedAmount: context.requestedAmount,
      allocationStrategy: 'RISK_WEIGHTED',
      reason: `Tier ${context.riskTier} routed to ${bestLender.name} (${bestLender.riskAppetite} appetite, ${Math.round((bestLender.capitalUtilized / bestLender.capitalLimit) * 100)}% utilized).`,
    };
  }

  /**
   * Priority Strategy
   * Lenders can express preference (e.g., Equity Bank prefers TIER_1, TIER_2)
   * System respects preferences while balancing load
   */
  private static allocateByPriority(
    context: LenderAllocationContext,
    eligibleLenders: Lender[]
  ): LenderAllocationResult | null {
    // Sort by capital utilization (lower = more available)
    const sorted = [...eligibleLenders].sort(
      (a, b) => (a.capitalUtilized / a.capitalLimit) - (b.capitalUtilized / b.capitalLimit)
    );

    const lender = sorted[0];
    if (!lender) return null;

    return {
      lenderId: lender.id,
      assignedAmount: context.requestedAmount,
      allocationStrategy: 'PRIORITY',
      reason: `Allocated to ${lender.name} based on capital availability (${Math.round((lender.capitalUtilized / lender.capitalLimit) * 100)}% utilized).`,
    };
  }

  /**
   * Round-Robin Strategy
   * Distribute fairly across all eligible lenders
   */
  private static allocateRoundRobin(
    context: LenderAllocationContext,
    eligibleLenders: Lender[]
  ): LenderAllocationResult | null {
    // Simple round-robin: pick lender with lowest ID (would be timestamp-based in real system)
    const lender = eligibleLenders.sort((a, b) => a.id.localeCompare(b.id))[0];

    if (!lender) return null;

    return {
      lenderId: lender.id,
      assignedAmount: context.requestedAmount,
      allocationStrategy: 'ROUND_ROBIN',
      reason: `Allocated to ${lender.name} via round-robin distribution.`,
    };
  }

  /**
   * Filter lenders eligible for this request
   * Criteria:
   * 1. Active status
   * 2. Has available capital
   * 3. Has matching product for amount, tenor, risk tier
   * 4. Risk profile aligns with request
   */
  private static filterEligibleLenders(context: LenderAllocationContext): Lender[] {
    return context.lenders.filter((lender) => {
      // Check 1: Active
      if (!lender.isActive) return false;

      // Check 2: Has available capital
      const availableCapital = lender.capitalLimit - lender.capitalUtilized;
      if (availableCapital < context.requestedAmount) return false;

      // Check 3: Has matching product
      const matchingProduct = this.findMatchingProduct(lender, context);
      if (!matchingProduct) return false;

      // Check 4: Risk profile alignment (conservative lenders prefer lower risk)
      if (lender.riskAppetite === 'CONSERVATIVE' && context.riskTier === 'TIER_3') {
        return false; // Conservative lenders don't take tier 3
      }

      return true;
    });
  }

  /**
   * Find product within lender's portfolio matching request
   */
  private static findMatchingProduct(
    lender: Lender,
    context: LenderAllocationContext
  ): LenderProduct | null {
    return (
      lender.products.find((product) => {
        const amountMatch = context.requestedAmount >= product.minAmount &&
          context.requestedAmount <= product.maxAmount;

        const tenorMatch = context.tenor <= product.tenor;

        const riskMatch = product.riskTierEligibility.includes(context.riskTier);

        return amountMatch && tenorMatch && riskMatch && product.isActive;
      }) || null
    );
  }

  /**
   * Get allocation statistics (for dashboard/reporting)
   */
  public static getAllocationStats(
    lenders: Lender[]
  ): Record<string, { name: string; utilization: number; capital: number }> {
    return Object.fromEntries(
      lenders.map((lender) => [
        lender.id,
        {
          name: lender.name,
          utilization: Math.round((lender.capitalUtilized / lender.capitalLimit) * 100),
          capital: {
            total: lender.capitalLimit,
            available: lender.capitalLimit - lender.capitalUtilized,
            utilized: lender.capitalUtilized,
          },
        },
      ])
    );
  }
}
