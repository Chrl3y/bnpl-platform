# BNPL Platform - Service Architecture

Complete multi-lender payment orchestration system for Uganda market.

## 🏗️ Project Structure

```
src/
├── services/
│   ├── domain/              # Domain logic & state management
│   │   ├── types.ts         # Core data types & interfaces
│   │   ├── StateMachine.ts  # Contract lifecycle state machine
│   │   ├── CreditEngine.ts  # Real-time affordability calculation
│   │   └── MultiLenderAllocationEngine.ts  # Lender selection logic
│   │
│   ├── api/                 # API services (business logic)
│   │   ├── CheckoutService.ts       # Merchant checkout (CRITICAL PATH, <1s)
│   │   ├── PaymentSettlementService.ts  # Money movement & ledger
│   │   ├── EmployerPayrollService.ts    # Payroll integration
│   │   └── routes.ts        # API endpoint definitions
│   │
│   └── integrations/        # External system adapters
│       └── MifosXAdapter.ts  # Mifos X integration (system of record)
│
├── docs/
│   └── ARCHITECTURE.md      # Complete system documentation
│
└── app/
    └── App.tsx              # React UI (will connect to these services)
```

## 🚀 Quick Start

### 1. Domain Layer - Understanding the Core Types

All domain types are defined in `src/services/domain/types.ts`. These represent the key business entities:

```typescript
import {
  Employer,
  Employee,
  Merchant,
  Lender,
  BNPLContract,
  CreditDecision,
  AuthorizationResponse,
} from '@/services/domain/types';
```

**Key entities:**
- `Employer`: Employer record with payroll details
- `Employee`: Employee record with salary and risk tier
- `Merchant`: Merchant/business applying for BNPL
- `Lender`: Lender providing capital
- `BNPLContract`: The actual BNPL deal created for each purchase

### 2. State Machine - Contract Lifecycle

Every contract follows a strict state machine:

```typescript
import { ContractStateMachine } from '@/services/domain/StateMachine';

// Check if transition is allowed
const canTransition = ContractStateMachine.canTransition('FUNDED', 'IN_REPAYMENT'); // true
const canTransition = ContractStateMachine.canTransition('FUNDED', 'PRE_APPROVED'); // false

// Perform transition
const result = ContractStateMachine.transitionState(
  contract,
  'IN_REPAYMENT',
  'Repayment started',
  'SYSTEM'
);

if (result.success) {
  // Updated contract with new state and history
  console.log(result.contract.state); // 'IN_REPAYMENT'
}
```

**Valid transitions:**
```
PRE_APPROVED → ORDER_CREATED → CUSTOMER_AUTHORIZED → FUNDED → IN_REPAYMENT → CLOSED
```

### 3. Credit Engine - Real-Time Affordability

Calculate how much customer can borrow:

```typescript
import { CreditEngine, CreditCheckInput } from '@/services/domain/CreditEngine';

const creditInput: CreditCheckInput = {
  employee: {
    id: 'emp_123',
    riskTier: 'TIER_1',
    netSalary: 1_500_000, // UGX
    existingDeductions: [],
    // ... other fields
  },
  employer: {
    id: 'emp_org_456',
    payrollCycle: 'MONTHLY',
    // ... other fields
  },
  requestedAmount: 500_000,
  requestedTenor: 90, // days
  crbScore: 750,      // out of 1000
  activeContracts: [], // existing active loans
};

const decision = CreditEngine.makeDecision(creditInput);
console.log(decision);
// {
//   approved: true,
//   approvedAmount: 500000,
//   tenor: 90,
//   interestRate: 0.36,      // 36% p.a.
//   processingFee: 5000,     // UGX
//   assignedLenderId: '',    // To be set by allocator
//   reasoning: 'Approved. Salary: UGX 1500000. Max capacity: UGX 500000. Tier: TIER_1. CRB: 750/1000.',
//   confidenceScore: 85,
//   timestamp: Date
// }
```

**How affordability works:**
- **Deduction ratio** by tier: TIER_1=40%, TIER_2=30%, TIER_3=20% of salary
- **Available capacity** = (Salary × Ratio) - Existing Deductions
- **CRB adjustment**: Score 800+ = no adjustment, 650-800 = 90%, 500-650 = 70%, <500 = 50%
- **Tenor limits**: TIER_1=6mo, TIER_2=4mo, TIER_3=3mo

### 4. Multi-Lender Allocation - Pick the Best Lender

Route contract to the best lender based on strategy:

