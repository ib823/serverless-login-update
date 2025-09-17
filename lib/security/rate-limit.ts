import { Ratelimit } from '@upstash/ratelimit';
import { Redis as Upstash } from '@upstash/redis';
const BUCKETS = {
  webauthn: { tokens: 10, window: 60 },
  oauth: { tokens: 20, window: 60 },
  credentials: { tokens: 30, window: 60 },
  metrics: { tokens: 100, window: 60 }
} as const;

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const upstash = hasUpstash ? new Upstash({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! }) : null;

const mem = new Map<string, number[]>();
function memCheck(bucket: keyof typeof BUCKETS, id: string) {
  const { tokens, window } = BUCKETS[bucket];
  const now = Date.now();
  const key = `${bucket}:${id}`;
  const arr = mem.get(key) || [];
  const fresh = arr.filter(ts => now - ts < window*1000);
  if (fresh.length >= tokens) { mem.set(key, fresh); return false; }
  fresh.push(now); mem.set(key, fresh); return true;
}

export const rateLimiter = {
  async check(bucket: keyof typeof BUCKETS, id: string) {
    if (hasUpstash && upstash) {
      const rl = new Ratelimit({ redis: upstash, limiter: Ratelimit.slidingWindow(BUCKETS[bucket].tokens, `${BUCKETS[bucket].window} s`), prefix: `rl:${bucket}` });
      const r = await rl.limit(id);
      return r.success;
    }
    return memCheck(bucket, id);
  }
};
