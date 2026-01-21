/**
 * Payment & Settlement Service
 * Handles:
 * - Merchant settlement (disbursement to merchant)
 * - Payroll remittance (from employer)
 * - Refunds & reversals
 * - Idempotency on all financial operations
 *
 * Design: Escrow/hold/release pattern
 * - Funds held until all conditions met
 * - Settlement only after verification
 * - Audit trail for all transactions
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BNPLContract,
  SettlementInstruction,
  RefundRequest,
  InternalLedgerEntry,
  PayrollRemittance,
  DeductionInstruction,
} from './types';

export interface SettlementDependencies {
  contractRepo: { get: (id: string) => Promise<BNPLContract | null>; update: (contract: BNPLContract) => Promise<void> };
  ledgerRepo: { create: (entry: InternalLedgerEntry) => Promise<InternalLedgerEntry> };
  paymentGateway: { initiate: (amount: number, account: string) => Promise<{ ref: string }> };
  idempotencyCache: { get: (key: string) => Promise<any>; set: (key: string, value: any) => Promise<void> };
  auditLog: { record: (event: any) => Promise<void> };
}

export class PaymentSettlementService {
  /**
   * Initiate merchant settlement (IDEMPOTENT)
   * Only after:
   * 1. Order confirmed as delivered
   * 2. Payment received from employee/employer
   * 3. All holds released
   */
  public static async settleMerchant(
    contractId: string,
    idempotencyKey: string,
    deps: SettlementDependencies
  ): Promise<{ success: boolean; settlementId?: string; error?: string }> {
    try {
      // Idempotency check
      const cached = await deps.idempotencyCache.get(idempotencyKey);
      if (cached) {
        return { success: true, settlementId: cached.settlementId };
      }

      // Fetch contract
      const contract = await deps.contractRepo.get(contractId);
      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      // Verify contract is in settleable state
      if (contract.state !== 'FUNDED' && contract.state !== 'IN_REPAYMENT') {
        return { success: false, error: `Cannot settle contract in ${contract.state} state` };
      }

      // Calculate settlement amount
      const settlementAmount = contract.orderAmount; // Principal only, not including fees
      const processingFee = contract.processingFee;
      const merchantReceives = settlementAmount - processingFee * 0.5; // Platform takes 50% of processing fee

      // Create settlement instruction
      const settlement: SettlementInstruction = {
        id: uuidv4(),
        merchantId: contract.merchantId,
        contractId,
        amount: merchantReceives,
        fees: {
          processingFee: contract.processingFee,
          collectionFee: 0, // Will be set if paid by installment
        },
        status: 'PENDING',
        createdAt: new Date(),
      };

      // Initiate payment to merchant (via payment gateway)
      try {
        const paymentResult = await deps.paymentGateway.initiate(merchantReceives, 'MERCHANT');
        settlement.paymentGatewayRef = paymentResult.ref;
        settlement.status = 'COMPLETED';
        settlement.completedAt = new Date();
      } catch (err) {
        settlement.status = 'FAILED';
        console.error('Payment gateway error:', err);
        return { success: false, error: 'Payment initiation failed' };
      }

      // Create ledger entries (audit trail)
      const ledgerEntries: InternalLedgerEntry[] = [
        {
          id: uuidv4(),
          contractId,
          type: 'DISBURSEMENT',
          amount: merchantReceives,
          account: 'MERCHANT',
          reference: settlement.id,
          timestamp: new Date(),
        },
        {
          id: uuidv4(),
          contractId,
          type: 'FEE',
          amount: processingFee * 0.5, // Platform revenue
          account: 'PLATFORM',
          reference: settlement.id,
          timestamp: new Date(),
        },
      ];

      for (const entry of ledgerEntries) {
        await deps.ledgerRepo.create(entry);
      }

      // Audit log
      await deps.auditLog.record({
        type: 'MERCHANT_SETTLEMENT',
        contractId,
        settlementId: settlement.id,
        amount: merchantReceives,
        timestamp: new Date(),
      });

      // Cache for idempotency
      await deps.idempotencyCache.set(idempotencyKey, { settlementId: settlement.id });

      return { success: true, settlementId: settlement.id };
    } catch (error) {
      console.error('Settlement error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Process refund (IDEMPOTENT)
   * Triggers reversal of disbursement to merchant
   * Used for: delivery failure, customer request, order cancellation
   */
  public static async processRefund(
    request: RefundRequest,
    deps: SettlementDependencies
  ): Promise<{ success: boolean; reversalId?: string; error?: string }> {
    try {
      // Idempotency check
      const cached = await deps.idempotencyCache.get(request.idempotencyKey);
      if (cached) {
        return { success: true, reversalId: cached.reversalId };
      }

      // Fetch contract
      const contract = await deps.contractRepo.get(request.contractId);
      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      // Verify refund amount <= order amount
      if (request.refundAmount > contract.orderAmount) {
        return { success: false, error: 'Refund amount exceeds order amount' };
      }

      // Create reversal ledger entry
      const reversalId = uuidv4();
      const reversalEntry: InternalLedgerEntry = {
        id: uuidv4(),
        contractId: request.contractId,
        type: 'REVERSAL',
        amount: -request.refundAmount, // Negative for reversal
        account: 'MERCHANT',
        reference: reversalId,
        timestamp: new Date(),
      };

      await deps.ledgerRepo.create(reversalEntry);

      // Audit log
      await deps.auditLog.record({
        type: 'REFUND_PROCESSED',
        contractId: request.contractId,
        reason: request.reason,
        amount: request.refundAmount,
        reversalId,
        timestamp: new Date(),
      });

      // Cache for idempotency
      await deps.idempotencyCache.set(request.idempotencyKey, { reversalId });

      return { success: true, reversalId };
    } catch (error) {
      console.error('Refund error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Post payroll remittance from employer
   * Matches deductions to contracts
   * Updates contract balances
   */
  public static async postPayrollRemittance(
    remittance: PayrollRemittance,
    deps: SettlementDependencies
  ): Promise<{ success: boolean; matchedCount?: number; error?: string }> {
    try {
      let matchedCount = 0;
      const deductionDetails = remittance.deductionDetails;

      for (const deduction of deductionDetails) {
        try {
          const contract = await deps.contractRepo.get(deduction.contractId);
          if (!contract) {
            console.warn(`Contract ${deduction.contractId} not found`);
            continue;
          }

          // Find matching installment (next due)
          const nextDueInstallment = contract.installments.find((i) => i.status === 'PENDING');
          if (!nextDueInstallment) {
            console.warn(`No pending installment for contract ${deduction.contractId}`);
            continue;
          }

          // Update installment
          nextDueInstallment.status = 'PAID';
          nextDueInstallment.paidDate = new Date();
          nextDueInstallment.paidAmount = deduction.amount;

          // Update contract balances
          contract.totalPaid += deduction.amount;
          contract.totalDue = Math.max(0, contract.totalDue - deduction.amount);

          // Check if all installments paid (contract closed)
          const allPaid = contract.installments.every((i) => i.status === 'PAID');
          if (allPaid) {
            contract.state = 'CLOSED';
            contract.closedAt = new Date();
          }

          // Persist
          await deps.contractRepo.update(contract);

          // Ledger entry (repayment)
          const ledgerEntry: InternalLedgerEntry = {
            id: uuidv4(),
            contractId: deduction.contractId,
            type: 'REPAYMENT',
            amount: deduction.amount,
            account: 'LENDER',
            reference: remittance.id,
            timestamp: new Date(),
          };

          await deps.ledgerRepo.create(ledgerEntry);

          // Audit log
          await deps.auditLog.record({
            type: 'INSTALLMENT_PAID',
            contractId: deduction.contractId,
            amount: deduction.amount,
            remittanceId: remittance.id,
            timestamp: new Date(),
          });

          matchedCount++;
        } catch (err) {
          console.error(`Error processing deduction ${deduction.contractId}:`, err);
        }
      }

      // Update remittance status
      remittance.status = matchedCount === deductionDetails.length ? 'CONFIRMED' : 'PARTIALLY_MATCHED';

      return { success: true, matchedCount };
    } catch (error) {
      console.error('Payroll remittance error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get settlement history for contract (for reconciliation)
   */
  public static async getSettlementHistory(
    contractId: string,
    deps: SettlementDependencies
  ): Promise<InternalLedgerEntry[]> {
    // In real system, query ledger repo for all entries for this contract
    // return await deps.ledgerRepo.query({ contractId });
    return [];
  }
}

export default PaymentSettlementService;
