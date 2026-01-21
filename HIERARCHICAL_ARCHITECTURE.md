# Hierarchical Architecture: Organizations → Employers → Employees

## Overview

The BNPL Platform now implements a **Mifos X-style hierarchical architecture** for multi-level ecosystem management:

```
Organizations (Centers)
    ├── Employer Groups (Groups)
    │   ├── Employees (Clients)
    │   ├── Transaction History
    │   ├── Loan Schedules
    │   └── Verification Status
    │
    ├── Portfolio Analytics
    ├── Risk Management
    └── Compliance & Audit
```

---

## Hierarchy Levels

### Level 1: Organizations (Centers)

**What it represents:** Markets, regions, or operational centers

**Example:** "Uganda Market", "Kenya Operations", "Tanzania Expansion"

**Scope:**
- Multiple employer groups
- Thousands of employees
- Billions in transaction volume
- Multi-country operations

**Dashboards show:**
- Total disbursed (lifetime)
- Outstanding balance (active portfolio)
- Collections & repayments
- Portfolio at risk (PAR)
- Active vs. defaulted contracts
- Risk distribution (Low/Medium/High)
- Key metrics: Collection rate, average loan size, new employees

**Key metrics:**
```typescript
interface Organization {
  totalDisbursed: number;      // UGX 125B+
  totalOutstanding: number;    // UGX 87.5B
  totalCollected: number;      // UGX 37.5B
  activeContracts: number;     // 1,250
  defaultedContracts: number;  // 47
  portfolioAtRisk: number;     // 3.8%
}
```

---

### Level 2: Employer Groups (Groups)

**What it represents:** Individual employers, institutions, or companies

**Example:** "Uganda Revenue Authority", "Stanbic Bank Uganda", "Kampala City Council"

**Scope:**
- Hundreds to thousands of employees
- Millions in active portfolio
- Specific payroll cycle & deduction rules
- Industry-specific risk profile

**Dashboards show:**
- Employee roster with verification status
- KYC completion rate
- CRB verification status
- Active loans per employee
- Total disbursed to employees
- Average repayment rate
- Risk tier distribution
- Salary distribution chart
- Risk matrix (salary vs. borrowed)

**Key metrics:**
```typescript
interface EmployerGroup {
  employeeCount: number;                    // 450
  totalEmployeeDisbursed: number;          // UGX 45B
  totalEmployeeOutstanding: number;        // UGX 30B
  averageEmployeeSalary: number;           // UGX 2.2M
  employeeRetention: number;               // % 0-100
  portfolioAtRisk: number;                 // % 0-100
  kycApprovalRate: number;                 // % 0-100
  crbVerificationRate: number;             // % 0-100
}
```

---

### Level 3: Employees (Clients)

**What it represents:** Individual employees with complete financial profiles

**Example:** "Grace Namusoke (URA-45821)", "Michael Kamya (URA-45822)"

**Scope:**
- Personal credit profile
- Transaction history
- Active & closed loans
- Repayment schedule
- Verification status (KYC, CRB)
- Existing deductions & limits

**Dashboards show:**
- Credit profile (limit, available, used)
- Deduction summary
- Transaction history (all types)
- Active loan details with schedule
- Repayment trends (paid vs. due)
- Verification status (KYC approved, CRB score)
- Risk tier & borrowing capacity
- Next payment due

**Key metrics:**
```typescript
interface EmployeeClient {
  // Credit Profile
  creditLimit: number;           // UGX 1M (40% of salary)
  availableLimit: number;        // UGX 400K
  usedLimit: number;             // UGX 600K
  
  // Transactions
  transactions: EmployeeTransaction[]; // Checkout, disbursement, repayment, reversal
  
  // Loans
  activeLoans: EmployeeLoanSchedule[]; // Current loans with schedule
  
  // Metrics
  totalBorrowed: number;         // Lifetime
  totalRepaid: number;           // Lifetime
  activeLoans: number;           // Count
  closedLoans: number;           // Count
  defaultedLoans: number;        // Count
  repaymentRate: number;         // % 0-100
  portfolioAtRisk: number;       // % 0-100
}
```

