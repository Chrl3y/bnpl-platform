// Contract lifecycle management service

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import type { 
  BNPLContract, 
  BNPLInstallment, 
  ContractState, 
  InstallmentStatus,
  EmployerDeductionInstruction,
  DeductionStatus
} from './types.tsx';
import { PRICING } from './types.tsx';
import { validateStateTransition } from './state-machine.tsx';
import { calculateTotalPayable, calculateInstallmentAmount } from './affordability-engine.tsx';
import { getPolicy, getLimit, updateAvailableLimit } from './policy-service.tsx';
import { createAuditLog } from './audit-service.tsx';

const CONTRACT_PREFIX = 'contract:';
const INSTALLMENT_PREFIX = 'installment:';
const DEDUCTION_PREFIX = 'deduction:';

/**
 * Create a new BNPL contract
 */
export async function createContract(data: {
  policy_number: string;
  merchant_id: string;
  order_id: string;
  principal_amount: number;
  tenor_months: 1 | 2 | 3;
  customer_id: string;
}): Promise<BNPLContract> {
  const contractId = uuidv4();
  const now = new Date().toISOString();

  // Validate policy exists and is active
  const policy = await getPolicy(data.policy_number);
  if (!policy) {
    throw new Error(`Policy ${data.policy_number} not found`);
  }
  if (policy.status !== 'ACTIVE') {
    throw new Error(`Policy ${data.policy_number} is not active`);
  }

  // Validate limit
  const limit = await getLimit(data.policy_number, data.tenor_months);
  if (!limit) {
    throw new Error(`No limit found for policy ${data.policy_number} with tenor ${data.tenor_months}`);
  }
  if (data.principal_amount > limit.available_amount) {
    throw new Error(
      `Amount ${data.principal_amount} exceeds available limit ${limit.available_amount}`
    );
  }

  // Calculate payment details
  const totalPayable = calculateTotalPayable(data.principal_amount, data.tenor_months);
  const installmentAmount = calculateInstallmentAmount(data.principal_amount, data.tenor_months);

  // Create contract
  const contract: BNPLContract = {
    id: contractId,
    policy_number: data.policy_number,
    customer_id: data.customer_id,
    merchant_id: data.merchant_id,
    order_id: data.order_id,
    principal_amount: data.principal_amount,
    tenor_months: data.tenor_months,
    interest_rate: PRICING.INTEREST_RATE,
    operational_fee_rate: PRICING.OPERATIONAL_FEE,
    collection_fee_rate: PRICING.COLLECTION_FEE,
    total_fee_rate: PRICING.TOTAL_MONTHLY_FEE,
    total_payable: totalPayable,
    installment_amount: installmentAmount,
    state: 'PRE_APPROVED' as ContractState,
    mifos_loan_id: null,
    pesapal_transaction_id: null,
    created_at: now,
    updated_at: now,
    authorized_at: null,
    disbursed_at: null,
    closed_at: null,
  };

  // Store contract
  await kv.set(`${CONTRACT_PREFIX}${contractId}`, JSON.stringify(contract));
  await kv.set(`${CONTRACT_PREFIX}order:${data.order_id}`, contractId);
  
  // Create installments
  await createInstallments(contract);

  // Update available limit
  await updateAvailableLimit(data.policy_number, data.tenor_months, -data.principal_amount);

  // Audit log
  await createAuditLog({
    entity_type: 'contract',
    entity_id: contractId,
    action: 'created',
    actor: 'system',
    changes: { contract },
  });

  return contract;
}

/**
 * Get contract by ID
 */