```typescript
import { MultiLenderAllocationEngine } from '@/services/domain/MultiLenderAllocationEngine';

const allocation = MultiLenderAllocationEngine.allocate({
  lenders: [equityBank, standardChartered, cooperativeBank], // Array of Lender objects
  requestedAmount: 500_000,
  tenor: 90,
  riskTier: 'TIER_1',
  employerId: 'emp_org_456',
  strategy: 'RISK_WEIGHTED', // Options: ROUND_ROBIN, RISK_WEIGHTED, EMPLOYER_EXCLUSIVE, PRIORITY
});

console.log(allocation);
// {
//   lenderId: 'lender_equity_001',
//   assignedAmount: 500000,
//   allocationStrategy: 'RISK_WEIGHTED',
//   reason: 'Tier TIER_1 routed to Equity Bank (MODERATE appetite, 65% utilized).'
// }
```

**Strategies:**
- **ROUND_ROBIN**: Spread load evenly across lenders
- **RISK_WEIGHTED**: High-risk customers → conservative lenders, low-risk → aggressive
- **EMPLOYER_EXCLUSIVE**: Specific employers partner with specific lenders
- **PRIORITY**: Respect lender preferences/priority

### 5. Checkout Service - The Critical Path (<1 second)

This is where it all comes together:

```typescript
import CheckoutService from '@/services/api/CheckoutService';

const checkoutRequest = {
  merchantId: 'merch_techstore_001',
  customerPhone: '+256701234567',
  orderAmount: 500_000, // UGX
  orderDescription: 'iPhone 14 Pro',
  tenor: 90,
  idempotencyKey: 'uuid-1234-5678', // For idempotency
};

const result = await CheckoutService.processCheckout(checkoutRequest, {
  // Inject dependencies
  merchantRepo: { get: async (id) => { /* ... */ } },
  employeeRepo: { getByPhone: async (phone) => { /* ... */ } },
  employerRepo: { get: async (id) => { /* ... */ } },
  lenderRepo: { getAll: async () => { /* ... */ } },
  contractRepo: { create: async (contract) => { /* ... */ } },
  crbService: { check: async (id, phone) => { /* ... */ } },
  idempotencyCache: { get: async (key) => { /* ... */ }, set: async (k, v) => { /* ... */ } },
  eventBus: { publish: async (event) => { /* ... */ } },
});

if (result.success) {
  console.log('Checkout approved!');
  console.log(result.data);
  // {
  //   contractId: 'contract_abc123',
  //   status: 'APPROVED',
  //   approvedAmount: 500000,
  //   tenor: 90,
  //   installmentAmount: 168000,    // Monthly payment
  //   authToken: 'base64token',
  //   expiresIn: 900                // 15 minutes
  // }
} else {
  console.log('Checkout declined:', result.error);
}
```