---

## Data Model

### Transaction Types (Employee Level)

```typescript
enum TransactionType {
  CHECKOUT = 'CHECKOUT',             // Loan application approved
  APPROVAL = 'APPROVAL',             // Formal loan approval
  DISBURSEMENT = 'DISBURSEMENT',     // Funds sent to merchant
  REPAYMENT = 'REPAYMENT',           // Employee payment
  REVERSAL = 'REVERSAL',             // Transaction reversed
  DEFAULT = 'DEFAULT',               // Payment missed/default
  SETTLEMENT = 'SETTLEMENT',         // Employer/platform settlement
  REFUND = 'REFUND',                 // Refund processed
}
```

### Loan Schedule (Employee Level)

```typescript
interface EmployeeLoanSchedule {
  id: string;
  employeeId: string;
  contractId: string;
  
  // Loan Terms
  loanAmount: number;        // UGX 1M
  tenor: number;             // 3 months
  interestRate: number;      // 0% (platform handles cost)
  
  // Repayment Schedule
  repaymentSchedule: RepaymentInstallment[];
  
  // Status
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  isOnTrack: boolean;
  daysInArrears: number;
  
  // Summary
  totalPaid: number;
  totalDue: number;
  nextDueDate?: Date;
  nextDueAmount?: number;
}

interface RepaymentInstallment {
  installmentNumber: number;
  dueDate: Date;
  dueAmount: number;
  paidAmount: number;
  paidDate?: Date;
  status: 'DUE' | 'PAID' | 'OVERDUE' | 'WAIVED';
  daysOverdue: number;
}
```

### Verification Entities (Employee Level)

```typescript
// KYC Verification (for onboarding)
interface KYCVerification {
  employeeId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  documents: {
    nationalIdFront?: File;
    nationalIdBack?: File;
    profilePhoto?: File;
    addressProof?: File;
  };
  verifiedAt?: Date;
  verifiedBy?: string;
}

// CRB Verification (credit check)
interface CRBVerification {
  employeeId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
  crbScore?: number;           // 0-1000
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  defaultHistoryCount?: number;
  activeLoansCount?: number;
  totalOutstandingCredit?: number;
  verifiedAt?: Date;
}
```

---

## Component Architecture

### Hierarchical Dashboard Components

| Component | Level | Purpose |
|-----------|-------|---------|
| **OptimizedHomePage** | All | Multi-level overview, quick actions, platform health |
| **OrganizationDashboard** | Level 1 | Center overview, employer groups list, metrics |
| **EmployerGroupDashboard** | Level 2 | Group overview, employee roster, verification status |
| **EmployeeClientDashboard** | Level 3 | Individual profile, transaction history, loan schedule |
| **EmployeePortal** | Level 3 | Self-serve onboarding, KYC upload, CRB check |

### Data Flow

```
User accesses home page
    ↓
Home page shows 4 organizations (Uganda, Kenya, Tanzania, Rwanda)
    ↓
User clicks "Uganda Market"
    ↓
OrganizationDashboard shows:
  - Total portfolio metrics
  - 450 employer groups
  - 45,250 employees
  - Portfolio health (PAR, collections, etc.)
    ↓
User clicks "Uganda Revenue Authority" (employer group)
    ↓
EmployerGroupDashboard shows:
  - 450 employees with profiles
  - KYC status for each
  - CRB status for each
  - Active loans per employee
  - Salary distribution
    ↓
User clicks "Grace Namusoke" (employee)
    ↓
EmployeeClientDashboard shows:
  - Personal profile
  - Credit limit (UGX 1M)
  - Available limit (UGX 400K)
  - Transaction history (last 10)
  - Active loans with schedule
  - Repayment trends
```

---

## Employee Portal (Onboarding)

### 5-Step Onboarding Flow

