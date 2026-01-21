/**
 * Hierarchical Domain Types - Mifos X Style
 * Organizations (Centers) → Employers (Groups) → Employees (Clients)
 * 
 * This extends the base types with hierarchical structure for:
 * - Multi-country support
 * - Organization/Market management
 * - Employer grouping
 * - Employee client profiles with transaction history
 */

// ============================================================================
// HIERARCHICAL ENTITIES
// ============================================================================

/**
 * Organization/Center
 * Top-level entity representing a market, region, or organization
 * Examples: "Uganda Market", "Kenya Operations", "East Africa Division"
 */
export interface Organization {
  id: string;
  name: string;
  country: string;
  region?: string;
  adminEmail: string;
  adminPhone: string;
  headquartersAddress: string;
  
  // Status
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  
  // Hierarchy
  employerCount: number;
  employeeCount: number;
  
  // Metrics
  metrics: {
    totalDisbursed: number; // UGX
    totalOutstanding: number; // UGX
    totalCollected: number; // UGX
    activeContracts: number;
    defaultedContracts: number;
    portfolioAtRisk: number; // % 0-100
  };
  
  // Configuration
  config: {
    defaultCreditTierRatio: {
      tier1: number; // 0.40 = 40%
      tier2: number; // 0.30 = 30%
      tier3: number; // 0.20 = 20%
    };
    maxTenorMonths: number;
    minOrderAmount: number; // UGX
    maxOrderAmount: number; // UGX
  };
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Employer/Group
 * Mid-level entity representing a business, institution, or group
 * Belongs to an Organization
 */
export interface EmployerGroup {
  id: string;
  organizationId: string;
  
  // Basic Info
  name: string;
  industry: string; // E.g., "Manufacturing", "Healthcare", "Financial Services"
  businessRegistration: string;
  
  // Contact
  email: string;
  phone: string;
  address: string;
  
  // Financial Details
  bankAccount: {
    accountNumber: string;
    bankCode: string;
    bankName: string;
  };
  
  // Payroll
  payrollCycle: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'BI_WEEKLY';
  payrollDayOfMonth?: number; // 1-31 for monthly
  payrollDayOfWeek?: number; // 0-6 for weekly
  totalEmployees: number;
  
  // Risk & Status
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
  creditRating?: number; // 1-5 stars
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isActive: boolean;
  
  // Hierarchy
  employeeCount: number;
  
  // Metrics
  metrics: {
    totalEmployeeDisbursed: number; // UGX
    totalEmployeeOutstanding: number; // UGX
    averageEmployeeSalary: number; // UGX
    employeeRetention: number; // % 0-100
    portfolioAtRisk: number; // % 0-100
  };
  
  // Configuration
  config: {
    deductionLimit: number; // % of salary
    maxEmployeeCreditLimit: number; // UGX
    allowedTenorMonths: number[];
  };
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

/**
 * Employee/Client
 * Individual employee with KYC, CRB, transaction history
 * Belongs to an EmployerGroup
 */
export interface EmployeeClient {
  id: string;
  organizationId: string;
  employerGroupId: string;
  
  // Personal Details
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'OTHER';
  
  // Employment
  employmentNumber: string;
  jobTitle: string;
  department: string;
  netSalary: number; // UGX
  salaryFrequency: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  
  // Address
  residentialAddress: string;
  city: string;
  
  // Verification Status
  kyc: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    verifiedAt?: Date;
    verifiedBy?: string;
    documents: {
      nationalIdImage?: string;
      profilePhoto?: string;
      addressProof?: string;
    };
  };
  
  crb: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_FOUND';
    score?: number; // 0-1000
    verifiedAt?: Date;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'; // Based on score
  };
  
  // Credit Profile
  riskTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  creditLimit: number; // UGX - derived from salary × tier ratio
  availableLimit: number; // UGX - creditLimit - outstandingBalance
  
  // Deductions
  existingDeductions: {
    total: number; // UGX/month
    items: Array<{
      id: string;
      description: string;
      amount: number;
      frequency: 'MONTHLY' | 'ONE_TIME';
    }>;
  };
  
  // Transaction History
  transactions: EmployeeTransaction[];
  
  // Loan Schedule
  activeLoans: EmployeeLoanSchedule[];
  
  // Status
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';
  isActive: boolean;
  
  // Preferences
  preferences: {
    notificationEmail: boolean;
    notificationSMS: boolean;
    receiveOffers: boolean;
  };
  
  // Metrics
  metrics: {
    totalBorrowed: number; // UGX - lifetime
    totalRepaid: number; // UGX - lifetime
    activeLoans: number;
    closedLoans: number;
    defaultedLoans: number;
    repaymentRate: number; // % 0-100
    portfolioAtRisk: number; // % 0-100
  };
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Employee Transaction
 * Complete transaction history for an employee (all contract-related events)
 */
export interface EmployeeTransaction {
  id: string;
  employeeId: string;
  contractId: string;
  
  type: 'CHECKOUT' | 'APPROVAL' | 'DISBURSEMENT' | 'REPAYMENT' | 'REVERSAL' | 'DEFAULT' | 'SETTLEMENT' | 'REFUND';
  
  description: string;
  
  // Financial
  amount: number; // UGX
  currency: 'UGX';
  
  // Reference
  referenceNumber: string;
  merchantName?: string;
  orderAmount?: number;
  tenor?: number; // months
  
  // Status
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  
  // Merchant/Lender
  lenderId?: string;
  lenderName?: string;
  
