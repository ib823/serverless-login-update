import { Redis as Upstash } from '@upstash/redis';

type TTL = { ex?: number };
class MemoryKV {
  private store = new Map<string, { v: any; exp?: number }>();
  private now() { return Math.floor(Date.now()/1000); }
  async set(key: string, v: any, ttl?: TTL) {
    const exp = ttl?.ex ? this.now() + ttl.ex : undefined;
    this.store.set(key, { v, exp });
    return 'OK';
  }
  async get<T = any>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.exp && this.now() >= e.exp) { this.store.delete(key); return null; }
    return e.v as T;
  }
  async del(key: string) { return Number(this.store.delete(key)); }
  async incrby(key: string, n: number) {
    const cur = Number(await this.get(key)) || 0;
    await this.set(key, cur + n); return cur + n;
  }
  async mget<T = any>(...keys: string[]): Promise<(T|null)[]> {
    return Promise.all(keys.map(k => this.get<T>(k)));
  }
}

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Ensure a single instance across module reloads / workers in dev
const g = globalThis as any;
g.__REDIS__ = g.__REDIS__ || (hasUpstash
  ? new Upstash({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : new MemoryKV());

export const redis = g.__REDIS__;
