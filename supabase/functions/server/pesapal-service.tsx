// Pesapal escrow payment service

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import type { PesapalTransaction } from './types.tsx';
import { createAuditLog } from './audit-service.tsx';

const PESAPAL_PREFIX = 'pesapal:';

// NOTE: In production, these would be read from environment variables
// For this prototype, we'll simulate Pesapal API interactions
const PESAPAL_CONSUMER_KEY = Deno.env.get('PESAPAL_CONSUMER_KEY') || 'demo_consumer_key';
const PESAPAL_CONSUMER_SECRET = Deno.env.get('PESAPAL_CONSUMER_SECRET') || 'demo_consumer_secret';
const PESAPAL_API_URL = Deno.env.get('PESAPAL_API_URL') || 'https://demo.pesapal.com/api';

/**
 * Hold funds in escrow (called after customer authorization)
 */
export async function holdFunds(
  contractId: string,
  amount: number,
  merchantReference: string
): Promise<PesapalTransaction> {
  const transactionId = uuidv4();
  const now = new Date().toISOString();

  // In production, this would call Pesapal API to create a hold/pre-authorization
  // For now, we simulate it
  const pesapalTrackingId = `PSP-${Date.now()}-${Math.random().toString(36).substring(7)}`.toUpperCase();

  const transaction: PesapalTransaction = {
    id: transactionId,
    contract_id: contractId,
    amount,
    type: 'HOLD',
    status: 'PENDING',
    pesapal_tracking_id: pesapalTrackingId,
    merchant_reference: merchantReference,
    created_at: now,
    completed_at: null,
  };

  await kv.set(`${PESAPAL_PREFIX}${transactionId}`, JSON.stringify(transaction));
  await kv.set(`${PESAPAL_PREFIX}contract:${contractId}:hold`, transactionId);

  // Simulate API call
  try {
    const holdResult = await simulatePesapalHold(amount, merchantReference, pesapalTrackingId);
    
    if (holdResult.success) {
      transaction.status = 'SUCCESS';
      transaction.completed_at = new Date().toISOString();
      await kv.set(`${PESAPAL_PREFIX}${transactionId}`, JSON.stringify(transaction));
    } else {
      transaction.status = 'FAILED';
      await kv.set(`${PESAPAL_PREFIX}${transactionId}`, JSON.stringify(transaction));
      throw new Error(`Pesapal hold failed: ${holdResult.error}`);
    }
  } catch (error) {
    transaction.status = 'FAILED';
    await kv.set(`${PESAPAL_PREFIX}${transactionId}`, JSON.stringify(transaction));
    throw error;
  }

  await createAuditLog({
    entity_type: 'pesapal_transaction',
    entity_id: transactionId,
    action: 'hold_created',
    actor: 'system',
    changes: { transaction },
  });

  return transaction;
}

/**
 * Release held funds to merchant (after delivery confirmation)
 */
export async function releaseFunds(contractId: string): Promise<PesapalTransaction> {
  // Get the hold transaction
  const holdTransactionId = await kv.get(`${PESAPAL_PREFIX}contract:${contractId}:hold`);
  if (!holdTransactionId) {
    throw new Error(`No hold transaction found for contract ${contractId}`);
  }

  const holdData = await kv.get(`${PESAPAL_PREFIX}${holdTransactionId}`);
  if (!holdData) {
    throw new Error(`Hold transaction ${holdTransactionId} not found`);
  }

  const holdTransaction: PesapalTransaction = JSON.parse(holdData);
  if (holdTransaction.status !== 'SUCCESS') {
    throw new Error(`Hold transaction is not in SUCCESS status`);
  }

  // Create release transaction
  const releaseId = uuidv4();
  const now = new Date().toISOString();

  const releaseTransaction: PesapalTransaction = {
    id: releaseId,
    contract_id: contractId,
    amount: holdTransaction.amount,
    type: 'RELEASE',
    status: 'PENDING',
    pesapal_tracking_id: holdTransaction.pesapal_tracking_id,
    merchant_reference: `RELEASE-${holdTransaction.merchant_reference}`,
    created_at: now,
    completed_at: null,
  };

  await kv.set(`${PESAPAL_PREFIX}${releaseId}`, JSON.stringify(releaseTransaction));

  // Simulate release API call
  try {
    const releaseResult = await simulatePesapalRelease(
      holdTransaction.pesapal_tracking_id,
      holdTransaction.amount
    );

    if (releaseResult.success) {
      releaseTransaction.status = 'SUCCESS';
      releaseTransaction.completed_at = new Date().toISOString();
      await kv.set(`${PESAPAL_PREFIX}${releaseId}`, JSON.stringify(releaseTransaction));
    } else {
      releaseTransaction.status = 'FAILED';
      await kv.set(`${PESAPAL_PREFIX}${releaseId}`, JSON.stringify(releaseTransaction));
      throw new Error(`Pesapal release failed: ${releaseResult.error}`);
    }
  } catch (error) {
    releaseTransaction.status = 'FAILED';
    await kv.set(`${PESAPAL_PREFIX}${releaseId}`, JSON.stringify(releaseTransaction));
    throw error;
  }

  await createAuditLog({
    entity_type: 'pesapal_transaction',
    entity_id: releaseId,
    action: 'funds_released',
    actor: 'system',
    changes: { transaction: releaseTransaction },
  });

  return releaseTransaction;
}

