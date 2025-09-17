import type { AuditEvent } from '@/lib/types';
export async function audit(ev: AuditEvent) {
  if (process.env.ENABLE_AUDIT_LOGGING !== 'true') return;
  const rec = { ts: new Date().toISOString(), ...ev };
  console.log(JSON.stringify(rec));
}
