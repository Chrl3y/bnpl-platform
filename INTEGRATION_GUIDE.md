/**
 * INTEGRATION GUIDE: Connecting Services to React Frontend
 * 
 * This guide shows how to wire the backend services into React components
 * and convert the documentation UI to an operator/lender dashboard.
 */

// ============================================================================
// PART 1: SERVICE INITIALIZATION
// ============================================================================

/**
 * Create a unified service layer that React components import from
 * File: src/services/index.ts
 */

import CheckoutService from './api/CheckoutService';
import PaymentSettlementService from './api/PaymentSettlementService';
import EmployerPayrollService from './api/EmployerPayrollService';
import MifosXAdapter from './integrations/MifosXAdapter';
import { CreditEngine } from './domain/CreditEngine';
import { MultiLenderAllocationEngine } from './domain/MultiLenderAllocationEngine';
import { ContractStateMachine } from './domain/StateMachine';

// Mock implementations for dependencies (replace with real API calls)
const createDependencies = () => ({
  merchantRepo: {
    get: async (id: string) => {
      const response = await fetch(`/api/admin/merchants/${id}`);
      return response.json();
    },
  },
  employeeRepo: {
    getByPhone: async (phone: string) => {
      const response = await fetch(`/api/admin/employees/phone/${phone}`);
      return response.json();
    },
    get: async (id: string) => {
      const response = await fetch(`/api/admin/employees/${id}`);
      return response.json();
    },
  },
  employerRepo: {
    get: async (id: string) => {
      const response = await fetch(`/api/admin/employers/${id}`);
      return response.json();
    },
  },
  lenderRepo: {
    getAll: async () => {
      const response = await fetch('/api/admin/lenders');
      return response.json();
    },
  },
  contractRepo: {
    create: async (contract: any) => {
      const response = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract),
      });
      return response.json();
    },
    get: async (id: string) => {
      const response = await fetch(`/api/admin/contracts/${id}`);
      return response.json();
    },
    update: async (contract: any) => {
      await fetch(`/api/admin/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract),
      });
    },
  },
  crbService: {
    check: async (nationalId: string, phoneNumber: string) => {
      const response = await fetch('/api/admin/crb-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId, phoneNumber }),
      });
      return response.json();
    },
  },
  idempotencyCache: {
    get: async (key: string) => {
      const response = await fetch(`/api/admin/cache/${key}`);
      if (response.status === 404) return null;
      return response.json();
    },
    set: async (key: string, value: any) => {
      await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    },
  },
  eventBus: {
    publish: async (event: any) => {
      await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    },
  },
  ledgerRepo: {
    create: async (entry: any) => {
      const response = await fetch('/api/admin/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      return response.json();
    },
  },
  deductionRepo: {
    create: async (deduction: any) => {
      const response = await fetch('/api/admin/deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deduction),
      });
      return response.json();
    },
    update: async (deduction: any) => {
      await fetch(`/api/admin/deductions/${deduction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deduction),
      });
    },
    getActive: async (employerId: string) => {
      const response = await fetch(`/api/admin/employers/${employerId}/deductions/active`);
      return response.json();
    },
  },
  paymentGateway: {
    initiate: async (amount: number, account: string) => {
      const response = await fetch('/api/admin/payment-gateway/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, account }),
      });
      return response.json();
    },
  },
  auditLog: {
    record: async (event: any) => {
      await fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    },
  },
  compliance: {
    validateSalary: (salary: number) => salary >= 150_000 && salary <= 50_000_000,
  },
  mifosClient: {
    createLoan: async (request: any) => {
      const response = await fetch('/api/admin/mifos/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      return response.json();
    },
    postRepayment: async (loanId: string, amount: number, date: Date) => {
      const response = await fetch(`/api/admin/mifos/loans/${loanId}/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date }),
      });
      return response.json();
    },
    getLoanStatus: async (loanId: string) => {
      const response = await fetch(`/api/admin/mifos/loans/${loanId}`);
      return response.json();
    },
    closeAccount: async (clientId: string) => {
      await fetch(`/api/admin/mifos/clients/${clientId}/close`, {
        method: 'POST',
      });
    },
  },
  linkRepo: {
    create: async (link: any) => {
      const response = await fetch('/api/admin/mifos-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      });
      return response.json();
    },
    getByBNPLContract: async (contractId: string) => {
      const response = await fetch(`/api/admin/mifos-links/contract/${contractId}`);
      if (response.status === 404) return null;
      return response.json();
    },
    update: async (link: any) => {
      await fetch(`/api/admin/mifos-links/${link.bnplContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      });
    },
  },
});

export const deps = createDependencies();

