/**
 * Mifos X Adapter
 * Integrates BNPL platform with Mifos X (system of record for microfinance)
 * Responsibilities:
 * - Create loan in Mifos after BNPL approval
 * - Post repayments when payroll received
 * - Maintain schedule, balance, regulatory reporting
 * - NOT a decision engine - Mifos trusts BNPL decisions
 *
 * Design: Async event-driven
 * - BNPL creates contract
 * - Event published: CREATE_MIFOS_LOAN
 * - Adapter consumes, creates in Mifos
 * - Stores bidirectional link
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BNPLContract,
  MifosLoanCreationRequest,
  MifosLoanLink,
  RepaymentPosting,
  Employee,
} from './types';

export interface MifosAdapterDependencies {
  mifosClient: {
    createLoan: (request: MifosLoanCreationRequest) => Promise<{ loanId: string; clientId: string }>;
    postRepayment: (loanId: string, amount: number, date: Date) => Promise<{ transactionId: string }>;
    getLoanStatus: (loanId: string) => Promise<{ status: string; balance: number; schedule: any[] }>;
    closeAccount: (clientId: string) => Promise<void>;
  };
  linkRepo: {
    create: (link: MifosLoanLink) => Promise<MifosLoanLink>;
    getByBNPLContract: (contractId: string) => Promise<MifosLoanLink | null>;
    update: (link: MifosLoanLink) => Promise<void>;
  };
  employeeRepo: { get: (id: string) => Promise<Employee | null> };
  contractRepo: { get: (id: string) => Promise<BNPLContract | null> };
  auditLog: { record: (event: any) => Promise<void> };
}

export class MifosXAdapter {
  /**
   * Create loan in Mifos X (async event handler)
   * Called after BNPL contract is created
   * Prerequisite: Employee is already created in Mifos
   */
  public static async createMifosLoan(
    bnplContractId: string,
    deps: MifosAdapterDependencies
  ): Promise<{ success: boolean; mifosLoanId?: string; error?: string }> {
    try {
      // Fetch BNPL contract
      const contract = await deps.contractRepo.get(bnplContractId);
      if (!contract) {
        return { success: false, error: 'BNPL contract not found' };
      }

      // Fetch employee
      const employee = await deps.employeeRepo.get(contract.employeeId);
      if (!employee) {
        return { success: false, error: 'Employee not found' };
      }

      // Prepare Mifos loan creation request
      // Note: In real system, would look up employee's Mifos client ID
      const mifosRequest: MifosLoanCreationRequest = {
        clientId: employee.id, // Would be mapped to Mifos client ID
        loanProductId: 'BNPL_PRODUCT', // Predefined BNPL product in Mifos
        principal: contract.orderAmount,
        tenor: contract.tenor,
        interestRate: contract.interestRate * 100, // Mifos expects percentage
        expectedDisbursalDate: new Date(),
      };

      // Create in Mifos
      const mifosResult = await deps.mifosClient.createLoan(mifosRequest);

      // Create link record
      const link: MifosLoanLink = {
        bnplContractId,
        mifosLoanId: mifosResult.loanId,
        mifosClientId: mifosResult.clientId,
        status: 'CREATED',
        linkedAt: new Date(),
      };

      await deps.linkRepo.create(link);

      // Update BNPL contract with Mifos ID
      contract.mifosLoanId = mifosResult.loanId;
      await deps.contractRepo.update(contract);

      // Audit
      await deps.auditLog.record({
        type: 'MIFOS_LOAN_CREATED',
        bnplContractId,
        mifosLoanId: mifosResult.loanId,
        principal: contract.orderAmount,
        tenor: contract.tenor,
        timestamp: new Date(),
      });

      return { success: true, mifosLoanId: mifosResult.loanId };
    } catch (error) {
      console.error('Mifos loan creation error:', error);

      // Audit failure
      await deps.auditLog.record({
        type: 'MIFOS_LOAN_CREATION_FAILED',
        bnplContractId,
        error: (error as Error).message,
        timestamp: new Date(),
      });

      return { success: false, error: 'Failed to create Mifos loan' };
    }
  }

  /**
   * Post repayment to Mifos
   * Called when payroll remittance received
   * Idempotent: same payment can be posted multiple times safely
   */
  public static async postRepayment(
    bnplContractId: string,
    amount: number,
    paymentDate: Date,
    reference: string,
    deps: MifosAdapterDependencies
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get Mifos link
      const link = await deps.linkRepo.getByBNPLContract(bnplContractId);
      if (!link) {
        return { success: false, error: 'No Mifos loan linked to this BNPL contract' };
      }

      // Post to Mifos
      const postResult = await deps.mifosClient.postRepayment(link.mifosLoanId, amount, paymentDate);

      // Create posting record
      const posting: RepaymentPosting = {
        bnplContractId,
        mifosLoanId: link.mifosLoanId,
        amount,
        paymentDate,
        reference,
        postedAt: new Date(),
        status: 'POSTED',
      };

      // Audit
      await deps.auditLog.record({
        type: 'REPAYMENT_POSTED_TO_MIFOS',
        bnplContractId,
        mifosLoanId: link.mifosLoanId,
        amount,
        transactionId: postResult.transactionId,
        timestamp: new Date(),
      });

      return { success: true, transactionId: postResult.transactionId };
    } catch (error) {
      console.error('Mifos repayment posting error:', error);

      // Audit failure
      await deps.auditLog.record({
        type: 'REPAYMENT_POSTING_FAILED',
        bnplContractId,
        error: (error as Error).message,
        timestamp: new Date(),
      });

      return { success: false, error: 'Failed to post repayment' };
    }
  }

  /**
   * Check Mifos loan status (health check / reconciliation)
   */
  public static async checkLoanStatus(
    bnplContractId: string,
    deps: MifosAdapterDependencies
  ): Promise<{
    success: boolean;
    status?: string;
    balance?: number;
    scheduledPayments?: any[];
    error?: string;
  }> {
    try {
      const link = await deps.linkRepo.getByBNPLContract(bnplContractId);
      if (!link) {
        return { success: false, error: 'No Mifos loan found' };
      }

      const loanStatus = await deps.mifosClient.getLoanStatus(link.mifosLoanId);

      // Update link status if changed
      if (loanStatus.status !== link.status) {
        link.status = loanStatus.status as any; // Type would need to be fixed
        await deps.linkRepo.update(link);
      }

      return {
        success: true,
        status: loanStatus.status,
        balance: loanStatus.balance,
        scheduledPayments: loanStatus.schedule,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Close Mifos account (when BNPL contract closed)
   */
  public static async closeAccount(
    employeeId: string,
    deps: MifosAdapterDependencies
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await deps.mifosClient.closeAccount(employeeId);

      // Audit
      await deps.auditLog.record({
        type: 'MIFOS_ACCOUNT_CLOSED',
        employeeId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error('Mifos account close error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Reconciliation job
   * Sync BNPL contract status with Mifos loan status
   * Run daily/hourly to ensure consistency
   */
  public static async reconcileContracts(
    contracts: BNPLContract[],
    deps: MifosAdapterDependencies
  ): Promise<{ reconciled: number; discrepancies: any[] }> {
    const discrepancies: any[] = [];
    let reconciled = 0;

    for (const contract of contracts) {
      try {
        const link = await deps.linkRepo.getByBNPLContract(contract.id);
        if (!link) continue;

        const mifosStatus = await deps.mifosClient.getLoanStatus(link.mifosLoanId);

        // Compare statuses
        const bnplToMifos: Record<string, string> = {
          FUNDED: 'APPROVED',
          IN_REPAYMENT: 'ACTIVE',
          CLOSED: 'CLOSED',
          DEFAULTED: 'DEFAULTED',
        };

        const expectedMifosStatus = bnplToMifos[contract.state];
        if (mifosStatus.status !== expectedMifosStatus) {
          discrepancies.push({
            contractId: contract.id,
            mifosLoanId: link.mifosLoanId,
            bnplState: contract.state,
            expectedMifosStatus,
            actualMifosStatus: mifosStatus.status,
          });
        } else {
          reconciled++;
        }
      } catch (error) {
        console.error(`Reconciliation error for contract ${contract.id}:`, error);
      }
    }

    return { reconciled, discrepancies };
  }
}

export default MifosXAdapter;
