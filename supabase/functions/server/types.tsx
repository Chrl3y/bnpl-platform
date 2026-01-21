// Core domain types for BNPL platform

export enum ContractState {
  PRE_APPROVED = 'PRE_APPROVED',
  DEDUCTION_REQUESTED = 'DEDUCTION_REQUESTED',
  CUSTOMER_AUTHORIZED = 'CUSTOMER_AUTHORIZED',
  ESCROW_HELD = 'ESCROW_HELD',
  DISBURSED = 'DISBURSED',
  IN_REPAYMENT = 'IN_REPAYMENT',
  CLOSED = 'CLOSED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  SENT_TO_EMPLOYER = 'SENT_TO_EMPLOYER',
  DEDUCTED = 'DEDUCTED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum DeductionStatus {
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
}

export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLACKLISTED = 'BLACKLISTED',
}

export interface EmployerPolicy {
  policy_number: string;
  employer_id: string;
  payroll_employee_id: string;
  phone_number: string;
  net_salary: number;
  status: PolicyStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerAuth {
  policy_number: string;
  phone_number: string;
  pin_hash: string;
  last_verified_at: string | null;
  failed_attempts: number;
  locked_until: string | null;
}

export interface BNPLCustomer {
  id: string;
  national_id: string;
  phone_number: string;
  full_name: string;
  employer_id: string;
  payroll_employee_id: string;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface BNPLLimit {
  id: string;
  customer_id: string;
  policy_number: string;
  tenor_months: 1 | 2 | 3;
  max_amount: number;
  available_amount: number;
  last_calculated_at: string;
}

export interface BNPLContract {
  id: string;
  policy_number: string;
  customer_id: string;
  merchant_id: string;
  order_id: string;
  principal_amount: number;
  tenor_months: 1 | 2 | 3;
  interest_rate: number; // 7%
  operational_fee_rate: number; // 2%
  collection_fee_rate: number; // 3%
  total_fee_rate: number; // 12%
  total_payable: number;
  installment_amount: number;
  state: ContractState;
  mifos_loan_id: string | null;
  pesapal_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  authorized_at: string | null;
  disbursed_at: string | null;
  closed_at: string | null;
}

export interface BNPLInstallment {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: InstallmentStatus;
  deduction_id: string | null;
  paid_at: string | null;
}

export interface EmployerDeductionInstruction {
  id: string;
  employer_id: string;
  payroll_employee_id: string;
  contract_id: string;
  installment_id: string;
  amount: number;
  payroll_cycle: string; // YYYY-MM
  status: DeductionStatus;
  sent_at: string;
  executed_at: string | null;
}

export interface Employer {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  mou_signed: boolean;
  payroll_integration_type: 'API' | 'FILE';
  api_key_hash: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export interface Merchant {
  id: string;
  name: string;
  api_key_hash: string;
  webhook_url: string | null;
  settlement_bank_account: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export interface MerchantOrder {
  id: string;
  merchant_id: string;
  policy_number: string;
  amount: number;
  items: OrderItem[];
  status: 'PENDING_AUTH' | 'AUTHORIZED' | 'DELIVERED' | 'REFUNDED' | 'CANCELLED';
  contract_id: string | null;
  created_at: string;
  authorized_at: string | null;
  delivered_at: string | null;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PesapalTransaction {
  id: string;
  contract_id: string;
  amount: number;
  type: 'HOLD' | 'RELEASE' | 'REFUND';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  pesapal_tracking_id: string;
  merchant_reference: string;
  created_at: string;
  completed_at: string | null;
}

export interface USSDSession {
  id: string;
  phone_number: string;
  session_id: string;
  policy_number: string;
  contract_id: string;
  state: 'INIT' | 'PIN_ENTRY' | 'VERIFIED' | 'FAILED' | 'TIMEOUT';
  created_at: string;
  expires_at: string;
}

export interface ReconciliationRecord {
  id: string;
  type: 'PAYROLL' | 'MIFOS' | 'PESAPAL';
  date: string;
  expected_amount: number;
  actual_amount: number;
  variance: number;
  status: 'MATCHED' | 'VARIANCE' | 'MISSING';
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  changes: Record<string, unknown>;
  timestamp: string;
}

// Pricing constants (NON-NEGOTIABLE)
export const PRICING = {
  INTEREST_RATE: 0.07, // 7%
  OPERATIONAL_FEE: 0.02, // 2%
  COLLECTION_FEE: 0.03, // 3%
  TOTAL_MONTHLY_FEE: 0.12, // 12%
};

// Business rules
export const BUSINESS_RULES = {
  ALLOWED_TENORS: [1, 2, 3] as const,
  MAX_DEBT_SERVICE_RATIO: 0.33, // Max 33% of net salary
  MIN_NET_SALARY: 15000, // Minimum salary requirement
  USSD_PIN_TIMEOUT_SECONDS: 300, // 5 minutes
  MAX_PIN_ATTEMPTS: 3,
  PIN_LOCKOUT_DURATION_HOURS: 24,
};