export const BNPLServices = {
  checkout: CheckoutService,
  settlement: PaymentSettlementService,
  payroll: EmployerPayrollService,
  mifos: MifosXAdapter,
  credit: CreditEngine,
  allocation: MultiLenderAllocationEngine,
  stateMachine: ContractStateMachine,
};

export default BNPLServices;

// ============================================================================
// PART 2: REACT HOOKS FOR SERVICE INTEGRATION
// ============================================================================

/**
 * File: src/hooks/useBNPLCheckout.ts
 * 
 * Custom hook for processing merchant checkouts
 */

import { useState } from 'react';
import { CheckoutRequest, AuthorizationResponse } from '@/services/domain/types';
import { BNPLServices, deps } from '@/services';

export function useBNPLCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AuthorizationResponse | null>(null);

  const processCheckout = async (request: CheckoutRequest) => {
    setLoading(true);
    setError(null);

    try {
      const result = await BNPLServices.checkout.processCheckout(request, deps);

      if (result.success && result.data) {
        setResponse(result.data);
        return result.data;
      } else {
        setError(result.error || 'Checkout failed');
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { processCheckout, loading, error, response };
}

/**
 * File: src/hooks/useLenderAllocation.ts
 */

import { useState } from 'react';
import { LenderAllocationResult } from '@/services/domain/types';
import { BNPLServices } from '@/services';

export function useLenderAllocation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LenderAllocationResult | null>(null);

  const allocate = async (lenders: any[], amount: number, tenor: number, tier: string) => {
    setLoading(true);

    try {
      const allocation = BNPLServices.allocation.allocate({
        lenders,
        requestedAmount: amount,
        tenor,
        riskTier: tier as any,
        employerId: '',
        strategy: 'ROUND_ROBIN',
      });

      setResult(allocation);
      return allocation;
    } finally {
      setLoading(false);
    }
  };

  return { allocate, loading, result };
}

/**
 * File: src/hooks/useCreditDecision.ts
 */

import { useState } from 'react';
import { CreditDecision } from '@/services/domain/types';
import { BNPLServices } from '@/services';

export function useCreditDecision() {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<CreditDecision | null>(null);

  const decide = async (employee: any, employer: any, amount: number, tenor: number, crbScore: number) => {
    setLoading(true);

    try {
      const creditDecision = BNPLServices.credit.makeDecision(
        {
          employee,
          employer,
          requestedAmount: amount,
          requestedTenor: tenor,
          crbScore,
          activeContracts: [],
        }
      );

      setDecision(creditDecision);
      return creditDecision;
    } finally {
      setLoading(false);
    }
  };

  return { decide, loading, decision };
}

// ============================================================================
// PART 3: REACT COMPONENTS (Refactored from Documentation to Dashboard)
// ============================================================================

/**
 * File: src/app/components/MerchantCheckoutSimulator.tsx
 * 
 * BEFORE: Simulated merchant checkout
 * AFTER: Connected to real CheckoutService
 */

import React, { useState } from 'react';
import { useBNPLCheckout } from '@/hooks/useBNPLCheckout';
import { CheckoutRequest } from '@/services/domain/types';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

export function MerchantCheckoutSimulator() {
  const { processCheckout, loading, error, response } = useBNPLCheckout();

  const [formData, setFormData] = useState({
    merchantId: 'merch_001',
    customerPhone: '+256701234567',
    orderAmount: 500_000,
    orderDescription: 'iPhone 14 Pro',
    tenor: 90,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const request: CheckoutRequest = {
      ...formData,
      idempotencyKey: crypto.randomUUID(),
    };

    await processCheckout(request);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-900">Merchant Checkout Simulator</h3>

      <form onSubmit={handleSubmit} className="space-y-3 bg-blue-50 p-4 rounded-lg">
        <div>
          <label className="block text-sm font-medium">Merchant ID</label>
          <input
            type="text"
            value={formData.merchantId}
            onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Customer Phone</label>
          <input
            type="text"
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Order Amount (UGX)</label>
          <input
            type="number"
            value={formData.orderAmount}
            onChange={(e) => setFormData({ ...formData, orderAmount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Tenor (Days)</label>
          <input
            type="number"
            value={formData.tenor}
            onChange={(e) => setFormData({ ...formData, tenor: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader className="inline mr-2 animate-spin" size={16} />
              Processing...
            </>
          ) : (
            'Process Checkout'
          )}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {response && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-3 mb-3">
            <CheckCircle className="text-green-600 flex-shrink-0" />
            <div className="text-green-800 font-medium">Checkout Approved!</div>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Contract ID:</strong> {response.contractId}</p>
            <p><strong>Approved Amount:</strong> UGX {response.approvedAmount.toLocaleString()}</p>
            <p><strong>Tenor:</strong> {response.tenor} days</p>
            <p><strong>Monthly Payment:</strong> UGX {response.installmentAmount.toLocaleString()}</p>
            <p><strong>Auth Token Valid For:</strong> {response.expiresIn} seconds</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * File: src/app/components/LenderPortfolioView.tsx
 * 
 * NEW: Real-time lender portfolio dashboard
 */

import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

export function LenderPortfolioView() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch lender portfolio from API
    const fetchPortfolio = async () => {
      try {
        const response = await fetch('/api/lender/portfolio');
        const data = await response.json();
        setPortfolio(data);
      } catch (err) {
        console.error('Portfolio fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPortfolio, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading portfolio...</div>;
  if (!portfolio) return <div>Portfolio not available</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-900">Active Portfolio</h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Disbursed</div>
          <div className="text-2xl font-bold text-blue-900">
            UGX {(portfolio.totalDisbursed / 1_000_000).toFixed(0)}M
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Outstanding</div>
          <div className="text-2xl font-bold text-amber-900">
            UGX {(portfolio.totalOutstanding / 1_000_000).toFixed(0)}M
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Collections</div>
          <div className="text-2xl font-bold text-green-900">
            UGX {(portfolio.totalPaid / 1_000_000).toFixed(0)}M
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Performance Metrics</h4>
          {portfolio.performance.par > 5 && (
            <AlertTriangle className="text-red-600" />
          )}
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="text-gray-600">Portfolio at Risk (30+ days):</span>
            <span className={portfolio.performance.par > 5 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
              {portfolio.performance.par.toFixed(2)}%
            </span>
          </p>
          <p>
            <span className="text-gray-600">Write-offs:</span>
            <span className="text-gray-900">UGX {(portfolio.performance.writeoffs / 1_000_000).toFixed(0)}M</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * File: src/app/components/EmployerDeductionsView.tsx
 * 
 * NEW: Real-time employer payroll deductions view
 */

import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

export function EmployerDeductionsView() {
  const [pendingDeductions, setPendingDeductions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const response = await fetch('/api/employer/deductions/pending');
        const data = await response.json();
        setPendingDeductions(data);
      } catch (err) {
        console.error('Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, []);

  if (loading) return <div>Loading deductions...</div>;
  if (!pendingDeductions) return <div>No pending deductions</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-900">Pending Payroll Deductions</h3>

      <div className="bg-blue-50 p-4 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          <span className="text-sm font-medium">Payroll Date: {new Date(pendingDeductions.payrollDate).toLocaleDateString()}</span>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          UGX {pendingDeductions.totalDeductions.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600">
          {pendingDeductions.numberOfDeductions} employee deductions
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Deduction Breakdown</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pendingDeductions.deductionDetails.slice(0, 10).map((deduction: any) => (
            <div key={deduction.contractId} className="flex justify-between text-sm border-b pb-2">
              <span className="text-gray-600">{deduction.contractId}</span>
              <span className="font-medium text-gray-900">UGX {deduction.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PART 4: NEXT STEPS FOR IMPLEMENTATION
// ============================================================================

/**
 * IMPLEMENTATION CHECKLIST
 * 
 * Phase 1: API Backend (Express/Node.js or similar)
 * ✅ Implement HTTP endpoints for /api/merchant/checkout/authorize, etc.
 * ✅ Wire services to database (PostgreSQL)
 * ✅ Add authentication (API keys, JWT, OAuth2)
 * ✅ Implement caching (Redis)
 * ✅ Setup event streaming (Kafka)
 * 
 * Phase 2: Frontend Integration
 * ✅ Create API client (fetch or Axios wrapper)
 * ✅ Implement custom hooks (useBNPLCheckout, useCreditDecision, etc.)
 * ✅ Refactor components (use real APIs instead of mock data)
 * ✅ Add loading/error states
 * ✅ Implement real-time updates (WebSocket for live portfolio)
 * 
 * Phase 3: Dashboard UX
 * ✅ Merchant dashboard (checkout history, settlements)
 * ✅ Lender dashboard (portfolio, performance, contracts)
 * ✅ Employer dashboard (employees, deductions, payroll)
 * ✅ Admin dashboard (KPIs, reconciliation, audit log)
 * ✅ Customer portal (contracts, limits, payments)
 * 
 * Phase 4: DevOps & Deployment
 * ✅ Docker containerization
 * ✅ Kubernetes manifests
 * ✅ Database migrations
 * ✅ Monitoring & alerts (Prometheus, Grafana)
 * ✅ CI/CD pipeline (GitHub Actions)
 */

export default {
  message: 'Service integration guide complete',
  nextSteps: [
    'Implement HTTP API layer in backend',
    'Replace mock data with real API calls',
    'Add React Query or SWR for data fetching',
    'Implement authentication flow',
    'Build responsive dashboards',
  ],
};
