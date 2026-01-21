/**
 * Checkout API Service
 * CRITICAL PATH: Merchant checkout entry point
 * Latency requirement: <1 second response
 * Stateless and horizontally scalable
 *
 * Flow:
 * 1. Validate merchant & order
 * 2. Identify employee by phone
 * 3. Check existing contracts (cache-friendly)
 * 4. Run credit decision
 * 5. Allocate to lender
 * 6. Create contract (FUNDED state)
 * 7. Return auth token
 * 8. Async: Create Mifos loan, send notifications
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Merchant,
  Employer,
  Employee,
  Lender,
  BNPLContract,
  CheckoutRequest,
  AuthorizationResponse,
  BNPLInstallment,
} from './types';
import { CreditEngine, CreditCheckInput } from './CreditEngine';
import { MultiLenderAllocationEngine, LenderAllocationContext } from './MultiLenderAllocationEngine';
import { ContractStateMachine } from './StateMachine';

export interface CheckoutDependencies {
  merchantRepo: { get: (id: string) => Promise<Merchant | null> };
  employeeRepo: { getByPhone: (phone: string) => Promise<Employee | null> };
  employerRepo: { get: (id: string) => Promise<Employer | null> };
  lenderRepo: { getAll: () => Promise<Lender[]> };
  contractRepo: { create: (contract: BNPLContract) => Promise<BNPLContract> };
  crbService: { check: (nationalId: string, phone: string) => Promise<{ score: number }> };
  idempotencyCache: { get: (key: string) => Promise<any>; set: (key: string, value: any) => Promise<void> };
  eventBus: { publish: (event: any) => Promise<void> }; // For async notifications, Mifos creation
}

export class CheckoutService {
  /**
   * Process merchant checkout (stateless, <1s target)
   */
  public static async processCheckout(
    request: CheckoutRequest,
    deps: CheckoutDependencies
  ): Promise<{ success: boolean; data?: AuthorizationResponse; error?: string }> {
    try {
      // Step 0: Idempotency check (cached)
      const cached = await deps.idempotencyCache.get(request.idempotencyKey);
      if (cached) {
        return {
          success: true,
          data: cached,
        };
      }

      // Step 1: Validate merchant
      const merchant = await deps.merchantRepo.get(request.merchantId);
      if (!merchant || !merchant.isActive) {
        return {
          success: false,
          error: 'Invalid or inactive merchant',
        };
      }

      // Step 2: Order validation
      if (request.orderAmount <= 0 || request.orderAmount > 10_000_000) {
        return {
          success: false,
          error: 'Order amount out of range (1 - 10M UGX)',
        };
      }

      if (request.tenor < 30 || request.tenor > 180) {
        return {
          success: false,
          error: 'Tenor must be 30-180 days',
        };
      }

      // Step 3: Identify employee
      const employee = await deps.employeeRepo.getByPhone(request.customerPhone);
      if (!employee || !employee.isActive) {
        return {
          success: false,
          error: 'Employee not registered or inactive',
        };
      }

      // Step 4: Get employer
      const employer = await deps.employerRepo.get(employee.employerId);
      if (!employer || !employer.isActive) {
        return {
          success: false,
          error: 'Employee employer is inactive',
        };
      }

      // Step 5: Get active contracts (for deduction history)
      // Note: In real system, would query: SELECT * FROM contracts WHERE employee_id = ? AND state IN ('FUNDED', 'IN_REPAYMENT')
      const activeContracts: BNPLContract[] = []; // Would be populated from contractRepo

      // Step 6: CRB check (cached for 24h in real system)
      const crbResult = await deps.crbService.check(employee.nationalId, request.customerPhone);

      // Step 7: Credit decision
      const creditCheckInput: CreditCheckInput = {
        employee,
        employer,
        requestedAmount: request.orderAmount,
        requestedTenor: request.tenor,
        crbScore: crbResult.score,
        activeContracts,
      };

      const creditDecision = CreditEngine.makeDecision(creditCheckInput);

      if (!creditDecision.approved) {
        return {
          success: false,
          error: `Credit declined: ${creditDecision.reasoning}`,
        };
      }

      if (creditDecision.approvedAmount < request.orderAmount) {
        return {
          success: false,
          error: `Approved amount (UGX ${creditDecision.approvedAmount}) less than requested (UGX ${request.orderAmount})`,
        };
      }

      // Step 8: Get lenders
      const lenders = await deps.lenderRepo.getAll();

      // Step 9: Multi-lender allocation
      const allocationContext: LenderAllocationContext = {
        lenders,
        requestedAmount: request.orderAmount,
        tenor: request.tenor,
        riskTier: employee.riskTier,
        employerId: employee.employerId,
        strategy: 'ROUND_ROBIN', // Could be parameterized
      };

      const allocation = MultiLenderAllocationEngine.allocate(allocationContext);
      if (!allocation) {
        return {
          success: false,
          error: 'No lender available for this request',
        };
      }

      // Step 10: Create BNPL contract (FUNDED state)
      const contract: BNPLContract = {
        id: uuidv4(),
        employeeId: employee.id,
        merchantId: request.merchantId,
        lenderId: allocation.lenderId,
        orderAmount: request.orderAmount,
        tenor: request.tenor,
        interestRate: creditDecision.interestRate,
        processingFee: creditDecision.processingFee,
        totalPayable: request.orderAmount + creditDecision.processingFee,
        installmentAmount: Math.ceil(
          (request.orderAmount + creditDecision.processingFee) / (request.tenor / 30)
        ),
        state: 'FUNDED', // Immediately funded
        stateTransitionHistory: [
          {
            fromState: 'PRE_APPROVED',
            toState: 'FUNDED',
            reason: 'Merchant checkout approved',
            timestamp: new Date(),
            triggeredBy: 'CHECKOUT_SERVICE',
          },
        ],
        installments: this.generateInstallments(
          uuidv4(),
          request.tenor,
          Math.ceil((request.orderAmount + creditDecision.processingFee) / (request.tenor / 30))
        ),
        totalPaid: 0,
        totalDue: request.orderAmount + creditDecision.processingFee,
        pastDueAmount: 0,
        createdAt: new Date(),
        fundedAt: new Date(),
      };

      // Step 11: Persist contract
      const savedContract = await deps.contractRepo.create(contract);

      // Step 12: Create auth token (short-lived, for customer confirmation)
      const authToken = this.generateAuthToken(savedContract.id, employee.phoneNumber);

      const response: AuthorizationResponse = {
        contractId: savedContract.id,
        status: 'APPROVED',
        approvedAmount: request.orderAmount,
        tenor: request.tenor,
        installmentAmount: contract.installmentAmount,
        authToken,
        expiresIn: 900, // 15 minutes
      };

      // Step 13: Cache for idempotency
      await deps.idempotencyCache.set(request.idempotencyKey, response);

      // Step 14: Async events (don't block response)
      // In real system, publish to event bus:
      // - CREATE_MIFOS_LOAN event (for downstream Mifos creation)
      // - SEND_AUTHORIZATION_SMS event
      // - LOG_AUDIT event
      deps.eventBus.publish({
        type: 'CHECKOUT_COMPLETED',
        contractId: savedContract.id,
        merchantId: request.merchantId,
        employeeId: employee.id,
        amount: request.orderAmount,
        lenderId: allocation.lenderId,
        timestamp: new Date(),
      }).catch((err) => console.error('Event publish failed:', err));

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Checkout error:', error);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  /**
   * Generate installment schedule
   */
  private static generateInstallments(
    contractId: string,
    tenor: number,
    monthlyAmount: number
  ): BNPLInstallment[] {
    const installments: BNPLInstallment[] = [];
    const numberOfInstallments = Math.ceil(tenor / 30);
    const now = new Date();

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + i * 30);

      installments.push({
        id: uuidv4(),
        contractId,
        installmentNumber: i,
        dueDate,
        amount: monthlyAmount,
        status: 'PENDING',
      });
    }

    return installments;
  }

  /**
   * Generate short-lived auth token
   */
  private static generateAuthToken(contractId: string, phoneNumber: string): string {
    // In real system: JWT with contractId + phone + exp + signature
    return Buffer.from(`${contractId}:${phoneNumber}:${Date.now() + 900000}`).toString('base64');
  }
}

export default CheckoutService;
