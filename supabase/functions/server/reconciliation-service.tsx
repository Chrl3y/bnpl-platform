// Reconciliation service for payroll, Mifos X, and Pesapal

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import type { ReconciliationRecord } from './types.tsx';
import { createAuditLog } from './audit-service.tsx';

const RECON_PREFIX = 'reconciliation:';

/**
 * Reconcile payroll deductions with BNPL installments
 */
export async function reconcilePayrollDeductions(
  employerId: string,
  payrollCycle: string // YYYY-MM
): Promise<ReconciliationRecord> {
  const reconId = uuidv4();
  const now = new Date().toISOString();

  // Get all deductions for this employer and payroll cycle
  const { getPendingDeductions } = await import('./contract-service.tsx');
  const deductions = await getPendingDeductions(employerId);
  const cycleDeductions = deductions.filter(d => d.payroll_cycle === payrollCycle);

  // Calculate expected amount
  const expectedAmount = cycleDeductions.reduce((sum, d) => sum + d.amount, 0);

  // Get actual remittance (would be from employer remittance file/API)
  // For simulation, we'll check for remittance records
  const remittanceKey = `remittance:${employerId}:${payrollCycle}`;
  const remittanceData = await kv.get(remittanceKey);
  const actualAmount = remittanceData ? JSON.parse(remittanceData).total_amount : 0;

  const variance = expectedAmount - actualAmount;
  const status = Math.abs(variance) < 0.01 ? 'MATCHED' : 
                 actualAmount === 0 ? 'MISSING' : 'VARIANCE';

  const reconciliation: ReconciliationRecord = {
    id: reconId,
    type: 'PAYROLL',
    date: payrollCycle,
    expected_amount: expectedAmount,
    actual_amount: actualAmount,
    variance,
    status,
    details: {
      employer_id: employerId,
      payroll_cycle: payrollCycle,
      expected_deductions: cycleDeductions.length,
      deduction_ids: cycleDeductions.map(d => d.id),
    },
    created_at: now,
  };

  await kv.set(`${RECON_PREFIX}payroll:${reconId}`, JSON.stringify(reconciliation));
  await kv.set(`${RECON_PREFIX}payroll:${employerId}:${payrollCycle}`, reconId);

  await createAuditLog({
    entity_type: 'reconciliation',
    entity_id: reconId,
    action: 'payroll_reconciliation',
    actor: 'system',
    changes: { reconciliation },
  });

  return reconciliation;
}

/**
 * Reconcile BNPL ledger with Mifos X
 */
export async function reconcileMifosLedger(date: string): Promise<ReconciliationRecord> {
  const reconId = uuidv4();
  const now = new Date().toISOString();

  // Get all contracts
  const allContracts = await kv.getByPrefix('contract:');
  let bnplTotalOutstanding = 0;
  let mifosTotalOutstanding = 0;
  const contractDetails: any[] = [];

  for (const key of allContracts) {
    if (!key.includes(':')) {
      const contractData = await kv.get(key);
      if (contractData) {
        const contract = JSON.parse(contractData);
        if (contract.mifos_loan_id && contract.state !== 'CLOSED' && contract.state !== 'CANCELLED') {
          // Get BNPL balance
          const { getInstallments } = await import('./contract-service.tsx');
          const installments = await getInstallments(contract.id);
          const paid = installments.reduce((sum: number, i: any) => sum + i.amount_paid, 0);
          const bnplOutstanding = contract.total_payable - paid;
          bnplTotalOutstanding += bnplOutstanding;

          // Get Mifos balance
          const { getMifosLoanStatus } = await import('./mifos-service.tsx');
          try {
            const mifosStatus = await getMifosLoanStatus(contract.mifos_loan_id);
            mifosTotalOutstanding += mifosStatus.outstanding;

            contractDetails.push({
              contract_id: contract.id,
              mifos_loan_id: contract.mifos_loan_id,
              bnpl_outstanding: bnplOutstanding,
              mifos_outstanding: mifosStatus.outstanding,
              variance: Math.abs(bnplOutstanding - mifosStatus.outstanding),
            });
          } catch (error) {
            console.error(`Error getting Mifos status for ${contract.mifos_loan_id}:`, error);
          }
        }
      }
    }
  }

  const variance = Math.abs(bnplTotalOutstanding - mifosTotalOutstanding);
  const status = variance < 1 ? 'MATCHED' : 'VARIANCE';

  const reconciliation: ReconciliationRecord = {
    id: reconId,
    type: 'MIFOS',
    date,
    expected_amount: bnplTotalOutstanding,
    actual_amount: mifosTotalOutstanding,
    variance,
    status,
    details: {
      contracts_reconciled: contractDetails.length,
      contract_details: contractDetails,
    },
    created_at: now,
  };

  await kv.set(`${RECON_PREFIX}mifos:${reconId}`, JSON.stringify(reconciliation));
  await kv.set(`${RECON_PREFIX}mifos:${date}`, reconId);

  await createAuditLog({
    entity_type: 'reconciliation',
    entity_id: reconId,
    action: 'mifos_reconciliation',
    actor: 'system',
    changes: { reconciliation },
  });

  return reconciliation;
}

/**
 * Reconcile Pesapal settlements with BNPL ledger
 */