```
1. WELCOME
   ├── Explain benefits (fast approval, secure, easy)
   └── "Get Started" button
   
2. PERSONAL INFORMATION
   ├── First name, last name
   ├── Email, phone
   ├── National ID
   ├── Date of birth
   ├── Residential address
   └── Continue → Next step
   
3. KYC VERIFICATION (Document Upload)
   ├── National ID (front)
   ├── National ID (back)
   ├── Profile photo (selfie)
   └── Submit documents
   
4. CRB VERIFICATION (Credit Check)
   ├── Explain why we need CRB
   ├── Show what will be checked:
   │   ├── Credit history
   │   ├── Existing loans
   │   ├── Repayment performance
   │   └── CRB score
   └── "Authorize CRB Check" → instant verification
   
5. COMPLETE ✓
   ├── Show results:
   │   ├── ✓ KYC Verified
   │   ├── ✓ CRB Score: 820/1000 (Excellent!)
   │   └── ✓ Credit Ready: UGX 1,000,000 limit
   └── Quick actions:
       ├── Go to Dashboard
       └── Apply for Your First Loan
```

---

## Key Dashboards

### Home Page (Multi-level Overview)

Shows:
- 4 key statistics (Total Platform Value, Active Employers, Active Employees, Monthly Transactions)
- 4 quick action cards (View Organizations, Onboard Employer, Manage Employees, Analytics)
- Platform health metrics (PAR, Repayment Rate, Processing Speed, KYC Completion)
- 4 recent organizations (each showing employers, employees, total value)
- Top 10 employer groups (table with collections rate, PAR)
- 6 platform capabilities

### Organization Dashboard (Level 1)

Shows:
- KPI cards: Total Disbursed, Outstanding, Collected, Portfolio at Risk
- Charts: Disbursement trend, Risk distribution pie chart
- Employer groups table: Compare metrics across groups
- Summary stats: Collection rate, avg loan size, new employees

### Employer Dashboard (Level 2)

Shows:
- KPI cards: Total Employees, Active Loans, Total Disbursed, Repayment Rate
- Charts: Salary distribution, Risk matrix (salary vs. borrowed)
- Employees table: Search/filter, KYC status, CRB status, repayment %
- Summary stats: Verified employees, CRB verified, average salary

### Employee Dashboard (Level 3)

Shows:
- Profile header with employment details
- KPI cards: Credit Limit, Available, Used, Deductions
- Tabs:
  - **Profile:** Verification status (KYC, CRB), quick actions
  - **Transactions:** Complete transaction history with filters
  - **Schedule:** Repayment trend chart, next payment, installment table
  - **Loans:** Active loan details with monthly payments

### Employee Portal

Shows:
- 5-step onboarding wizard
- Document upload for KYC
- CRB verification authorization
- Completion confirmation with credit limit

---

## Data Storage Recommendations

### Collections

```typescript
// Organizations
db.organizations.insertOne({
  _id: 'org-uganda',
  name: 'Uganda Market',
  country: 'Uganda',
  metrics: { totalDisbursed: 125_000_000, ... },
  config: { defaultCreditTierRatio: { tier1: 0.40, ... } }
});

// Employer Groups
db.employerGroups.insertOne({
  _id: 'emp-ura',
  organizationId: 'org-uganda',
  name: 'Uganda Revenue Authority',
  employeeCount: 450,
  metrics: { totalEmployeeDisbursed: 45_000_000, ... }
});

// Employee Clients
db.employeeClients.insertOne({
  _id: 'emp-client-001',
  organizationId: 'org-uganda',
  employerGroupId: 'emp-ura',
  firstName: 'Grace',
  lastName: 'Namusoke',
  nationalId: 'CM123456789',
  netSalary: 2_500_000,
  creditLimit: 1_000_000,
  kyc: { status: 'APPROVED', verifiedAt: Date, ... },
  crb: { status: 'APPROVED', score: 820, ... }
});

// Employee Transactions
db.employeeTransactions.insertOne({
  _id: 'txn-001',
  employeeId: 'emp-client-001',
  contractId: 'ctr-2024-001925',
  type: 'DISBURSEMENT',
  amount: 400_000,
  status: 'COMPLETED',
  initiatedAt: Date,
  completedAt: Date
});

// Employee Loan Schedules
db.employeeLoanSchedules.insertOne({
  _id: 'sched-001',
  employeeId: 'emp-client-001',
  contractId: 'ctr-2024-001925',
  loanAmount: 1_000_000,
  tenor: 3,
  repaymentSchedule: [
    { installmentNumber: 1, dueDate: Date, dueAmount: 333_333, ... },
    ...
  ]
});

// KYC Verifications
db.kycVerifications.insertOne({
  _id: 'kyc-001',
  employeeId: 'emp-client-001',
  status: 'APPROVED',
  documents: { nationalIdFront: 's3://...', ... },
  verifiedAt: Date
});

// CRB Verifications
db.crbVerifications.insertOne({
  _id: 'crb-001',
  employeeId: 'emp-client-001',
  status: 'COMPLETED',
  crbScore: 820,
  riskLevel: 'LOW',
  verifiedAt: Date
});
```

