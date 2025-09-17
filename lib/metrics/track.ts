import { redis } from '@/lib/db/redis';

function hourKey(name: string, d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  return `m:${name}:h:${y}${m}${day}${h}`;
}

export async function track(name: string, count = 1) {
  try { await redis.incrby(hourKey(name), count); } catch {}
}
