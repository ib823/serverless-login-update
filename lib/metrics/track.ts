import { redis } from '@/lib/db/redis';
function hourKey(name: string, d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const day = String(d.getUTCDate()).padStart(2,'0');
  const h = String(d.getUTCHours()).padStart(2,'0');
  return `m:${name}:h:${y}${m}${day}${h}`;
}
export async function track(name: string, count = 1) {
  const rate = Number(process.env.METRICS_SAMPLE_RATE || '1');
  if (rate <= 0) return;
  if (rate < 1 && Math.random() > rate) return;
  const scaled = Math.max(1, Math.round(count / Math.max(rate, 1e-6)));
  await redis.incrby(hourKey(name), scaled);
}
