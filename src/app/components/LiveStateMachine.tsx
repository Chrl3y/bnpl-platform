/**
 * Live Contract State Machine Visualizer
 * Shows the contract lifecycle in real-time
 */

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { ContractStateMachine } from '@/services/domain/StateMachine';

type BNPLState = 'PRE_APPROVED' | 'ORDER_CREATED' | 'CUSTOMER_AUTHORIZED' | 'FUNDED' | 'IN_REPAYMENT' | 'CLOSED' | 'CANCELLED' | 'REFUNDED' | 'DEFAULTED';

export function LiveStateMachineVisualizer() {
  const [currentState, setCurrentState] = useState<BNPLState>('PRE_APPROVED');
  const [transitionHistory, setTransitionHistory] = useState<
    { from: BNPLState; to: BNPLState; time: Date }[]
  >([
    {
      from: 'PRE_APPROVED' as BNPLState,
      to: 'ORDER_CREATED' as BNPLState,
      time: new Date(Date.now() - 5 * 60 * 1000),
    },
  ]);

  const states: BNPLState[] = [
    'PRE_APPROVED',
    'ORDER_CREATED',
    'CUSTOMER_AUTHORIZED',
    'FUNDED',
    'IN_REPAYMENT',
    'CLOSED',
  ];

  const alternativeEnds: BNPLState[] = ['CANCELLED', 'REFUNDED', 'DEFAULTED'];

  const handleTransition = (targetState: BNPLState) => {
    // Check if transition is valid
    const isValid = ContractStateMachine.canTransition(currentState, targetState);

    if (!isValid) {
      alert(`Cannot transition from ${currentState} to ${targetState}`);
      return;
    }

    // Record transition
    setTransitionHistory([
      ...transitionHistory,
      {
        from: currentState,
        to: targetState,
        time: new Date(),
      },
    ]);

    setCurrentState(targetState);
  };

  const getValidNextStates = (): BNPLState[] => {
    return ContractStateMachine.getValidNextStates(currentState);
  };

  const isTerminal = ContractStateMachine.isTerminal(currentState);
  const isActive = ContractStateMachine.isActive(currentState);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200">
      <div className="flex items-center gap-3 mb-6">
        <Clock size={28} className="text-indigo-600" />
        <h2 className="text-2xl font-bold text-indigo-900">Contract State Machine</h2>
      </div>

      {/* Main State Visualization */}
      <div className="bg-white rounded-lg p-6 border border-indigo-200 mb-6">
        {/* Current State */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 mb-2">Current State</p>
          <div
            className={`px-6 py-4 rounded-lg font-bold text-white text-center text-lg ${
              isTerminal
                ? currentState === 'CLOSED'
                  ? 'bg-green-500'
                  : currentState === 'CANCELLED'
                    ? 'bg-gray-500'
                    : currentState === 'REFUNDED'
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                : isActive
                  ? 'bg-blue-500'
                  : 'bg-indigo-500'
            }`}
          >
            {currentState}
            {isTerminal && ' (Terminal State)'}
            {isActive && ' (Active)'}
          </div>
        </div>

        {/* Valid Transitions */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-700 mb-3">Valid Next States</p>

          {getValidNextStates().length === 0 ? (
            <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
              No transitions available. This is a terminal state.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {getValidNextStates().map((nextState) => (
                <button
                  key={nextState}
                  onClick={() => handleTransition(nextState)}
                  className="p-3 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-lg text-indigo-900 font-medium transition flex items-center justify-between"
                >
                  <span>{nextState}</span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alternative Ends */}
        {!isTerminal && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Emergency Transitions</p>
            <div className="grid grid-cols-3 gap-3">
              {alternativeEnds.map((endState) => {
                const canTransition = ContractStateMachine.canTransition(currentState, endState);
                return (
                  <button
                    key={endState}
                    onClick={() => canTransition && handleTransition(endState)}
                    disabled={!canTransition}
                    className={`p-2 rounded-lg text-sm font-medium transition ${
                      canTransition
                        ? endState === 'CANCELLED'
                          ? 'bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700'
                          : endState === 'REFUNDED'
                            ? 'bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-700'
                            : 'bg-red-50 hover:bg-red-100 border border-red-300 text-red-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {endState}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* State Diagram */}
      <div className="bg-white rounded-lg p-6 border border-indigo-200 mb-6 overflow-x-auto">
        <p className="text-sm font-semibold text-gray-700 mb-4">Happy Path</p>
        <div className="flex items-center gap-2 min-w-max pb-2">
          {states.map((state, idx) => (
            <React.Fragment key={state}>
              <div
                className={`px-4 py-2 rounded-lg font-medium text-center whitespace-nowrap transition ${
                  state === currentState
                    ? 'bg-indigo-500 text-white ring-2 ring-indigo-300'
                    : idx < states.indexOf(currentState)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                {state === currentState && <CheckCircle2 className="inline mr-2" size={16} />}
                {state}
              </div>
              {idx < states.length - 1 && (
                <ArrowRight size={20} className="text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Transition History */}
      <div className="bg-white rounded-lg p-6 border border-indigo-200">
        <p className="text-sm font-semibold text-gray-700 mb-4">Transition History</p>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {transitionHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No transitions yet</p>
          ) : (
            transitionHistory.map((transition, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm border border-gray-100"
              >
                <span className="text-gray-500">{idx + 1}.</span>
                <span className="font-mono text-gray-700">{transition.from}</span>
                <ArrowRight size={16} className="text-gray-400" />
                <span className="font-mono text-gray-700">{transition.to}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {transition.time.toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-900">
        <p className="font-semibold mb-2">💡 About the State Machine</p>
        <p className="text-indigo-800">
          This visualizes the BNPL contract lifecycle. Contracts can only transition through valid states. Once a contract reaches a terminal state (CLOSED, CANCELLED, REFUNDED, DEFAULTED), no further transitions are possible. Try clicking the buttons above to see valid transitions!
        </p>
      </div>
    </div>
  );
}

export default LiveStateMachineVisualizer;