---

## API Endpoints (Hierarchical)

### Organization Level
- `GET /api/v1/organizations` - List all organizations
- `GET /api/v1/organizations/:orgId` - Get organization details
- `GET /api/v1/organizations/:orgId/dashboard` - Organization dashboard data
- `GET /api/v1/organizations/:orgId/metrics` - Organization metrics

### Employer Group Level
- `GET /api/v1/organizations/:orgId/employer-groups` - List employer groups in org
- `GET /api/v1/employer-groups/:groupId` - Get employer group details
- `GET /api/v1/employer-groups/:groupId/dashboard` - Group dashboard data
- `GET /api/v1/employer-groups/:groupId/employees` - List employees in group
- `GET /api/v1/employer-groups/:groupId/metrics` - Group metrics

### Employee Level
- `GET /api/v1/employees/:employeeId` - Get employee details
- `GET /api/v1/employees/:employeeId/dashboard` - Employee dashboard
- `GET /api/v1/employees/:employeeId/transactions` - Transaction history
- `GET /api/v1/employees/:employeeId/loan-schedules` - Loan schedules
- `GET /api/v1/employees/:employeeId/credit-profile` - Credit limits & deductions

### Employee Portal (Onboarding)
- `POST /api/v1/portal/onboarding/start` - Start onboarding
- `POST /api/v1/portal/personal-info` - Submit personal info
- `POST /api/v1/portal/kyc/upload` - Upload KYC documents
- `POST /api/v1/portal/crb/authorize` - Authorize CRB check
- `GET /api/v1/portal/status/:sessionId` - Check onboarding status

---

## Benefits of Hierarchical Architecture

| Benefit | Description |
|---------|-------------|
| **Scalability** | Manages millions of employees across hundreds of employers |
| **Clarity** | Clear ownership levels: org → employer → employee |
| **Analytics** | Drill-down dashboards at each level |
| **Operations** | Easy to manage, monitor, and troubleshoot |
| **Compliance** | Audit trail at each level |
| **Business Logic** | Different rules per organization/employer |
| **Multi-country** | Easy to add new markets/organizations |
| **Portfolio Management** | View aggregate and individual portfolios |
| **Risk Management** | Monitor risk at each hierarchy level |

---

## Next Steps

1. **Database Schema** - Implement MongoDB collections for all hierarchical entities
2. **API Implementation** - Build REST/GraphQL endpoints for each level
3. **Authorization** - Add role-based access control (org admin, group admin, employee)
4. **Reporting** - Create export reports at each level
5. **Real Data Integration** - Connect to real employer payroll systems
6. **Analytics** - Advanced analytics and business intelligence dashboards
7. **Mobile App** - Employee portal as mobile app
8. **Notifications** - Real-time alerts for key events (loan approved, payment due, etc.)

---

**Status:** ✅ Hierarchical architecture components created and integrated
