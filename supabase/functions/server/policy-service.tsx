// Policy management service

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import { hash } from 'npm:bcrypt';
import type { EmployerPolicy, CustomerAuth, BNPLCustomer, BNPLLimit, PolicyStatus, CustomerStatus } from './types.tsx';
import { calculateAffordability } from './affordability-engine.tsx';

const POLICY_PREFIX = 'policy:';
const CUSTOMER_AUTH_PREFIX = 'auth:';
const CUSTOMER_PREFIX = 'customer:';
const LIMIT_PREFIX = 'limit:';

/**
 * Generate unique policy number
 */
function generatePolicyNumber(employerId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `POL-${employerId.substring(0, 4).toUpperCase()}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Create employer policy (bulk onboarding)
 */
export async function createPolicy(data: {
  employer_id: string;
  payroll_employee_id: string;
  phone_number: string;
  net_salary: number;
  national_id: string;
  full_name: string;
}): Promise<{ policy: EmployerPolicy; customer: BNPLCustomer }> {
  const policyNumber = generatePolicyNumber(data.employer_id);
  const customerId = uuidv4();
  const now = new Date().toISOString();

  // Create policy
  const policy: EmployerPolicy = {
    policy_number: policyNumber,
    employer_id: data.employer_id,
    payroll_employee_id: data.payroll_employee_id,
    phone_number: data.phone_number,
    net_salary: data.net_salary,
    status: 'ACTIVE' as PolicyStatus,
    created_at: now,
    updated_at: now,
  };

  // Create customer
  const customer: BNPLCustomer = {
    id: customerId,
    national_id: data.national_id,
    phone_number: data.phone_number,
    full_name: data.full_name,
    employer_id: data.employer_id,
    payroll_employee_id: data.payroll_employee_id,
    status: 'ACTIVE' as CustomerStatus,
    created_at: now,
    updated_at: now,
  };

  // Calculate and store limits
  const affordability = calculateAffordability(policy);
  
  if (affordability.approved) {
    for (const tenor of [1, 2, 3] as const) {
      const limitId = uuidv4();
      const maxAmount = affordability[`max_amount_${tenor}_months` as keyof typeof affordability] as number;
      
      const limit: BNPLLimit = {
        id: limitId,
        customer_id: customerId,
        policy_number: policyNumber,
        tenor_months: tenor,
        max_amount: maxAmount,
        available_amount: maxAmount,
        last_calculated_at: now,
      };
      
      await kv.set(`${LIMIT_PREFIX}${policyNumber}:${tenor}`, JSON.stringify(limit));
    }
  }

  // Store in KV
  await kv.set(`${POLICY_PREFIX}${policyNumber}`, JSON.stringify(policy));
  await kv.set(`${CUSTOMER_PREFIX}${customerId}`, JSON.stringify(customer));
  await kv.set(`${CUSTOMER_PREFIX}phone:${data.phone_number}`, customerId);

  return { policy, customer };
}

/**
 * Get policy by policy number
 */
export async function getPolicy(policyNumber: string): Promise<EmployerPolicy | null> {
  const data = await kv.get(`${POLICY_PREFIX}${policyNumber}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Get customer by ID
 */
export async function getCustomer(customerId: string): Promise<BNPLCustomer | null> {
  const data = await kv.get(`${CUSTOMER_PREFIX}${customerId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Get customer by phone number
 */
export async function getCustomerByPhone(phoneNumber: string): Promise<BNPLCustomer | null> {
  const customerId = await kv.get(`${CUSTOMER_PREFIX}phone:${phoneNumber}`);
  if (!customerId) return null;
  
  return getCustomer(customerId);
}

/**
 * Get BNPL limit for a policy and tenor
 */
export async function getLimit(policyNumber: string, tenorMonths: 1 | 2 | 3): Promise<BNPLLimit | null> {
  const data = await kv.get(`${LIMIT_PREFIX}${policyNumber}:${tenorMonths}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Update available limit after contract creation or closure
 */
export async function updateAvailableLimit(
  policyNumber: string,
  tenorMonths: 1 | 2 | 3,
  amountChange: number // negative to decrease, positive to increase
): Promise<void> {
  const limit = await getLimit(policyNumber, tenorMonths);
  if (!limit) throw new Error(`Limit not found for policy ${policyNumber} tenor ${tenorMonths}`);

  limit.available_amount += amountChange;
  
  // Ensure available amount doesn't go negative or exceed max
  limit.available_amount = Math.max(0, Math.min(limit.available_amount, limit.max_amount));
  
  await kv.set(`${LIMIT_PREFIX}${policyNumber}:${tenorMonths}`, JSON.stringify(limit));
}

/**
 * Set customer PIN for USSD/SMS authorization
 */
export async function setCustomerPIN(policyNumber: string, phoneNumber: string, pin: string): Promise<void> {
  const pinHash = await hash(pin, 10);
  
  const auth: CustomerAuth = {
    policy_number: policyNumber,
    phone_number: phoneNumber,
    pin_hash: pinHash,
    last_verified_at: null,
    failed_attempts: 0,
    locked_until: null,
  };
  
  await kv.set(`${CUSTOMER_AUTH_PREFIX}${policyNumber}`, JSON.stringify(auth));
}

/**
 * Verify customer PIN
 */
export async function verifyPIN(policyNumber: string, pin: string): Promise<{ verified: boolean; reason?: string }> {
  const authData = await kv.get(`${CUSTOMER_AUTH_PREFIX}${policyNumber}`);
  if (!authData) {
    return { verified: false, reason: 'PIN not set' };
  }
  
  const auth: CustomerAuth = JSON.parse(authData);
  
  // Check if locked
  if (auth.locked_until && new Date(auth.locked_until) > new Date()) {
    return { verified: false, reason: 'Account locked due to multiple failed attempts' };
  }
  
  // Verify PIN
  const bcrypt = await import('npm:bcrypt');
  const isValid = await bcrypt.compare(pin, auth.pin_hash);
  
  if (isValid) {
    // Reset failed attempts and update last verified
    auth.failed_attempts = 0;
    auth.last_verified_at = new Date().toISOString();
    auth.locked_until = null;
    await kv.set(`${CUSTOMER_AUTH_PREFIX}${policyNumber}`, JSON.stringify(auth));
    return { verified: true };
  } else {
    // Increment failed attempts
    auth.failed_attempts += 1;
    
    // Lock account if max attempts exceeded
    const BUSINESS_RULES = await import('./types.tsx').then(m => m.BUSINESS_RULES);
    if (auth.failed_attempts >= BUSINESS_RULES.MAX_PIN_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setHours(lockUntil.getHours() + BUSINESS_RULES.PIN_LOCKOUT_DURATION_HOURS);
      auth.locked_until = lockUntil.toISOString();
    }
    
    await kv.set(`${CUSTOMER_AUTH_PREFIX}${policyNumber}`, JSON.stringify(auth));
    return { 
      verified: false, 
      reason: `Invalid PIN. ${BUSINESS_RULES.MAX_PIN_ATTEMPTS - auth.failed_attempts} attempts remaining` 
    };
  }
}

/**
 * Bulk onboard employees from employer file/API
 */
export async function bulkOnboardEmployees(
  employerId: string,
  employees: Array<{
    payroll_employee_id: string;
    national_id: string;
    full_name: string;
    phone_number: string;
    net_salary: number;
  }>
): Promise<{ 
  successful: Array<{ policy_number: string; customer_id: string }>;
  failed: Array<{ employee: any; error: string }>;
}> {
  const successful: Array<{ policy_number: string; customer_id: string }> = [];
  const failed: Array<{ employee: any; error: string }> = [];
  
  for (const employee of employees) {
    try {
      const { policy, customer } = await createPolicy({
        employer_id: employerId,
        payroll_employee_id: employee.payroll_employee_id,
        phone_number: employee.phone_number,
        net_salary: employee.net_salary,
        national_id: employee.national_id,
        full_name: employee.full_name,
      });
      
      successful.push({
        policy_number: policy.policy_number,
        customer_id: customer.id,
      });
    } catch (error) {
      failed.push({
        employee,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return { successful, failed };
}
