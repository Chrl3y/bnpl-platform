// Seed data initialization service

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import { hash } from 'npm:bcrypt';
import type { Employer, Merchant } from './types.tsx';

/**
 * Initialize demo employer
 */
export async function seedEmployer(): Promise<void> {
  const employerId = 'EMP-001';
  const existing = await kv.get(`employer:${employerId}`);
  
  if (!existing) {
    const employer: Employer = {
      id: employerId,
      name: 'Acme Corporation Ltd',
      contact_email: 'hr@acmecorp.com',
      contact_phone: '+254700123456',
      mou_signed: true,
      payroll_integration_type: 'API',
      api_key_hash: await hash('demo_employer_key', 10),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    
    await kv.set(`employer:${employerId}`, JSON.stringify(employer));
    console.log(`[SEED] Created employer: ${employerId}`);
  }
}

/**
 * Initialize demo merchant
 */
export async function seedMerchant(): Promise<void> {
  const merchantId = 'MERCH-001';
  const existing = await kv.get(`merchant:${merchantId}`);
  
  if (!existing) {
    const merchant: Merchant = {
      id: merchantId,
      name: 'Demo E-Commerce Store',
      api_key_hash: await hash('demo_merchant_key', 10),
      webhook_url: 'https://demo-merchant.com/webhook',
      settlement_bank_account: 'ACC-1234567890',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    
    await kv.set(`merchant:${merchantId}`, JSON.stringify(merchant));
    console.log(`[SEED] Created merchant: ${merchantId}`);
  }
}

/**
 * Initialize all seed data
 */
export async function initializeSeedData(): Promise<void> {
  console.log('[SEED] Initializing seed data...');
  await seedEmployer();
  await seedMerchant();
  console.log('[SEED] Seed data initialization complete');
}
