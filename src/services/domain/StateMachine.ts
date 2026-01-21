/**
 * BNPL Contract State Machine
 * Manages contract lifecycle: PRE_APPROVED → ORDER_CREATED → CUSTOMER_AUTHORIZED → FUNDED → IN_REPAYMENT → CLOSED
 */

import {
  BNPLContract,
  BNPLContractState,
  StateTransition,
} from './types';

export class ContractStateMachine {
  /**
   * Valid state transitions
   */
  private static readonly VALID_TRANSITIONS: Record<BNPLContractState, BNPLContractState[]> = {
    PRE_APPROVED: ['ORDER_CREATED', 'CANCELLED'],
    ORDER_CREATED: ['CUSTOMER_AUTHORIZED', 'CANCELLED'],
    CUSTOMER_AUTHORIZED: ['FUNDED', 'CANCELLED'],
    FUNDED: ['IN_REPAYMENT', 'REFUNDED'],
    IN_REPAYMENT: ['CLOSED', 'DEFAULTED', 'CANCELLED'],
    CLOSED: [],
    CANCELLED: [],
    REFUNDED: [],
    DEFAULTED: [],
  };

  /**
   * Validate if transition is allowed
   */
  public static canTransition(
    fromState: BNPLContractState,
    toState: BNPLContractState
  ): boolean {
    const allowed = this.VALID_TRANSITIONS[fromState] || [];
    return allowed.includes(toState);
  }

  /**
   * Attempt state transition with validation
   */
  public static transitionState(
    contract: BNPLContract,
    newState: BNPLContractState,
    reason: string,
    triggeredBy: string = 'SYSTEM'
  ): { success: boolean; error?: string; contract?: BNPLContract } {
    if (!this.canTransition(contract.state, newState)) {
      return {
        success: false,
        error: `Cannot transition from ${contract.state} to ${newState}`,
      };
    }

    const transition: StateTransition = {
      fromState: contract.state,
      toState: newState,
      reason,
      timestamp: new Date(),
      triggeredBy,
    };

    contract.state = newState;
    contract.stateTransitionHistory.push(transition);

    // Update timestamps for terminal states
    if (newState === 'CLOSED') {
      contract.closedAt = new Date();
    }

    return { success: true, contract };
  }

  /**
   * Get valid next states for current state
   */
  public static getValidNextStates(currentState: BNPLContractState): BNPLContractState[] {
    return this.VALID_TRANSITIONS[currentState] || [];
  }

  /**
   * Check if contract is in terminal state
   */
  public static isTerminal(state: BNPLContractState): boolean {
    const terminalStates: BNPLContractState[] = ['CLOSED', 'CANCELLED', 'REFUNDED', 'DEFAULTED'];
    return terminalStates.includes(state);
  }

  /**
   * Check if contract is active (currently funded and in repayment)
   */
  public static isActive(state: BNPLContractState): boolean {
    return state === 'FUNDED' || state === 'IN_REPAYMENT';
  }
}