/**
 * Refund funds to escrow (in case of dispute/return)
 */
export async function refundFunds(
  contractId: string,
  amount: number
): Promise<PesapalTransaction> {
  const holdTransactionId = await kv.get(`${PESAPAL_PREFIX}contract:${contractId}:hold`);
  if (!holdTransactionId) {
    throw new Error(`No hold transaction found for contract ${contractId}`);
  }

  const holdData = await kv.get(`${PESAPAL_PREFIX}${holdTransactionId}`);
  if (!holdData) {
    throw new Error(`Hold transaction ${holdTransactionId} not found`);
  }

  const holdTransaction: PesapalTransaction = JSON.parse(holdData);

  const refundId = uuidv4();
  const now = new Date().toISOString();

  const refundTransaction: PesapalTransaction = {
    id: refundId,
    contract_id: contractId,
    amount,
    type: 'REFUND',
    status: 'PENDING',
    pesapal_tracking_id: holdTransaction.pesapal_tracking_id,
    merchant_reference: `REFUND-${holdTransaction.merchant_reference}`,
    created_at: now,
    completed_at: null,
  };

  await kv.set(`${PESAPAL_PREFIX}${refundId}`, JSON.stringify(refundTransaction));

  try {
    const refundResult = await simulatePesapalRefund(
      holdTransaction.pesapal_tracking_id,
      amount
    );

    if (refundResult.success) {
      refundTransaction.status = 'SUCCESS';
      refundTransaction.completed_at = new Date().toISOString();
      await kv.set(`${PESAPAL_PREFIX}${refundId}`, JSON.stringify(refundTransaction));
    } else {
      refundTransaction.status = 'FAILED';
      await kv.set(`${PESAPAL_PREFIX}${refundId}`, JSON.stringify(refundTransaction));
      throw new Error(`Pesapal refund failed: ${refundResult.error}`);
    }
  } catch (error) {
    refundTransaction.status = 'FAILED';
    await kv.set(`${PESAPAL_PREFIX}${refundId}`, JSON.stringify(refundTransaction));
    throw error;
  }

  await createAuditLog({
    entity_type: 'pesapal_transaction',
    entity_id: refundId,
    action: 'funds_refunded',
    actor: 'system',
    changes: { transaction: refundTransaction },
  });

  return refundTransaction;
}

/**
 * Get transaction by ID
 */
export async function getTransaction(transactionId: string): Promise<PesapalTransaction | null> {
  const data = await kv.get(`${PESAPAL_PREFIX}${transactionId}`);
  return data ? JSON.parse(data) : null;
}

// ========== SIMULATION FUNCTIONS (Replace with real Pesapal API in production) ==========

async function simulatePesapalHold(
  amount: number,
  merchantReference: string,
  trackingId: string
): Promise<{ success: boolean; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulate 98% success rate
  if (Math.random() > 0.02) {
    console.log(`[PESAPAL HOLD] Success: ${trackingId}, Amount: ${amount}, Ref: ${merchantReference}`);
    return { success: true };
  } else {
    console.log(`[PESAPAL HOLD] Failed: ${trackingId}`);
    return { success: false, error: 'Insufficient funds or card declined' };
  }
}

async function simulatePesapalRelease(
  trackingId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 99% success rate for releases
  if (Math.random() > 0.01) {
    console.log(`[PESAPAL RELEASE] Success: ${trackingId}, Amount: ${amount}`);
    return { success: true };
  } else {
    console.log(`[PESAPAL RELEASE] Failed: ${trackingId}`);
    return { success: false, error: 'Settlement account issue' };
  }
}

async function simulatePesapalRefund(
  trackingId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`[PESAPAL REFUND] Success: ${trackingId}, Amount: ${amount}`);
  return { success: true };
}