**What happens internally (all in <1 second):**
1. Validates merchant
2. Validates order (amount, tenor range)
3. Looks up employee by phone
4. Checks existing contracts
5. Runs credit decision (affordability)
6. Allocates to best lender
7. Creates contract (FUNDED state)
8. Returns auth token
9. **ASYNC (doesn't block):** Creates Mifos loan, sends SMS, logs audit

### 6. Payment Settlement - Money Movement

After delivery confirmed:

```typescript
import PaymentSettlementService from '@/services/api/PaymentSettlementService';

// Settle merchant (pay them for the order)
const settlement = await PaymentSettlementService.settleMerchant(
  'contract_abc123',
  'idempotency-key-xyz',
  deps
);

if (settlement.success) {
  console.log('Merchant paid:', settlement.settlementId);
}

// Process refund (customer returned item)
const refund = await PaymentSettlementService.processRefund(
  {
    contractId: 'contract_abc123',
    orderId: 'order_xyz',
    refundAmount: 500_000,
    reason: 'DELIVERY_FAILURE',
    idempotencyKey: 'refund-key-123',
  },
  deps
);

// Post payroll remittance (employer sends deductions)
const remittance = {
  id: 'remit_jan_2024',
  employerId: 'emp_org_456',
  payrollDate: new Date('2024-01-31'),
  totalDeductions: 45_000_000,
  numberOfDeductions: 1200,
  deductionDetails: [
    { contractId: 'contract_abc123', amount: 168_000 },
    // ... more
  ],
  status: 'PENDING',
  createdAt: new Date(),
};

const result = await PaymentSettlementService.postPayrollRemittance(remittance, deps);
console.log(`Matched ${result.matchedCount} deductions`);
```

**Key principle:** ALL financial operations are IDEMPOTENT
- Call twice with same `idempotencyKey` → get same result (not charged twice)
- Critical for payment gateways

### 7. Employer & Payroll Integration

Upload employees and process deductions:

```typescript
import EmployerPayrollService from '@/services/api/EmployerPayrollService';

// Bulk upload employees
const csvData = `phone,nationalId,netSalary
+256701234567,12345678,1500000
+256702345678,87654321,2000000`;

const uploadResult = await EmployerPayrollService.bulkUploadEmployees(
  'emp_org_456',
  csvData,
  deps
);

console.log(uploadResult);
// { totalRows: 2, successCount: 2, errorCount: 0, errors: [] }

// Get pending deductions for next payroll
const pending = await EmployerPayrollService.preparePendingDeductions(
  'emp_org_456',
  new Date('2024-02-01'),
  deps
);

console.log(pending);
// {
//   id: 'remit_feb_2024',
//   employerId: 'emp_org_456',
//   payrollDate: Date('2024-02-01'),
//   totalDeductions: 45000000,  // Total to deduct from all employees
//   numberOfDeductions: 1200,
//   deductionDetails: [
//     { contractId: 'contract_abc123', amount: 168000 },
//     ...
//   ],
//   status: 'PENDING'
// }
```

### 8. Mifos X Integration

Sync with microfinance accounting system:

```typescript
import MifosXAdapter from '@/services/integrations/MifosXAdapter';

// Create loan in Mifos (async, after BNPL contract created)
const mifosResult = await MifosXAdapter.createMifosLoan('contract_abc123', deps);

if (mifosResult.success) {
  console.log('Loan created in Mifos:', mifosResult.mifosLoanId);
}

// Post repayment when payroll received
const posting = await MifosXAdapter.postRepayment(
  'contract_abc123',
  168_000,           // Amount paid
  new Date(),        // Payment date
  'payroll_jan_2024', // Reference
  deps
);

// Check Mifos loan status
const status = await MifosXAdapter.checkLoanStatus('contract_abc123', deps);
console.log(`Mifos status: ${status.status}, Balance: ${status.balance}`);

// Daily reconciliation job
const reconciliation = await MifosXAdapter.reconcileContracts(allContracts, deps);
console.log(`Reconciled ${reconciliation.reconciled}, Found ${reconciliation.discrepancies.length} discrepancies`);
```

**Key principle:** Mifos is NOT the decision engine
- BNPL makes all credit decisions
- Mifos just records what BNPL decided
- If Mifos is down, BNPL still approves checkouts
- Reconciliation jobs sync discrepancies later

## 📊 API Routes

See `src/services/api/routes.ts` for complete API specification.

**Key endpoints:**

```
MERCHANT:
  POST   /api/merchant/checkout/authorize          (CRITICAL PATH, <1s)
  POST   /api/merchant/orders/:id/confirm-delivery
  POST   /api/merchant/orders/:id/refund

CUSTOMER:
  POST   /api/customer/authenticate
  GET    /api/customer/limits
  GET    /api/customer/contracts
  POST   /api/customer/authorize-contract/:id

EMPLOYER:
  POST   /api/employer/register
  POST   /api/employer/employees/upload
  GET    /api/employer/deductions/pending
  POST   /api/employer/remittance

LENDER:
  POST   /api/lender/register
  POST   /api/lender/products
  GET    /api/lender/portfolio
  GET    /api/lender/contracts

ADMIN:
  GET    /api/admin/dashboard
  POST   /api/admin/reconciliation/run
```

## 🔒 Security & Compliance

- **Authentication:** OAuth2 for employers/lenders, OTP for customers, API keys for merchants
- **Idempotency:** All financial ops cached for 24 hours
- **Audit trail:** Every action logged (immutable ledger)
- **PII redaction:** Phone numbers hashed in logs, national IDs masked
- **Rate limiting:** Merchants=100 req/min, Lenders=1000 req/min

## 📈 Scaling

**Microservices that scale independently:**
- Checkout API: 10-100 instances (CPU-bound)
- Credit Engine: 5-50 instances (CPU-bound)
- Payment Settlement: 5-50 instances (I/O-bound)
- Notification Service: 5-50 instances (queue-driven)

**Infrastructure:**
- PostgreSQL for transactional data
- Redis for caching, sessions, idempotency
- Kafka/Pulsar for event streaming
- Kubernetes for orchestration
- Multi-region deployment ready

## 🧪 Testing

All services have clear interfaces for dependency injection, enabling easy mocking:

```typescript
// Mock repositories for testing
const mockDeps = {
  merchantRepo: { get: jest.fn(() => mockMerchant) },
  employeeRepo: { getByPhone: jest.fn(() => mockEmployee) },
  // ...
};

const result = await CheckoutService.processCheckout(request, mockDeps);
expect(result.success).toBe(true);
```

## 📚 Complete Documentation

See `src/docs/ARCHITECTURE.md` for:
- System overview and principles
- All 9 core domains explained
- Complete data model
- Failure handling & resilience patterns
- Deployment & scalability architecture
- Mental model for developers

---

**Version:** 1.0  
**Last Updated:** 2024-01-01  
**Status:** Ready for implementation
