// USSD/SMS authorization service

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import type { USSDSession } from './types.tsx';
import { BUSINESS_RULES } from './types.tsx';
import { verifyPIN } from './policy-service.tsx';
import { createAuditLog } from './audit-service.tsx';

const USSD_PREFIX = 'ussd:';

/**
 * Initiate USSD session for contract authorization
 */
export async function initiateUSSDSession(
  phoneNumber: string,
  policyNumber: string,
  contractId: string
): Promise<USSDSession> {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + BUSINESS_RULES.USSD_PIN_TIMEOUT_SECONDS * 1000);

  const session: USSDSession = {
    id: sessionId,
    phone_number: phoneNumber,
    session_id: `USSD-${Date.now()}`,
    policy_number: policyNumber,
    contract_id: contractId,
    state: 'INIT',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  await kv.set(`${USSD_PREFIX}${sessionId}`, JSON.stringify(session));
  await kv.set(`${USSD_PREFIX}contract:${contractId}`, sessionId);

  // Send SMS notification (simulated)
  await sendSMSNotification(phoneNumber, policyNumber, contractId);

  await createAuditLog({
    entity_type: 'ussd_session',
    entity_id: sessionId,
    action: 'initiated',
    actor: 'system',
    changes: { session },
  });

  return session;
}

/**
 * Process PIN entry from USSD/SMS
 */
export async function processUSSDPINEntry(
  sessionId: string,
  pin: string
): Promise<{ 
  verified: boolean; 
  session: USSDSession; 
  reason?: string 
}> {
  const sessionData = await kv.get(`${USSD_PREFIX}${sessionId}`);
  if (!sessionData) {
    throw new Error('Session not found');
  }

  const session: USSDSession = JSON.parse(sessionData);

  // Check if session expired
  if (new Date() > new Date(session.expires_at)) {
    session.state = 'TIMEOUT';
    await kv.set(`${USSD_PREFIX}${sessionId}`, JSON.stringify(session));
    
    await createAuditLog({
      entity_type: 'ussd_session',
      entity_id: sessionId,
      action: 'timeout',
      actor: 'system',
      changes: { session },
    });
    
    return { verified: false, session, reason: 'Session expired' };
  }

  // Update session state
  session.state = 'PIN_ENTRY';
  await kv.set(`${USSD_PREFIX}${sessionId}`, JSON.stringify(session));

  // Verify PIN
  const verificationResult = await verifyPIN(session.policy_number, pin);

  if (verificationResult.verified) {
    session.state = 'VERIFIED';
    await kv.set(`${USSD_PREFIX}${sessionId}`, JSON.stringify(session));
    
    await createAuditLog({
      entity_type: 'ussd_session',
      entity_id: sessionId,
      action: 'verified',
      actor: session.phone_number,
      changes: { session },
    });
    
    return { verified: true, session };
  } else {
    session.state = 'FAILED';
    await kv.set(`${USSD_PREFIX}${sessionId}`, JSON.stringify(session));
    
    await createAuditLog({
      entity_type: 'ussd_session',
      entity_id: sessionId,
      action: 'verification_failed',
      actor: session.phone_number,
      changes: { session, reason: verificationResult.reason },
    });
    
    return { 
      verified: false, 
      session, 
      reason: verificationResult.reason 
    };
  }
}

/**
 * Get session by ID
 */
export async function getUSSDSession(sessionId: string): Promise<USSDSession | null> {
  const data = await kv.get(`${USSD_PREFIX}${sessionId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Get session by contract ID
 */
export async function getUSSDSessionByContract(contractId: string): Promise<USSDSession | null> {
  const sessionId = await kv.get(`${USSD_PREFIX}contract:${contractId}`);
  if (!sessionId) return null;
  return getUSSDSession(sessionId);
}

/**
 * Check BNPL limit via USSD (customer self-service)
 */
export async function checkLimitViaUSSD(phoneNumber: string): Promise<{
  success: boolean;
  limits?: {
    one_month: number;
    two_months: number;
    three_months: number;
  };
  message?: string;
}> {
  // This would integrate with USSD gateway in production
  // For now, we simulate the lookup
  
  try {
    const { getCustomerByPhone, getLimit } = await import('./policy-service.tsx');
    const customer = await getCustomerByPhone(phoneNumber);
    
    if (!customer) {
      return {
        success: false,
        message: 'Phone number not registered in BNPL system',
      };
    }

    // Get policy by phone (need to fetch from contracts)
    const allKeys = await kv.getByPrefix('policy:');
    let policyNumber = null;
    
    for (const key of allKeys) {
      const data = await kv.get(key);
      if (data) {
        const policy = JSON.parse(data);
        if (policy.phone_number === phoneNumber) {
          policyNumber = policy.policy_number;
          break;
        }
      }
    }

    if (!policyNumber) {
      return {
        success: false,
        message: 'No active policy found',
      };
    }

    const limit1 = await getLimit(policyNumber, 1);
    const limit2 = await getLimit(policyNumber, 2);
    const limit3 = await getLimit(policyNumber, 3);

    return {
      success: true,
      limits: {
        one_month: limit1?.available_amount || 0,
        two_months: limit2?.available_amount || 0,
        three_months: limit3?.available_amount || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error checking limit',
    };
  }
}

/**
 * Simulate sending SMS notification
 */
async function sendSMSNotification(
  phoneNumber: string,
  policyNumber: string,
  contractId: string
): Promise<void> {
  // In production, this would integrate with SMS gateway (e.g., Africa's Talking, Twilio)
  const message = `Nova Microfinance BNPL: Authorization required for your purchase. Reply with your PIN to approve. Ref: ${contractId.substring(0, 8)}`;
  
  console.log(`[SMS] Sending to ${phoneNumber}: ${message}`);
  
  // Simulate SMS API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`[SMS] Sent successfully to ${phoneNumber}`);
}

/**
 * Send SMS confirmation after successful authorization
 */
export async function sendAuthorizationConfirmation(
  phoneNumber: string,
  amount: number,
  tenorMonths: number,
  installmentAmount: number
): Promise<void> {
  const message = `Nova BNPL: Purchase of ${amount} approved. ${tenorMonths} monthly payments of ${installmentAmount.toFixed(2)} via payroll deduction. Thank you!`;
  
  console.log(`[SMS] Confirmation to ${phoneNumber}: ${message}`);
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Send payment reminder SMS
 */
export async function sendPaymentReminder(
  phoneNumber: string,
  amount: number,
  dueDate: string
): Promise<void> {
  const message = `Nova BNPL: Payment of ${amount.toFixed(2)} due on ${dueDate}. This will be deducted from your salary automatically.`;
  
  console.log(`[SMS] Reminder to ${phoneNumber}: ${message}`);
  await new Promise(resolve => setTimeout(resolve, 100));
}
