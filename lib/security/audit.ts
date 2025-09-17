export interface AuditEvent {
  ts?: string;
  type: string;
  userId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Minimal JSONL audit logger.
 * Enabled when ENABLE_AUDIT_LOGGING==='true'. Scrubs obvious secrets.
 */
export async function audit(evt: AuditEvent) {
  if (process.env.ENABLE_AUDIT_LOGGING !== 'true') return;
  const ts = new Date().toISOString();
  const scrub = (m?: Record<string, unknown>) => {
    if (!m) return undefined;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(m)) {
      out[k] = /token|secret|password|code/i.test(k) ? '[redacted]' : v;
    }
    return out;
  };
  const line = JSON.stringify({ ...evt, ts, metadata: scrub(evt.metadata) });
  // Write to stdout (JSONL sink)
  console.log(line);
}
