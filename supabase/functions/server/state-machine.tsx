// Contract state machine with strict transition enforcement

import { ContractState } from './types.tsx';

// Valid state transitions
const STATE_TRANSITIONS: Record<ContractState, ContractState[]> = {
  [ContractState.PRE_APPROVED]: [
    ContractState.DEDUCTION_REQUESTED,
    ContractState.CANCELLED,
  ],
  [ContractState.DEDUCTION_REQUESTED]: [
    ContractState.CUSTOMER_AUTHORIZED,
    ContractState.CANCELLED,
  ],
  [ContractState.CUSTOMER_AUTHORIZED]: [
    ContractState.ESCROW_HELD,
    ContractState.CANCELLED,
  ],
  [ContractState.ESCROW_HELD]: [
    ContractState.DISBURSED,
    ContractState.DISPUTED,
    ContractState.CANCELLED,
  ],
  [ContractState.DISBURSED]: [
    ContractState.IN_REPAYMENT,
    ContractState.DISPUTED,
  ],
  [ContractState.IN_REPAYMENT]: [
    ContractState.CLOSED,
    ContractState.DISPUTED,
  ],
  [ContractState.CLOSED]: [],
  [ContractState.DISPUTED]: [
    ContractState.IN_REPAYMENT,
    ContractState.CANCELLED,
  ],
  [ContractState.CANCELLED]: [],
};

export class StateMachineError extends Error {
  constructor(
    public currentState: ContractState,
    public attemptedState: ContractState,
  ) {
    super(
      `Invalid state transition: Cannot move from ${currentState} to ${attemptedState}`,
    );
    this.name = 'StateMachineError';
  }
}

export function validateStateTransition(
  currentState: ContractState,
  newState: ContractState,
): void {
  const allowedTransitions = STATE_TRANSITIONS[currentState];

  if (!allowedTransitions.includes(newState)) {
    throw new StateMachineError(currentState, newState);
  }
}

export function getNextStates(currentState: ContractState): ContractState[] {
  return STATE_TRANSITIONS[currentState] || [];
}

export function isTerminalState(state: ContractState): boolean {
  return (
    state === ContractState.CLOSED || state === ContractState.CANCELLED
  );
}

export function canTransitionTo(
  currentState: ContractState,
  targetState: ContractState,
): boolean {
  const allowedTransitions = STATE_TRANSITIONS[currentState];
  return allowedTransitions.includes(targetState);
}
