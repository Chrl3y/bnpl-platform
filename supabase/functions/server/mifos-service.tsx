// Mifos X integration service

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import type { BNPLContract } from './types.tsx';
import { createAuditLog } from './audit-service.tsx';

const MIFOS_PREFIX = 'mifos:';

// Mifos X configuration (read from environment in production)
const MIFOS_BASE_URL = Deno.env.get('MIFOS_BASE_URL') || 'https://demo.mifos.io/fineract-provider/api/v1';
const MIFOS_TENANT = Deno.env.get('MIFOS_TENANT') || 'default';
const MIFOS_USERNAME = Deno.env.get('MIFOS_USERNAME') || 'mifos';
const MIFOS_PASSWORD = Deno.env.get('MIFOS_PASSWORD') || 'password';

/**
 * Create loan in Mifos X after BNPL contract is authorized
 */
export async function createMifosLoan(contract: BNPLContract): Promise<string> {
  // In production, this would call actual Mifos X REST API
  // For this prototype, we simulate the loan creation
  
  const mifosLoanId = await simulateCreateLoan(contract);
  
  // Store mapping
  await kv.set(`${MIFOS_PREFIX}contract:${contract.id}`, mifosLoanId);
  await kv.set(`${MIFOS_PREFIX}loan:${mifosLoanId}`, contract.id);
  
  await createAuditLog({
    entity_type: 'mifos_loan',
    entity_id: mifosLoanId,
    action: 'created',
    actor: 'system',
    changes: { 
      contract_id: contract.id,
      mifos_loan_id: mifosLoanId,
      principal: contract.principal_amount,
      tenor: contract.tenor_months 
    },
  });
  
  return mifosLoanId;
}

/**
 * Post repayment to Mifos X
 */