export async function getContract(contractId: string): Promise<BNPLContract | null> {
  const data = await kv.get(`${CONTRACT_PREFIX}${contractId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Get contract by order ID
 */
export async function getContractByOrderId(orderId: string): Promise<BNPLContract | null> {
  const contractId = await kv.get(`${CONTRACT_PREFIX}order:${orderId}`);
  if (!contractId) return null;
  return getContract(contractId);
}

/**
 * Update contract state with validation
 */
export async function updateContractState(
  contractId: string,
  newState: ContractState,
  actor: string,
  metadata?: Record<string, any>
): Promise<BNPLContract> {
  const contract = await getContract(contractId);
  if (!contract) {
    throw new Error(`Contract ${contractId} not found`);
  }

  // Validate state transition
  validateStateTransition(contract.state, newState);

  const oldState = contract.state;
  contract.state = newState;
  contract.updated_at = new Date().toISOString();

  // Update timestamps based on state
  if (newState === 'CUSTOMER_AUTHORIZED') {
    contract.authorized_at = contract.updated_at;
  } else if (newState === 'DISBURSED') {
    contract.disbursed_at = contract.updated_at;
  } else if (newState === 'CLOSED') {
    contract.closed_at = contract.updated_at;
    
    // Release limit when contract closes
    await updateAvailableLimit(contract.policy_number, contract.tenor_months, contract.principal_amount);
  }

  // Store updated contract
  await kv.set(`${CONTRACT_PREFIX}${contractId}`, JSON.stringify(contract));

  // Audit log
  await createAuditLog({
    entity_type: 'contract',
    entity_id: contractId,
    action: 'state_transition',
    actor,
    changes: { 
      old_state: oldState, 
      new_state: newState,
      metadata 
    },
  });

  return contract;
}

/**
 * Create installments for a contract
 */
async function createInstallments(contract: BNPLContract): Promise<void> {
  const startDate = new Date(contract.created_at);
  
  for (let i = 1; i <= contract.tenor_months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    // Set to last day of month (payroll typically processes at month end)
    dueDate.setDate(1);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(0);
    
    const installment: BNPLInstallment = {
      id: uuidv4(),
      contract_id: contract.id,
      installment_number: i,
      due_date: dueDate.toISOString(),
      amount_due: contract.installment_amount,
      amount_paid: 0,
      status: 'PENDING' as InstallmentStatus,
      deduction_id: null,
      paid_at: null,
    };
    
    await kv.set(`${INSTALLMENT_PREFIX}${contract.id}:${i}`, JSON.stringify(installment));
  }
}

/**
 * Get all installments for a contract
 */
export async function getInstallments(contractId: string): Promise<BNPLInstallment[]> {
  const contract = await getContract(contractId);
  if (!contract) return [];
  
  const installments: BNPLInstallment[] = [];
  for (let i = 1; i <= contract.tenor_months; i++) {
    const data = await kv.get(`${INSTALLMENT_PREFIX}${contractId}:${i}`);
    if (data) {
      installments.push(JSON.parse(data));
    }
  }
  
  return installments;
}

/**
 * Create employer deduction instruction
 */
export async function createDeductionInstruction(
  contractId: string,
  installmentNumber: number
): Promise<EmployerDeductionInstruction> {
  const contract = await getContract(contractId);
  if (!contract) {
    throw new Error(`Contract ${contractId} not found`);
  }

  const policy = await getPolicy(contract.policy_number);
  if (!policy) {
    throw new Error(`Policy ${contract.policy_number} not found`);
  }

  const installment = await kv.get(`${INSTALLMENT_PREFIX}${contractId}:${installmentNumber}`);
  if (!installment) {
    throw new Error(`Installment ${installmentNumber} not found for contract ${contractId}`);
  }

  const installmentData: BNPLInstallment = JSON.parse(installment);
  
  // Determine payroll cycle (YYYY-MM format)
  const dueDate = new Date(installmentData.due_date);
  const payrollCycle = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

  const deduction: EmployerDeductionInstruction = {
    id: uuidv4(),
    employer_id: policy.employer_id,
    payroll_employee_id: policy.payroll_employee_id,
    contract_id: contractId,
    installment_id: installmentData.id,
    amount: installmentData.amount_due,
    payroll_cycle: payrollCycle,
    status: 'SENT' as DeductionStatus,
    sent_at: new Date().toISOString(),
    executed_at: null,
  };

  await kv.set(`${DEDUCTION_PREFIX}${deduction.id}`, JSON.stringify(deduction));
  await kv.set(`${DEDUCTION_PREFIX}installment:${installmentData.id}`, deduction.id);

  // Update installment status
  installmentData.status = 'SENT_TO_EMPLOYER' as InstallmentStatus;
  installmentData.deduction_id = deduction.id;
  await kv.set(`${INSTALLMENT_PREFIX}${contractId}:${installmentNumber}`, JSON.stringify(installmentData));

  return deduction;
}

/**
 * Get pending deductions for an employer
 */
export async function getPendingDeductions(employerId: string): Promise<EmployerDeductionInstruction[]> {
  const allKeys = await kv.getByPrefix(`${DEDUCTION_PREFIX}`);
  const deductions: EmployerDeductionInstruction[] = [];
  
  for (const key of allKeys) {
    const data = await kv.get(key);
    if (data && !key.includes(':')) {
      const deduction: EmployerDeductionInstruction = JSON.parse(data);
      if (deduction.employer_id === employerId && deduction.status === 'SENT') {
        deductions.push(deduction);
      }
    }
  }
  
  return deductions;
}

/**
 * Record installment payment
 */
export async function recordInstallmentPayment(
  installmentId: string,
  amount: number,
  deductionId: string
): Promise<void> {
  // Find the installment
  const allKeys = await kv.getByPrefix(`${INSTALLMENT_PREFIX}`);
  
  for (const key of allKeys) {
    const data = await kv.get(key);
    if (data) {
      const installment: BNPLInstallment = JSON.parse(data);
      if (installment.id === installmentId) {
        installment.amount_paid += amount;
        installment.deduction_id = deductionId;
        installment.status = installment.amount_paid >= installment.amount_due 
          ? 'PAID' as InstallmentStatus
          : 'DEDUCTED' as InstallmentStatus;
        installment.paid_at = installment.status === 'PAID' ? new Date().toISOString() : null;
        
        await kv.set(key, JSON.stringify(installment));
        
        // Check if all installments are paid and close contract
        await checkAndCloseContract(installment.contract_id);
        break;
      }
    }
  }
}

/**
 * Check if all installments are paid and close contract
 */
async function checkAndCloseContract(contractId: string): Promise<void> {
  const installments = await getInstallments(contractId);
  const allPaid = installments.every(i => i.status === 'PAID');
  
  if (allPaid) {
    await updateContractState(contractId, 'CLOSED' as ContractState, 'system', {
      reason: 'All installments paid',
    });
  }
}

/**
 * Get contracts by policy number
 */
export async function getContractsByPolicy(policyNumber: string): Promise<BNPLContract[]> {
  const allKeys = await kv.getByPrefix(`${CONTRACT_PREFIX}`);
  const contracts: BNPLContract[] = [];
  
  for (const key of allKeys) {
    if (!key.includes(':')) {
      const data = await kv.get(key);
      if (data) {
        const contract: BNPLContract = JSON.parse(data);
        if (contract.policy_number === policyNumber) {
          contracts.push(contract);
        }
      }
    }
  }
  
  return contracts;
}
