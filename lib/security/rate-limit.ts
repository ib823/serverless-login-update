import { Ratelimit } from '@upstash/ratelimit';
import { Redis as Upstash } from '@upstash/redis';

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const upstash = hasUpstash ? new Upstash({
  url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN!
}) : null;

const BUCKETS: Record<string,{tokens:number;window:number}> = {
  webauthn:{tokens:10,window:60}, oauth:{tokens:20,window:60},
  credentials:{tokens:30,window:60}, metrics:{tokens:100,window:60},
};

const mem = new Map<string,{count:number;resetAt:number}>();
function memCheck(bucket:string, id:string) {
  const cfg = BUCKETS[bucket] || {tokens:10,window:60};
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
    try {
      if (hasUpstash && upstash) {
        const cfg = BUCKETS[bucket as string] || {tokens:10,window:60};
        const rl = new Ratelimit({
          redis: upstash,
          limiter: Ratelimit.slidingWindow(cfg.tokens, `${cfg.window} s`),
          prefix: `rl:${bucket}`,
        });
        const r = await rl.limit(id);
        return r.success;
      }
    } catch (e:any) {
      console.warn('[ratelimit] Upstash unavailable, falling back to memory:', e?.message);
    }
    return memCheck(bucket as string, id);
  }
};