export async function postMifosRepayment(
  mifosLoanId: string,
  amount: number,
  transactionDate: string,
  paymentType: string = 'PAYROLL_DEDUCTION'
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const transactionId = await simulatePostRepayment(
      mifosLoanId,
      amount,
      transactionDate,
      paymentType
    );
    
    await createAuditLog({
      entity_type: 'mifos_repayment',
      entity_id: transactionId,
      action: 'posted',
      actor: 'system',
      changes: {
        mifos_loan_id: mifosLoanId,
        amount,
        transaction_date: transactionDate,
        payment_type: paymentType,
      },
    });
    
    return { success: true, transactionId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get loan status from Mifos X
 */
export async function getMifosLoanStatus(mifosLoanId: string): Promise<{
  principal: number;
  outstanding: number;
  paid: number;
  status: string;
}> {
  return simulateGetLoanStatus(mifosLoanId);
}

/**
 * Reconcile BNPL ledger with Mifos X
 */
export async function reconcileWithMifos(contractId: string): Promise<{
  matched: boolean;
  bnpl_balance: number;
  mifos_balance: number;
  variance: number;
}> {
  const mifosLoanId = await kv.get(`${MIFOS_PREFIX}contract:${contractId}`);
  if (!mifosLoanId) {
    throw new Error(`No Mifos loan found for contract ${contractId}`);
  }
  
  // Get BNPL contract status
  const { getContract, getInstallments } = await import('./contract-service.tsx');
  const contract = await getContract(contractId);
  if (!contract) {
    throw new Error(`Contract ${contractId} not found`);
  }
  
  const installments = await getInstallments(contractId);
  const bnplPaid = installments.reduce((sum, inst) => sum + inst.amount_paid, 0);
  const bnplOutstanding = contract.total_payable - bnplPaid;
  
  // Get Mifos status
  const mifosStatus = await getMifosLoanStatus(mifosLoanId);
  const mifosOutstanding = mifosStatus.outstanding;
  
  const variance = Math.abs(bnplOutstanding - mifosOutstanding);
  const matched = variance < 0.01; // Allow 1 cent variance for rounding
  
  return {
    matched,
    bnpl_balance: bnplOutstanding,
    mifos_balance: mifosOutstanding,
    variance,
  };
}

// ========== SIMULATION FUNCTIONS (Replace with real Mifos X API in production) ==========

async function simulateCreateLoan(contract: BNPLContract): Promise<string> {
  // Simulate Mifos X loan creation
  const mifosLoanId = `MIFOS-${Date.now()}-${Math.random().toString(36).substring(7)}`.toUpperCase();
  
  console.log(`[MIFOS] Creating loan ${mifosLoanId} for contract ${contract.id}`);
  console.log(`[MIFOS] Principal: ${contract.principal_amount}, Tenor: ${contract.tenor_months} months`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Store loan details in KV for simulation
  const loanDetails = {
    loan_id: mifosLoanId,
    client_id: contract.customer_id,
    principal: contract.principal_amount,
    total_payable: contract.total_payable,
    installment_amount: contract.installment_amount,
    number_of_repayments: contract.tenor_months,
    disbursed_on: new Date().toISOString().split('T')[0],
    outstanding_balance: contract.total_payable,
    total_paid: 0,
    status: 'ACTIVE',
  };
  
  await kv.set(`${MIFOS_PREFIX}loan_details:${mifosLoanId}`, JSON.stringify(loanDetails));
  
  console.log(`[MIFOS] Loan ${mifosLoanId} created successfully`);
  return mifosLoanId;
}

async function simulatePostRepayment(
  mifosLoanId: string,
  amount: number,
  transactionDate: string,
  paymentType: string
): Promise<string> {
  const transactionId = `MIFOS-TXN-${Date.now()}`;
  
  console.log(`[MIFOS] Posting repayment to loan ${mifosLoanId}`);
  console.log(`[MIFOS] Amount: ${amount}, Date: ${transactionDate}, Type: ${paymentType}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Update loan details
  const loanDetailsData = await kv.get(`${MIFOS_PREFIX}loan_details:${mifosLoanId}`);
  if (loanDetailsData) {
    const loanDetails = JSON.parse(loanDetailsData);
    loanDetails.total_paid += amount;
    loanDetails.outstanding_balance -= amount;
    
    if (loanDetails.outstanding_balance <= 0) {
      loanDetails.status = 'CLOSED';
      loanDetails.outstanding_balance = 0;
    }
    
    await kv.set(`${MIFOS_PREFIX}loan_details:${mifosLoanId}`, JSON.stringify(loanDetails));
  }
  
  console.log(`[MIFOS] Repayment ${transactionId} posted successfully`);
  return transactionId;
}

async function simulateGetLoanStatus(mifosLoanId: string): Promise<{
  principal: number;
  outstanding: number;
  paid: number;
  status: string;
}> {
  const loanDetailsData = await kv.get(`${MIFOS_PREFIX}loan_details:${mifosLoanId}`);
  
  if (!loanDetailsData) {
    throw new Error(`Loan ${mifosLoanId} not found in Mifos`);
  }
  
  const loanDetails = JSON.parse(loanDetailsData);
  
  return {
    principal: loanDetails.principal,
    outstanding: loanDetails.outstanding_balance,
    paid: loanDetails.total_paid,
    status: loanDetails.status,
  };
}

/**
 * Batch post repayments (for employer remittance processing)
 */
export async function batchPostRepayments(
  repayments: Array<{
    mifos_loan_id: string;
    amount: number;
    transaction_date: string;
  }>
): Promise<{
  successful: number;
  failed: number;
  results: Array<{ loan_id: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ loan_id: string; success: boolean; error?: string }> = [];
  let successful = 0;
  let failed = 0;
  
  for (const repayment of repayments) {
    const result = await postMifosRepayment(
      repayment.mifos_loan_id,
      repayment.amount,
      repayment.transaction_date
    );
    
    if (result.success) {
      successful++;
      results.push({ loan_id: repayment.mifos_loan_id, success: true });
    } else {
      failed++;
      results.push({ 
        loan_id: repayment.mifos_loan_id, 
        success: false, 
        error: result.error 
      });
    }
  }
  
  return { successful, failed, results };
}
