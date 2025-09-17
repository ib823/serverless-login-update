const BUCKETS: Record<string,{tokens:number;window:number}> = {
  webauthn:    { tokens: 10, window: 60 },
  oauth:       { tokens: 20, window: 60 },
  credentials: { tokens: 30, window: 60 },
  metrics:     { tokens:100, window: 60 },
  global:      { tokens:200, window: 60 },
};
type Rec = { count:number; resetAt:number };
const mem = new Map<string, Rec>();

function memCheck(bucket:string, id:string) {
  const cfg = BUCKETS[bucket] || { tokens: 10, window: 60 };
  const now = Date.now();
  const key = `${bucket}:${id}`;
  const rec = mem.get(key);
  if (!rec || now > rec.resetAt) {
    mem.set(key, { count: 1, resetAt: now + cfg.window*1000 });
    return true;
  }
  if (rec.count < cfg.tokens) { rec.count++; return true; }
  return false;
}

export const rateLimiter = {
  async check(bucket: keyof typeof BUCKETS | string, id: string) {
    // Dev: memory-only to avoid ENOTFOUND on placeholder Upstash URLs
    return memCheck(bucket as string, id);
  }
};
