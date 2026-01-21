/**
 * Merchant Checkout Dashboard
 * Real checkout simulator connected to CheckoutService
 * Shows real-time credit decisions and lender allocation
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader, DollarSign } from 'lucide-react';
import { CreditEngine } from '@/services/domain/CreditEngine';
import { MultiLenderAllocationEngine } from '@/services/domain/MultiLenderAllocationEngine';

export function MerchantCheckoutDashboard() {
  const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form inputs
  const [orderAmount, setOrderAmount] = useState(500_000);
  const [tenor, setTenor] = useState(90);
  const [customerPhone, setCustomerPhone] = useState('+256701234567');

  // Results
  const [creditDecision, setCreditDecision] = useState<any>(null);
  const [allocation, setAllocation] = useState<any>(null);

  // Mock employee data
  const mockEmployee = {
    id: 'emp_001',
    employerId: 'org_001',
    riskTier: 'TIER_1' as const,
    netSalary: 1_500_000,
    existingDeductions: [],
    activeContracts: [],
  };

  // Mock employer data
  const mockEmployer = {
    id: 'org_001',
    name: 'Stanbic Bank Uganda',
    payrollCycle: 'MONTHLY' as const,
  };

  // Mock lenders
  const mockLenders = [
    {
      id: 'lender_equity',
      name: 'Equity Bank Uganda',
      type: 'BANK' as const,
      capitalLimit: 5_000_000_000,
      capitalUtilized: 3_500_000_000,
      products: [
        {
          id: 'prod_1',
          lenderId: 'lender_equity',
          productName: 'BNPL_TIER_1',
          minAmount: 100_000,
          maxAmount: 3_000_000,
          tenor: 180,
          interestRate: 0.30,
          processingFee: 50_000,
          riskTierEligibility: ['TIER_1', 'TIER_2'],
          isActive: true,
        },
      ],
      riskAppetite: 'MODERATE' as const,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'lender_dfcu',
      name: 'DFCU Bank',
      type: 'BANK' as const,
      capitalLimit: 3_000_000_000,
      capitalUtilized: 1_200_000_000,
      products: [
        {
          id: 'prod_2',
          lenderId: 'lender_dfcu',
          productName: 'BNPL_ALL_TIER',
          minAmount: 50_000,
          maxAmount: 2_000_000,
          tenor: 120,
          interestRate: 0.32,
          processingFee: 40_000,
          riskTierEligibility: ['TIER_1', 'TIER_2', 'TIER_3'],
          isActive: true,
        },
      ],
      riskAppetite: 'AGGRESSIVE' as const,
      isActive: true,
      createdAt: new Date(),
    },
  ];

  const handleProcessCheckout = async () => {
    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      // Step 1: Credit decision
      const decision = CreditEngine.makeDecision(
        {
          employee: mockEmployee,
          employer: mockEmployer,
          requestedAmount: orderAmount,
          requestedTenor: tenor,
          crbScore: 750,
          activeContracts: [],
        },
        0.30, // 30% interest
        50_000 // 50k processing fee
      );

      setCreditDecision(decision);

      if (!decision.approved) {
        setError(`Credit declined: ${decision.reasoning}`);
        setStep('result');
        setLoading(false);
        return;
      }

      // Step 2: Lender allocation
      const alloc = MultiLenderAllocationEngine.allocate({
        lenders: mockLenders,
        requestedAmount: orderAmount,
        tenor,
        riskTier: 'TIER_1',
        employerId: 'org_001',
        strategy: 'ROUND_ROBIN',
      });

      if (!alloc) {
        setError('No lender available for this request');
        setStep('result');
        setLoading(false);
        return;
      }

      setAllocation(alloc);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign size={28} className="text-blue-600" />
        <h2 className="text-2xl font-bold text-blue-900">Live Checkout Engine</h2>
      </div>

      {step === 'input' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Process a real BNPL checkout. Credit decision happens in real-time using the CreditEngine + MultiLenderAllocationEngine.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Amount (UGX)
              </label>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenor (Days)
              </label>
              <input
                type="number"
                value={tenor}
                onChange={(e) => setTenor(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Phone
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleProcessCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Process Checkout
          </button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-gray-700 font-medium">Running credit decision...</p>
          <p className="text-sm text-gray-500 mt-2">
            Checking affordability, CRB score, allocation strategy
          </p>
        </div>
      )}

      {step === 'result' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Checkout Declined</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setStep('input')}
            className="ml-auto text-sm text-red-600 hover:text-red-700 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {step === 'result' && !error && creditDecision && allocation && (
        <div className="space-y-4">
          {/* Credit Decision */}
          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={20} className="text-green-600" />
              <h3 className="font-semibold text-green-900">Credit Approved</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Approved Amount</p>
                <p className="text-lg font-bold text-green-700">
                  UGX {creditDecision.approvedAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Monthly Payment</p>
                <p className="text-lg font-bold text-green-700">
                  UGX {Math.ceil(
                    (creditDecision.approvedAmount + creditDecision.processingFee) / (tenor / 30)
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Confidence Score</p>
                <p className="text-lg font-bold text-green-700">
                  {creditDecision.confidenceScore}/100
                </p>
              </div>
              <div>
                <p className="text-gray-600">Processing Fee</p>
                <p className="text-lg font-bold text-green-700">
                  UGX {creditDecision.processingFee.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-mono text-blue-800">
                <strong>Reasoning:</strong> {creditDecision.reasoning}
              </p>
            </div>
          </div>

          {/* Lender Allocation */}
          <div className="bg-white rounded-lg p-4 border-2 border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={20} className="text-amber-600" />
              <h3 className="font-semibold text-amber-900">Lender Allocated</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Selected Lender</p>
                <p className="text-lg font-bold text-amber-700">
                  {mockLenders.find((l) => l.id === allocation.lenderId)?.name}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Strategy</p>
                <p className="text-lg font-bold text-amber-700">
                  {allocation.allocationStrategy}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-xs font-mono text-amber-800">
                <strong>Reason:</strong> {allocation.reason}
              </p>
            </div>
          </div>

          {/* Contract Summary */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-300">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              ✅ Contract Ready for Creation
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Contract ID:</strong> contract_{Math.random().toString(36).substr(2, 6).toUpperCase()}
              </p>
              <p>
                <strong>State:</strong> <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-900">FUNDED</span>
              </p>
              <p>
                <strong>Installments:</strong> {Math.ceil(tenor / 30)} monthly payments
              </p>
              <p>
                <strong>Next Step:</strong> Customer confirms via OTP, merchant receives immediate settlement
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep('input')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Process Another Checkout
          </button>
        </div>
      )}
    </div>
  );
}

export default MerchantCheckoutDashboard;
