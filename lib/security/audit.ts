import type { AuditEvent } from '@/lib/types';

export async function audit(event: AuditEvent) {
  if (process.env.ENABLE_AUDIT_LOGGING !== 'true') return;
  
  // In production, you might send to a logging service
  // For now, just console log
  console.log('[AUDIT]', JSON.stringify({
    timestamp: Date.now(),
    ...event
  }));
}
