/**
 * Core Domain Types for BNPL Platform
 * Multi-lender marketplace orchestration system
 */

// ============================================================================
// IDENTITIES & REGISTRY
// ============================================================================

export interface Employer {
  id: string;
  name: string;
  country: 'Uganda';
  payrollCycle: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  paymentGateway: string;
  bankAccount: {
    accountNumber: string;
    bankCode: string;
  };
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
  isActive: boolean;
  createdAt: Date;
}

export interface Employee {
  id: string;
  employerId: string;
  nationalId: string;
  phoneNumber: string;
  netSalary: number; // UGX
  deductionLimit: number; // Max monthly deductions (UGX)
  existingDeductions: DeductionInstruction[];
  riskTier: 'TIER_1' | 'TIER_2' | 'TIER_3'; // Based on salary, CRB, history
  kyc: {
    verified: boolean;
    verifiedAt?: Date;
  };
  isActive: boolean;
  createdAt: Date;
}

export interface Merchant {
  id: string;
  businessName: string;
  country: 'Uganda';
  mcc: string; // Merchant Category Code
  settlementAccount: {
    accountNumber: string;
    bankCode: string;
  };
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
  dailyLimit: number; // UGX
  monthlyVolume: number; // UGX
  isActive: boolean;
  createdAt: Date;
}

export interface Lender {
  id: string;
  name: string;
  type: 'BANK' | 'MFI' | 'SACCO' | 'FINTECH' | 'FUND';
  country: 'Uganda';
  capitalLimit: number; // Total available UGX
  capitalUtilized: number; // Currently deployed
  products: LenderProduct[];
  riskAppetite: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  isActive: boolean;
  createdAt: Date;
}

export interface LenderProduct {
  id: string;
  lenderId: string;
  productName: string;
  minAmount: number; // UGX
  maxAmount: number; // UGX
  tenor: number; // Days
  interestRate: number; // % p.a.
  processingFee: number; // UGX or %
  riskTierEligibility: ('TIER_1' | 'TIER_2' | 'TIER_3')[];
  employerRestrictions?: string[]; // Lender may serve only specific employers
  isActive: boolean;
}

// ============================================================================
// BNPL CONTRACT LIFECYCLE
// ============================================================================

export type BNPLContractState =
  | 'PRE_APPROVED'
  | 'ORDER_CREATED'
  | 'CUSTOMER_AUTHORIZED'
  | 'FUNDED'
  | 'IN_REPAYMENT'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DEFAULTED';

export interface BNPLContract {
  id: string;
  employeeId: string;
  merchantId: string;
  lenderId: string;
  mifosLoanId?: string; // Link to Mifos X loan (after creation)
  
  // Order Details
  orderAmount: number; // UGX (principal)
  tenor: number; // Days
  interestRate: number; // % p.a.
  processingFee: number; // UGX
  totalPayable: number; // UGX
  installmentAmount: number; // UGX per month
  
  // State Machine
  state: BNPLContractState;
  stateTransitionHistory: StateTransition[];
  
  // Payment Tracking
  installments: BNPLInstallment[];
  totalPaid: number; // UGX
  totalDue: number; // UGX
  pastDueAmount: number; // UGX
  
  // Timestamps
  createdAt: Date;
  authorizedAt?: Date;
  fundedAt?: Date;
  closedAt?: Date;
}

export interface StateTransition {
  fromState: BNPLContractState;
  toState: BNPLContractState;
  reason: string;
  timestamp: Date;
  triggeredBy: string; // System or user
}

export interface BNPLInstallment {
  id: string;
  contractId: string;
  installmentNumber: number;
  dueDate: Date;
  amount: number; // UGX
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'WRITTEN_OFF';
  paidDate?: Date;
  paidAmount?: number;
}

// ============================================================================
// CHECKOUT & AUTHORIZATION
// ============================================================================

export interface CheckoutRequest {
  merchantId: string;
  customerPhone: string;
  orderAmount: number; // UGX
  orderDescription: string;
  tenor: number; // Requested tenor in days
  idempotencyKey: string; // Prevent duplicate processing
}

export interface CreditDecision {
  employeeId: string;
  approved: boolean;
  approvedAmount: number; // UGX
  tenor: number;
  interestRate: number;
  processingFee: number;
  assignedLenderId: string;
  reasoning: string;
  confidenceScore: number; // 0-100
  timestamp: Date;
}

export interface AuthorizationResponse {
  contractId: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING_REVIEW';
  approvedAmount: number; // UGX
  tenor: number;
  installmentAmount: number; // UGX
  authToken: string; // For customer confirmation
  expiresIn: number; // Seconds
}

