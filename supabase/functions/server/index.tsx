import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { v4 as uuidv4 } from "npm:uuid";

// Import all services
import * as policyService from "./policy-service.tsx";
import * as contractService from "./contract-service.tsx";
import * as pesapalService from "./pesapal-service.tsx";
import * as ussdService from "./ussd-service.tsx";
import * as mifosService from "./mifos-service.tsx";
import * as reconciliationService from "./reconciliation-service.tsx";
import * as auditService from "./audit-service.tsx";
import * as affordabilityEngine from "./affordability-engine.tsx";
import * as seedService from "./seed-service.tsx";
import { validateStateTransition, canTransitionTo } from "./state-machine.tsx";
import { ContractState, DeductionStatus, type Employer, type Merchant, type MerchantOrder } from "./types.tsx";

const app = new Hono();

// Initialize seed data on startup
seedService.initializeSeedData().catch(console.error);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-34d8f37e/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==================== MERCHANT APIs ====================

/**
 * POST /api/merchant/orders
 * Create a BNPL order at merchant checkout
 */
app.post("/make-server-34d8f37e/api/merchant/orders", async (c) => {
  try {
    const body = await c.req.json();
    const { merchant_id, policy_number, amount, items, tenor_months } = body;

    // Validate merchant
    const merchant = await getMerchant(merchant_id);
    if (!merchant || merchant.status !== 'ACTIVE') {
      return c.json({ error: 'Invalid or inactive merchant' }, 400);
    }

    // Validate policy and get customer
    const policy = await policyService.getPolicy(policy_number);
    if (!policy || policy.status !== 'ACTIVE') {
      return c.json({ error: 'Invalid or inactive policy' }, 400);
    }

    // Get customer by policy
    const customer = await getCustomerByPolicy(policy_number);
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 400);
    }

    // Validate tenor
    if (![1, 2, 3].includes(tenor_months)) {
      return c.json({ error: 'Invalid tenor. Must be 1, 2, or 3 months' }, 400);
    }

    // Check affordability and limit
    const limit = await policyService.getLimit(policy_number, tenor_months);
    if (!limit) {
      return c.json({ error: 'No limit found for this tenor' }, 400);
    }

    if (amount > limit.available_amount) {
      return c.json({ 
        error: 'Amount exceeds available limit',
        available_limit: limit.available_amount,
        requested_amount: amount
      }, 400);
    }

    // Create merchant order
    const orderId = uuidv4();
    const order: MerchantOrder = {
      id: orderId,
      merchant_id,
      policy_number,
      amount,
      items: items || [],
      status: 'PENDING_AUTH',
      contract_id: null,
      created_at: new Date().toISOString(),
      authorized_at: null,
      delivered_at: null,
    };

    await kv.set(`order:${orderId}`, JSON.stringify(order));

    // Create BNPL contract (PRE_APPROVED state)
    const contract = await contractService.createContract({
      policy_number,
      merchant_id,
      order_id: orderId,
      principal_amount: amount,
      tenor_months,
      customer_id: customer.id,
    });

    // Update order with contract ID
    order.contract_id = contract.id;
    await kv.set(`order:${orderId}`, JSON.stringify(order));

    // Transition to DEDUCTION_REQUESTED (initiating authorization)
    await contractService.updateContractState(
      contract.id,
      ContractState.DEDUCTION_REQUESTED,
      'merchant',
      { order_id: orderId }
    );

    // Initiate USSD authorization
    const ussdSession = await ussdService.initiateUSSDSession(
      policy.phone_number,
      policy_number,
      contract.id
    );

    // Calculate payment breakdown
    const breakdown = affordabilityEngine.calculateFeeBreakdown(amount, tenor_months);

    return c.json({
      order_id: orderId,
      contract_id: contract.id,
      ussd_session_id: ussdSession.id,
      status: 'PENDING_AUTHORIZATION',
      payment_details: breakdown,
      authorization_expires_at: ussdSession.expires_at,
      message: 'Customer will receive SMS/USSD prompt for authorization',
    });
  } catch (error) {
    console.error('Error creating merchant order:', error);
    return c.json({ 
      error: 'Failed to create order', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/merchant/orders/:orderId/confirm-delivery
 * Confirm order delivery (triggers fund release)
 */
app.post("/make-server-34d8f37e/api/merchant/orders/:orderId/confirm-delivery", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    
    const orderData = await kv.get(`order:${orderId}`);
    if (!orderData) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const order: MerchantOrder = JSON.parse(orderData);
    
    if (!order.contract_id) {
      return c.json({ error: 'No contract associated with order' }, 400);
    }

    const contract = await contractService.getContract(order.contract_id);
    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404);
    }

    // Ensure contract is in ESCROW_HELD state
    if (contract.state !== ContractState.ESCROW_HELD) {
      return c.json({ 
        error: `Cannot confirm delivery. Contract in ${contract.state} state, expected ESCROW_HELD` 
      }, 400);
    }

    // Release funds from escrow to merchant
    const releaseTransaction = await pesapalService.releaseFunds(contract.id);

    // Update contract state to DISBURSED
    await contractService.updateContractState(
      contract.id,
      ContractState.DISBURSED,
      'merchant',
      { delivery_confirmed: true, pesapal_transaction_id: releaseTransaction.id }
    );

    // Transition to IN_REPAYMENT
    await contractService.updateContractState(
      contract.id,
      ContractState.IN_REPAYMENT,
      'system',
      { reason: 'Funds disbursed to merchant' }
    );

    // Update order status
    order.status = 'DELIVERED';
    order.delivered_at = new Date().toISOString();
    await kv.set(`order:${orderId}`, JSON.stringify(order));

    // Create deduction instructions for all installments
    for (let i = 1; i <= contract.tenor_months; i++) {
      await contractService.createDeductionInstruction(contract.id, i);
    }

    return c.json({
      order_id: orderId,
      contract_id: contract.id,
      status: 'DELIVERED',
      funds_released: true,
      pesapal_transaction_id: releaseTransaction.id,
      message: 'Delivery confirmed and funds released to merchant',
    });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    return c.json({ 
      error: 'Failed to confirm delivery', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/merchant/orders/:orderId/refund
 * Process refund (in case of return/dispute)
 */
app.post("/make-server-34d8f37e/api/merchant/orders/:orderId/refund", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { amount, reason } = body;

    const orderData = await kv.get(`order:${orderId}`);
    if (!orderData) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const order: MerchantOrder = JSON.parse(orderData);
    
    if (!order.contract_id) {
      return c.json({ error: 'No contract associated with order' }, 400);
    }

    const contract = await contractService.getContract(order.contract_id);
    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404);
    }

    // Initiate refund
    const refundTransaction = await pesapalService.refundFunds(contract.id, amount || contract.principal_amount);

    // Update contract to DISPUTED
    await contractService.updateContractState(
      contract.id,
      ContractState.DISPUTED,
      'merchant',
      { refund_reason: reason, refund_amount: amount }
    );

    // Update order status
    order.status = 'REFUNDED';
    await kv.set(`order:${orderId}`, JSON.stringify(order));

    return c.json({
      order_id: orderId,
      contract_id: contract.id,
      status: 'REFUNDED',
      refund_amount: amount || contract.principal_amount,
      pesapal_transaction_id: refundTransaction.id,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return c.json({ 
      error: 'Failed to process refund', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// ==================== EMPLOYER APIs ====================

/**
 * GET /api/employer/:employerId/deductions/pending
 * Get pending payroll deductions for employer
 */
app.get("/make-server-34d8f37e/api/employer/:employerId/deductions/pending", async (c) => {
  try {
    const employerId = c.req.param('employerId');
    
    const deductions = await contractService.getPendingDeductions(employerId);
    
    // Group by payroll cycle
    const groupedByPeriod: Record<string, any[]> = {};
    for (const deduction of deductions) {
      if (!groupedByPeriod[deduction.payroll_cycle]) {
        groupedByPeriod[deduction.payroll_cycle] = [];
      }
      groupedByPeriod[deduction.payroll_cycle].push(deduction);
    }

    // Calculate totals
    const summary = Object.entries(groupedByPeriod).map(([cycle, items]) => ({
      payroll_cycle: cycle,
      total_amount: items.reduce((sum, d) => sum + d.amount, 0),
      deduction_count: items.length,
      deductions: items,
    }));

    return c.json({
      employer_id: employerId,
      pending_periods: summary.length,
      total_deductions: deductions.length,
      total_amount: deductions.reduce((sum, d) => sum + d.amount, 0),
      periods: summary,
    });
  } catch (error) {
    console.error('Error fetching pending deductions:', error);
    return c.json({ 
      error: 'Failed to fetch deductions', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/employer/:employerId/deductions/approve
 * Approve deduction instructions
 */
app.post("/make-server-34d8f37e/api/employer/:employerId/deductions/approve", async (c) => {
  try {
    const employerId = c.req.param('employerId');
    const body = await c.req.json();
    const { deduction_ids } = body;

    for (const deductionId of deduction_ids) {
      const deductionData = await kv.get(`deduction:${deductionId}`);
      if (deductionData) {
        const deduction = JSON.parse(deductionData);
        deduction.status = 'APPROVED';
        await kv.set(`deduction:${deductionId}`, JSON.stringify(deduction));
      }
    }

    return c.json({
      employer_id: employerId,
      approved_count: deduction_ids.length,
      message: 'Deductions approved successfully',
    });
  } catch (error) {
    console.error('Error approving deductions:', error);
    return c.json({ 
      error: 'Failed to approve deductions', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/employer/:employerId/remittance
 * Submit payroll remittance (actual payments made)
 */
app.post("/make-server-34d8f37e/api/employer/:employerId/remittance", async (c) => {
  try {
    const employerId = c.req.param('employerId');
    const body = await c.req.json();
    const { payroll_cycle, remittances } = body;

    // remittances: [{ payroll_employee_id, deduction_id, amount, transaction_date }]
    
    const results: any[] = [];
    const mifosRepayments: any[] = [];

    for (const remittance of remittances) {
      try {
        // Find the deduction
        const deductionData = await kv.get(`deduction:${remittance.deduction_id}`);
        if (!deductionData) {
          results.push({ ...remittance, success: false, error: 'Deduction not found' });
          continue;
        }

        const deduction = JSON.parse(deductionData);
        deduction.status = 'EXECUTED';
        deduction.executed_at = new Date().toISOString();
        await kv.set(`deduction:${remittance.deduction_id}`, JSON.stringify(deduction));

        // Record installment payment
        await contractService.recordInstallmentPayment(
          deduction.installment_id,
          remittance.amount,
          remittance.deduction_id
        );

        // Get contract and Mifos loan ID for repayment posting
        const contract = await contractService.getContract(deduction.contract_id);
        if (contract && contract.mifos_loan_id) {
          mifosRepayments.push({
            mifos_loan_id: contract.mifos_loan_id,
            amount: remittance.amount,
            transaction_date: remittance.transaction_date || new Date().toISOString().split('T')[0],
          });
        }

        results.push({ ...remittance, success: true });
      } catch (error) {
        results.push({ 
          ...remittance, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Post repayments to Mifos X in batch
    const mifosResults = await mifosService.batchPostRepayments(mifosRepayments);

    // Store remittance record
    const remittanceRecord = {
      employer_id: employerId,
      payroll_cycle,
      total_amount: remittances.reduce((sum: number, r: any) => sum + r.amount, 0),
      remittances_count: remittances.length,
      processed_at: new Date().toISOString(),
    };
    await kv.set(`remittance:${employerId}:${payroll_cycle}`, JSON.stringify(remittanceRecord));

    // Trigger reconciliation
    const reconciliation = await reconciliationService.reconcilePayrollDeductions(employerId, payroll_cycle);

    return c.json({
      employer_id: employerId,
      payroll_cycle,
      total_remittances: remittances.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      mifos_posted: mifosResults.successful,
      mifos_failed: mifosResults.failed,
      reconciliation_status: reconciliation.status,
      results,
    });
  } catch (error) {
    console.error('Error processing remittance:', error);
    return c.json({ 
      error: 'Failed to process remittance', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/employer/bulk-onboard
 * Bulk onboard employees
 */
app.post("/make-server-34d8f37e/api/employer/bulk-onboard", async (c) => {
  try {
    const body = await c.req.json();
    const { employer_id, employees } = body;

    const result = await policyService.bulkOnboardEmployees(employer_id, employees);

    return c.json({
      employer_id,
      total_employees: employees.length,
      successful: result.successful.length,
      failed: result.failed.length,
      results: {
        successful: result.successful,
        failed: result.failed,
      },
    });
  } catch (error) {
    console.error('Error bulk onboarding employees:', error);
    return c.json({ 
      error: 'Failed to onboard employees', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// ==================== USSD/CUSTOMER APIs ====================

/**
 * POST /api/ussd/authorize
 * Process USSD PIN authorization
 */
app.post("/make-server-34d8f37e/api/ussd/authorize", async (c) => {
  try {
    const body = await c.req.json();
    const { session_id, pin } = body;

    const result = await ussdService.processUSSDPINEntry(session_id, pin);

    if (result.verified) {
      // Update contract state to CUSTOMER_AUTHORIZED
      await contractService.updateContractState(
        result.session.contract_id,
        ContractState.CUSTOMER_AUTHORIZED,
        result.session.phone_number,
        { ussd_session_id: session_id }
      );

      // Hold funds in Pesapal escrow
      const contract = await contractService.getContract(result.session.contract_id);
      if (!contract) {
        throw new Error('Contract not found');
      }

      const holdTransaction = await pesapalService.holdFunds(
        contract.id,
        contract.principal_amount,
        contract.order_id
      );

      // Update contract state to ESCROW_HELD
      const updatedContract = await contractService.updateContractState(
        contract.id,
        ContractState.ESCROW_HELD,
        'system',
        { pesapal_transaction_id: holdTransaction.id }
      );

      // Update contract with Pesapal transaction ID
      updatedContract.pesapal_transaction_id = holdTransaction.id;
      await kv.set(`contract:${contract.id}`, JSON.stringify(updatedContract));

      // Create loan in Mifos X
      const mifosLoanId = await mifosService.createMifosLoan(updatedContract);
      
      // Update contract with Mifos loan ID
      updatedContract.mifos_loan_id = mifosLoanId;
      await kv.set(`contract:${contract.id}`, JSON.stringify(updatedContract));

      // Update order status
      const orderData = await kv.get(`order:${contract.order_id}`);
      if (orderData) {
        const order = JSON.parse(orderData);
        order.status = 'AUTHORIZED';
        order.authorized_at = new Date().toISOString();
        await kv.set(`order:${contract.order_id}`, JSON.stringify(order));
      }

      // Send confirmation SMS
      await ussdService.sendAuthorizationConfirmation(
        result.session.phone_number,
        contract.principal_amount,
        contract.tenor_months,
        contract.installment_amount
      );

      return c.json({
        verified: true,
        contract_id: contract.id,
        status: 'AUTHORIZED',
        escrow_held: true,
        mifos_loan_id: mifosLoanId,
        message: 'Purchase authorized successfully',
      });
    } else {
      return c.json({
        verified: false,
        reason: result.reason,
        session_state: result.session.state,
      }, 401);
    }
  } catch (error) {
    console.error('Error processing USSD authorization:', error);
    return c.json({ 
      error: 'Failed to process authorization', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/ussd/check-limit
 * Check BNPL limit via USSD
 */
app.post("/make-server-34d8f37e/api/ussd/check-limit", async (c) => {
  try {
    const body = await c.req.json();
    const { phone_number } = body;

    const result = await ussdService.checkLimitViaUSSD(phone_number);

    return c.json(result);
  } catch (error) {
    console.error('Error checking limit via USSD:', error);
    return c.json({ 
      error: 'Failed to check limit', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/customer/set-pin
 * Set customer PIN for authorization
 */
app.post("/make-server-34d8f37e/api/customer/set-pin", async (c) => {
  try {
    const body = await c.req.json();
    const { policy_number, phone_number, pin } = body;

    await policyService.setCustomerPIN(policy_number, phone_number, pin);

    return c.json({
      policy_number,
      message: 'PIN set successfully',
    });
  } catch (error) {
    console.error('Error setting PIN:', error);
    return c.json({ 
      error: 'Failed to set PIN', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// ==================== RECONCILIATION APIs ====================

/**
 * GET /api/reconciliation/summary
 * Get reconciliation summary
 */
app.get("/make-server-34d8f37e/api/reconciliation/summary", async (c) => {
  try {
    const summary = await reconciliationService.getReconciliationSummary();
    return c.json(summary);
  } catch (error) {
    console.error('Error fetching reconciliation summary:', error);
    return c.json({ 
      error: 'Failed to fetch summary', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * GET /api/reconciliation/:type
 * Get reconciliation records by type
 */
app.get("/make-server-34d8f37e/api/reconciliation/:type", async (c) => {
  try {
    const type = c.req.param('type').toUpperCase() as 'PAYROLL' | 'MIFOS' | 'PESAPAL';
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    const records = await reconciliationService.getReconciliations(type, startDate, endDate);
    
    return c.json({
      type,
      total_records: records.length,
      records,
    });
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    return c.json({ 
      error: 'Failed to fetch reconciliations', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * POST /api/reconciliation/run-daily
 * Trigger daily reconciliation
 */
app.post("/make-server-34d8f37e/api/reconciliation/run-daily", async (c) => {
  try {
    const result = await reconciliationService.runDailyReconciliation();
    
    return c.json({
      message: 'Daily reconciliation completed',
      ...result,
    });
  } catch (error) {
    console.error('Error running daily reconciliation:', error);
    return c.json({ 
      error: 'Failed to run reconciliation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// ==================== DASHBOARD/ANALYTICS APIs ====================

/**
 * GET /api/dashboard/kpis
 * Get key performance indicators
 */
app.get("/make-server-34d8f37e/api/dashboard/kpis", async (c) => {
  try {
    const kpis = await calculateKPIs();
    return c.json(kpis);
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    return c.json({ 
      error: 'Failed to calculate KPIs', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * GET /api/contracts
 * Get all contracts with optional filters
 */
app.get("/make-server-34d8f37e/api/contracts", async (c) => {
  try {
    const state = c.req.query('state');
    const policyNumber = c.req.query('policy_number');

    const allKeys = await kv.getByPrefix('contract:');
    const contracts: any[] = [];

    for (const key of allKeys) {
      if (!key.includes(':') || key.split(':').length === 2) {
        const data = await kv.get(key);
        if (data) {
          try {
            const contract = JSON.parse(data);
            if (contract.id) { // Ensure it's a contract, not a reference
              if ((!state || contract.state === state) && 
                  (!policyNumber || contract.policy_number === policyNumber)) {
                contracts.push(contract);
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return c.json({
      total: contracts.length,
      contracts,
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return c.json({ 
      error: 'Failed to fetch contracts', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * GET /api/audit-logs/:entityType/:entityId
 * Get audit logs for an entity
 */
app.get("/make-server-34d8f37e/api/audit-logs/:entityType/:entityId", async (c) => {
  try {
    const entityType = c.req.param('entityType');
    const entityId = c.req.param('entityId');

    const logs = await auditService.getAuditLogs(entityType, entityId);

    return c.json({
      entity_type: entityType,
      entity_id: entityId,
      total_logs: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return c.json({ 
      error: 'Failed to fetch audit logs', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// ==================== HELPER FUNCTIONS ====================

async function getMerchant(merchantId: string): Promise<Merchant | null> {
  const data = await kv.get(`merchant:${merchantId}`);
  return data ? JSON.parse(data) : null;
}

async function getCustomerByPolicy(policyNumber: string): Promise<any> {
  const allKeys = await kv.getByPrefix('customer:');
  
  for (const key of allKeys) {
    if (!key.includes(':')) {
      const data = await kv.get(key);
      if (data) {
        const customer = JSON.parse(data);
        // Find matching policy
        const policy = await policyService.getPolicy(policyNumber);
        if (policy && policy.payroll_employee_id === customer.payroll_employee_id) {
          return customer;
        }
      }
    }
  }
  
  return null;
}

async function calculateKPIs() {
  const allContracts = await kv.getByPrefix('contract:');
  
  let totalContracts = 0;
  let totalDisbursed = 0;
  let totalOutstanding = 0;
  let totalPaid = 0;
  const stateDistribution: Record<string, number> = {};
  const avgTurnaround: number[] = [];
  
  for (const key of allContracts) {
    if (!key.includes(':') || key.split(':').length === 2) {
      const data = await kv.get(key);
      if (data) {
        try {
          const contract = JSON.parse(data);
          if (!contract.id) continue;
          
          totalContracts++;
          stateDistribution[contract.state] = (stateDistribution[contract.state] || 0) + 1;
          
          if (contract.state === 'DISBURSED' || contract.state === 'IN_REPAYMENT' || contract.state === 'CLOSED') {
            totalDisbursed += contract.principal_amount;
          }
          
          // Calculate outstanding and paid
          const installments = await contractService.getInstallments(contract.id);
          const paid = installments.reduce((sum, i) => sum + i.amount_paid, 0);
          totalPaid += paid;
          
          if (contract.state !== 'CLOSED' && contract.state !== 'CANCELLED') {
            totalOutstanding += (contract.total_payable - paid);
          }
          
          // Calculate approval turnaround
          if (contract.created_at && contract.authorized_at) {
            const created = new Date(contract.created_at).getTime();
            const authorized = new Date(contract.authorized_at).getTime();
            avgTurnaround.push((authorized - created) / 1000 / 60); // minutes
          }
        } catch (e) {
          // Skip invalid
        }
      }
    }
  }
  
  // Calculate PAR (Portfolio at Risk)
  const today = new Date();
  let par1 = 0;
  let par30 = 0;
  
  for (const key of allContracts) {
    if (!key.includes(':') || key.split(':').length === 2) {
      const data = await kv.get(key);
      if (data) {
        try {
          const contract = JSON.parse(data);
          if (!contract.id) continue;
          
          if (contract.state === 'IN_REPAYMENT') {
            const installments = await contractService.getInstallments(contract.id);
            for (const inst of installments) {
              if (inst.status !== 'PAID') {
                const dueDate = new Date(inst.due_date);
                const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysPastDue > 0) {
                  par1 += (inst.amount_due - inst.amount_paid);
                }
                if (daysPastDue > 30) {
                  par30 += (inst.amount_due - inst.amount_paid);
                }
              }
            }
          }
        } catch (e) {
          // Skip
        }
      }
    }
  }
  
  const avgApprovalTime = avgTurnaround.length > 0 
    ? avgTurnaround.reduce((sum, t) => sum + t, 0) / avgTurnaround.length 
    : 0;
  
  return {
    total_contracts: totalContracts,
    total_disbursed: totalDisbursed,
    total_outstanding: totalOutstanding,
    total_paid: totalPaid,
    avg_approval_time_minutes: Math.round(avgApprovalTime),
    par_1_amount: par1,
    par_30_amount: par30,
    par_1_percentage: totalOutstanding > 0 ? (par1 / totalOutstanding) * 100 : 0,
    par_30_percentage: totalOutstanding > 0 ? (par30 / totalOutstanding) * 100 : 0,
    repayment_completion_rate: totalDisbursed > 0 ? (totalPaid / totalDisbursed) * 100 : 0,
    state_distribution: stateDistribution,
  };
}

Deno.serve(app.fetch);