type ExOpts = { ex?: number };

class MemRedis {
  private store = new Map<string, { value: string; exp?: number }>();

  async get(key: string) {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.exp && Date.now() > hit.exp) { this.store.delete(key); return null; }
    return hit.value;
  }
  async set(key: string, value: any, opts?: ExOpts) {
    const exp = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    this.store.set(key, { value: v, exp });
  }
  async del(key: string) { this.store.delete(key); }
  async incrby(key: string, n: number) {
    const curr = Number((await this.get(key)) ?? 0);
    const next = curr + n;
    await this.set(key, String(next));
    return next;
  }
  async mget<T = any>(...keys: string[]): Promise<(T | null)[]> {
    const out: (T | null)[] = [];
    for (const k of keys) {
      const v = await this.get(k);
      out.push(v === null ? null : (v as unknown as T));
    }
    return out;
  }
}
export const redis = new MemRedis();