// ============================================================================
// MULTI-LENDER ALLOCATION
// ============================================================================

export interface LenderAllocationRequest {
  employeeId: string;
  employerId: string;
  amount: number; // UGX
  tenor: number;
  riskTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
}

export interface LenderAllocationResult {
  lenderId: string;
  assignedAmount: number; // UGX
  allocationStrategy: 'ROUND_ROBIN' | 'RISK_WEIGHTED' | 'EMPLOYER_EXCLUSIVE' | 'PRIORITY';
  reason: string;
}

// ============================================================================
// PAYMENT & SETTLEMENT
// ============================================================================

export interface SettlementInstruction {
  id: string;
  merchantId: string;
  contractId: string;
  amount: number; // UGX (what merchant receives)
  fees: {
    processingFee: number;
    collectionFee: number;
  };
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  paymentGatewayRef?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface RefundRequest {
  contractId: string;
  orderId: string;
  refundAmount: number; // UGX
  reason: 'MERCHANT_CANCELLATION' | 'DELIVERY_FAILURE' | 'CUSTOMER_REQUEST' | 'OTHER';
  idempotencyKey: string;
}

export interface InternalLedgerEntry {
  id: string;
  contractId: string;
  type: 'DISBURSEMENT' | 'REPAYMENT' | 'FEE' | 'REVERSAL' | 'ADJUSTMENT';
  amount: number; // UGX (signed: +/-)
  account: string; // Merchant, Employee, Lender, Platform
  reference: string;
  timestamp: Date;
}

// ============================================================================
// EMPLOYER & PAYROLL
// ============================================================================

export interface DeductionInstruction {
  id: string;
  employeeId: string;
  contractId: string;
  monthlyDeduction: number; // UGX
  startDate: Date;
  endDate: Date;
  status: 'ACTIVE' | 'PENDING_PAYROLL' | 'COMPLETED' | 'FAILED';
  payrollCycleRemittance?: PayrollRemittance;
}

export interface PayrollRemittance {
  id: string;
  employerId: string;
  payrollDate: Date;
  totalDeductions: number; // UGX
  numberOfDeductions: number;
  deductionDetails: {
    contractId: string;
    amount: number;
  }[];
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'POSTED' | 'FAILED';
  remittanceReference?: string;
  createdAt: Date;
}

export interface EmployeePayrollRecord {
  employeeId: string;
  payrollCycle: Date;
  netSalary: number; // UGX
  deductions: {
    contractId: string;
    amount: number;
  }[];
  totalDeductions: number; // UGX
  netAfterDeductions: number; // UGX
}

// ============================================================================
// MIFOS X INTEGRATION
// ============================================================================

export interface MifosLoanCreationRequest {
  clientId: string; // Mifos client
  loanProductId: string;
  principal: number; // UGX
  tenor: number; // Days
  interestRate: number;
  expectedDisbursalDate: Date;
}

export interface MifosLoanLink {
  bnplContractId: string;
  mifosLoanId: string;
  mifosClientId: string;
  status: 'CREATED' | 'DISBURSED' | 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  linkedAt: Date;
}

export interface RepaymentPosting {
  bnplContractId: string;
  mifosLoanId: string;
  amount: number; // UGX
  paymentDate: Date;
  reference: string;
  postedAt?: Date;
  status: 'PENDING' | 'POSTED' | 'FAILED';
}

// ============================================================================
// CRB & RISK ASSESSMENT
// ============================================================================

export interface CRBCheckRequest {
  nationalId: string;
  phoneNumber: string;
}

export interface CRBCheckResult {
  employeeId: string;
  score: number; // 0-1000
  riskFlags: string[];
  overallStatus: 'CLEAN' | 'WARNING' | 'HIGH_RISK';
  lastCheckDate: Date;
}

// ============================================================================
// RECONCILIATION
// ============================================================================

export interface ReconciliationRecord {
  id: string;
  contractId: string;
  expectedAmount: number; // UGX
  actualAmount: number; // UGX
  variance: number; // UGX
  varianceReason?: string;
  status: 'MATCHED' | 'VARIANCE' | 'PENDING' | 'DISPUTE';
  resolvedAt?: Date;
  recordDate: Date;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface NotificationEvent {
  id: string;
  type: 'APPROVAL' | 'AUTHORIZATION_REQUEST' | 'PAYMENT_CONFIRMATION' | 'DEDUCTION_NOTICE' | 'ALERT';
  recipientPhone: string;
  message: string;
  contractId?: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  createdAt: Date;
  sentAt?: Date;
}