  // Timestamps
  initiatedAt: Date;
  completedAt?: Date;
  
  // Audit
  channel: 'API' | 'ADMIN' | 'PORTAL' | 'PAYROLL';
  notes?: string;
}

/**
 * Employee Loan Schedule
 * Repayment schedule for active/closed loans
 */
export interface EmployeeLoanSchedule {
  id: string;
  employeeId: string;
  contractId: string;
  
  // Loan Details
  loanAmount: number; // UGX
  tenor: number; // months
  interestRate: number; // % per month or total
  
  // Disbursement
  disbursedAmount: number; // UGX
  disbursedDate: Date;
  
  // Repayment
  repaymentSchedule: RepaymentInstallment[];
  
  // Summary
  totalPaid: number; // UGX
  totalDue: number; // UGX
  nextDueDate?: Date;
  nextDueAmount?: number; // UGX
  
  // Status
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  isOnTrack: boolean;
  daysInArrears: number;
  
  // Timestamps
  createdAt: Date;
  closedAt?: Date;
}

/**
 * Repayment Installment
 * Individual payment in a loan schedule
 */
export interface RepaymentInstallment {
  installmentNumber: number;
  dueDate: Date;
  dueAmount: number; // UGX
  paidAmount: number; // UGX
  paidDate?: Date;
  status: 'DUE' | 'PAID' | 'OVERDUE' | 'WAIVED';
  daysOverdue: number;
}

/**
 * KYC Verification
 * KYC verification entity for employee portal
 */
export interface KYCVerification {
  id: string;
  employeeId: string;
  
  // Personal Info
  fullName: string;
  nationalId: string;
  dateOfBirth: Date;
  
  // Document Upload
  documents: {
    nationalIdFront?: {
      url: string;
      uploadedAt: Date;
    };
    nationalIdBack?: {
      url: string;
      uploadedAt: Date;
    };
    profilePhoto?: {
      url: string;
      uploadedAt: Date;
    };
    addressProof?: {
      url: string;
      uploadedAt: Date;
    };
  };
  
  // Verification
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  
  // Audit
  submittedAt: Date;
  updatedAt: Date;
}

/**
 * CRB Verification
 * Credit Reference Bureau verification for employee portal
 */
export interface CRBVerification {
  id: string;
  employeeId: string;
  
  // CRB Details
  nationalId: string;
  phoneNumber: string;
  
  // Verification
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
  
  // Results
  crbScore?: number; // 0-1000
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  defaultHistoryCount?: number;
  activeLoansCount?: number;
  totalOutstandingCredit?: number;
  
  // Raw Response (from CRB provider)
  rawResponse?: Record<string, any>;
  
  // Timestamps
  requestedAt: Date;
  verifiedAt?: Date;
  expiresAt?: Date;
  
  // Audit
  crbProvider: string; // E.g., "FINCA_CRB"
}

/**
 * Employee Portal Session
 * Track employee login and portal access
 */
export interface EmployeePortalSession {
  id: string;
  employeeId: string;
  
  // Device Info
  userAgent: string;
  ipAddress: string;
  device: string; // E.g., "iPhone", "Chrome", "Firefox"
  
  // Session
  sessionToken: string;
  expiresAt: Date;
  
  // Activity
  loginAt: Date;
  logoutAt?: Date;
  lastActivityAt: Date;
  
  // Status
  isActive: boolean;
}

/**
 * Employee Portal Activity
 * Track employee portal interactions for audit
 */
export interface EmployeePortalActivity {
  id: string;
  employeeId: string;
  sessionId: string;
  
  // Activity
  action: 'LOGIN' | 'LOGOUT' | 'VIEW_PROFILE' | 'UPDATE_PROFILE' | 'SUBMIT_KYC' | 'REQUEST_CRB' | 'VIEW_LOANS' | 'VIEW_TRANSACTIONS' | 'APPLY_LOAN' | 'ERROR';
  
  description: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  
  // Timestamps
  timestamp: Date;
}

/**
 * Dashboard Metrics
 * Pre-calculated metrics for dashboard display
 */
export interface DashboardMetrics {
  timeframe: 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
  asOf: Date;
  
  disbursements: {
    count: number;
    amount: number;
    trend: number; // % change from previous period
  };
  
  repayments: {
    count: number;
    amount: number;
    trend: number;
  };
  
  defaults: {
    count: number;
    amount: number;
    rate: number; // % of total outstanding
  };
  
  collections: {
    rate: number; // % 0-100
    trend: number; // % change
  };
  
  portfolioHealth: {
    portfolioAtRisk: number; // % 0-100
    averageDelinquency: number; // days
    riskDistribution: {
      low: number; // % 0-100
      medium: number;
      high: number;
    };
  };
  
  customerAcquisition: {
    newCustomers: number;
    trend: number; // % change
  };
  
  activeContracts: number;
  closedContracts: number;
}

/**
 * Dashboard View Config
 * Configuration for different dashboard views
 */
export interface DashboardViewConfig {
  type: 'ORGANIZATION' | 'EMPLOYER_GROUP' | 'EMPLOYEE';
  
  widgets: Array<{
    id: string;
    name: string;
    type: 'KPI' | 'CHART' | 'TABLE' | 'MAP' | 'TIMELINE';
    enabled: boolean;
    position: number;
  }>;
  
  dateRange: {
    preset: 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';
    customStart?: Date;
    customEnd?: Date;
  };
  
  filters?: Record<string, any>;
}