export async function reconcilePesapalSettlements(date: string): Promise<ReconciliationRecord> {
  const reconId = uuidv4();
  const now = new Date().toISOString();

  // Get all Pesapal transactions for the date
  const allTransactions = await kv.getByPrefix('pesapal:');
  let expectedSettlement = 0;
  let actualSettlement = 0;
  const transactionDetails: any[] = [];

  for (const key of allTransactions) {
    if (!key.includes(':')) {
      const txnData = await kv.get(key);
      if (txnData) {
        const txn = JSON.parse(txnData);
        const txnDate = txn.created_at.split('T')[0];
        
        if (txnDate === date && txn.type === 'RELEASE' && txn.status === 'SUCCESS') {
          expectedSettlement += txn.amount;
          // In production, would check actual settlement from Pesapal settlement report
          actualSettlement += txn.amount; // Simulated as matching
          
          transactionDetails.push({
            transaction_id: txn.id,
            contract_id: txn.contract_id,
            amount: txn.amount,
            pesapal_tracking_id: txn.pesapal_tracking_id,
          });
        }
      }
    }
  }

  const variance = Math.abs(expectedSettlement - actualSettlement);
  const status = variance < 0.01 ? 'MATCHED' : 'VARIANCE';

  const reconciliation: ReconciliationRecord = {
    id: reconId,
    type: 'PESAPAL',
    date,
    expected_amount: expectedSettlement,
    actual_amount: actualSettlement,
    variance,
    status,
    details: {
      transactions_count: transactionDetails.length,
      transactions: transactionDetails,
    },
    created_at: now,
  };

  await kv.set(`${RECON_PREFIX}pesapal:${reconId}`, JSON.stringify(reconciliation));
  await kv.set(`${RECON_PREFIX}pesapal:${date}`, reconId);

  await createAuditLog({
    entity_type: 'reconciliation',
    entity_id: reconId,
    action: 'pesapal_reconciliation',
    actor: 'system',
    changes: { reconciliation },
  });

  return reconciliation;
}

/**
 * Get reconciliation record by ID
 */
export async function getReconciliation(reconId: string): Promise<ReconciliationRecord | null> {
  const keys = await kv.getByPrefix(RECON_PREFIX);
  
  for (const key of keys) {
    const data = await kv.get(key);
    if (data) {
      const recon = JSON.parse(data);
      if (recon.id === reconId) {
        return recon;
      }
    }
  }
  
  return null;
}

/**
 * Get all reconciliation records by type and date range
 */
export async function getReconciliations(
  type?: 'PAYROLL' | 'MIFOS' | 'PESAPAL',
  startDate?: string,
  endDate?: string
): Promise<ReconciliationRecord[]> {
  const prefix = type ? `${RECON_PREFIX}${type.toLowerCase()}:` : RECON_PREFIX;
  const keys = await kv.getByPrefix(prefix);
  const records: ReconciliationRecord[] = [];

  for (const key of keys) {
    if (!key.includes(':') || key.split(':').length === 2) {
      const data = await kv.get(key);
      if (data) {
        try {
          const recon = JSON.parse(data);
          if (recon.id) { // Ensure it's a reconciliation record, not a reference
            const reconDate = recon.date;
            
            if ((!startDate || reconDate >= startDate) && (!endDate || reconDate <= endDate)) {
              records.push(recon);
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return records.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Get reconciliation summary/statistics
 */
export async function getReconciliationSummary(): Promise<{
  total_reconciliations: number;
  matched: number;
  variance: number;
  missing: number;
  total_variance_amount: number;
  by_type: Record<string, { total: number; matched: number; variance_amount: number }>;
}> {
  const allRecons = await getReconciliations();
  
  const summary = {
    total_reconciliations: 0,
    matched: 0,
    variance: 0,
    missing: 0,
    total_variance_amount: 0,
    by_type: {
      PAYROLL: { total: 0, matched: 0, variance_amount: 0 },
      MIFOS: { total: 0, matched: 0, variance_amount: 0 },
      PESAPAL: { total: 0, matched: 0, variance_amount: 0 },
    },
  };

  for (const recon of allRecons) {
    summary.total_reconciliations++;
    
    if (recon.status === 'MATCHED') summary.matched++;
    else if (recon.status === 'VARIANCE') summary.variance++;
    else if (recon.status === 'MISSING') summary.missing++;
    
    summary.total_variance_amount += Math.abs(recon.variance);
    
    const typeStats = summary.by_type[recon.type];
    typeStats.total++;
    if (recon.status === 'MATCHED') typeStats.matched++;
    typeStats.variance_amount += Math.abs(recon.variance);
  }

  return summary;
}

/**
 * Daily reconciliation job (should be scheduled)
 */
export async function runDailyReconciliation(): Promise<{
  payroll_recons: number;
  mifos_recon: ReconciliationRecord;
  pesapal_recon: ReconciliationRecord;
}> {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7); // YYYY-MM
  
  // Run Mifos reconciliation
  const mifosRecon = await reconcileMifosLedger(today);
  
  // Run Pesapal reconciliation
  const pesapalRecon = await reconcilePesapalSettlements(today);
  
  // Payroll reconciliation is done per employer
  // For now, just count how many would be needed
  const employers = await kv.getByPrefix('employer:');
  
  return {
    payroll_recons: employers.length,
    mifos_recon: mifosRecon,
    pesapal_recon: pesapalRecon,
  };
}
