// Audit logging service - immutable financial event tracking

import * as kv from './kv_store.tsx';
import { v4 as uuidv4 } from 'npm:uuid';
import type { AuditLog } from './types.tsx';

const AUDIT_PREFIX = 'audit:';

/**
 * Create immutable audit log entry
 */
export async function createAuditLog(data: {
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  changes: Record<string, unknown>;
}): Promise<AuditLog> {
  const auditId = uuidv4();
  const now = new Date().toISOString();

  const auditLog: AuditLog = {
    id: auditId,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    action: data.action,
    actor: data.actor,
    changes: data.changes,
    timestamp: now,
  };

  // Store with timestamp-based key for chronological ordering
  const key = `${AUDIT_PREFIX}${now}:${auditId}`;
  await kv.set(key, JSON.stringify(auditLog));

  // Also store by entity for easy lookup
  const entityKey = `${AUDIT_PREFIX}entity:${data.entity_type}:${data.entity_id}:${now}`;
  await kv.set(entityKey, auditId);

  return auditLog;
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
  entityType: string,
  entityId: string
): Promise<AuditLog[]> {
  const prefix = `${AUDIT_PREFIX}entity:${entityType}:${entityId}:`;
  const keys = await kv.getByPrefix(prefix);
  
  const logs: AuditLog[] = [];
  for (const key of keys) {
    const auditId = await kv.get(key);
    if (auditId) {
      // Find the actual audit log
      const allAuditKeys = await kv.getByPrefix(AUDIT_PREFIX);
      for (const auditKey of allAuditKeys) {
        if (auditKey.includes(auditId)) {
          const data = await kv.get(auditKey);
          if (data) {
            logs.push(JSON.parse(data));
            break;
          }
        }
      }
    }
  }
  
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get recent audit logs (for monitoring)
 */
export async function getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const allKeys = await kv.getByPrefix(AUDIT_PREFIX);
  const logs: AuditLog[] = [];
  
  for (const key of allKeys) {
    if (!key.includes('entity:')) {
      const data = await kv.get(key);
      if (data) {
        logs.push(JSON.parse(data));
      }
    }
  }
  
  return logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
