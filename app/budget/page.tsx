export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';

async function getData() {
  const bearer = process.env.METRICS_BEARER!;
  const isProd = process.env.NODE_ENV === 'production';

  let base: string;
  if (isProd) {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('host')!;
    base = `${proto}://${host}`;
  } else {
    base = 'http://localhost:3000';
  }

  const res = await fetch(`${base}/api/budget/summary`, {
    headers: { Authorization: `Bearer ${bearer}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to load budget summary (${res.status})`);
  return res.json();
}

function Bar({ pct }: { pct: number | null }) {
  if (pct == null) return <div className="h-2 w-full bg-zinc-200 rounded"/>;
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full bg-zinc-200 rounded">
      <div className="h-2 bg-zinc-900 rounded" style={{ width: `${w}%` }} />
    </div>
  );
}

export default async function BudgetPage() {
  const data = await getData();
  const { counters, estimates, quotas, utilization } = data;
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Free-Tier Budget Dashboard</h1>
      <p className="text-sm text-zinc-600">Rolling last 24h (sampling={process.env.METRICS_SAMPLE_RATE || '1'}).</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border bg-white">
          <h2 className="font-medium mb-2">Upstash Redis</h2>
          <div className="text-3xl font-semibold">
            {estimates.redisCommands24h.toLocaleString()} / {quotas.upstashFreeCommands.toLocaleString()}
          </div>
          <Bar pct={utilization.upstashPct} />
          <div className="mt-2 text-xs text-zinc-600">{utilization.upstashPct}% of free tier</div>
        </div>
        <div className="p-4 rounded-xl border bg-white">
          <h2 className="font-medium mb-2">Vercel Functions</h2>
          <div className="text-3xl font-semibold">
            {estimates.functions24h.toLocaleString()} / {quotas.vercelFreeInvocations.toLocaleString()}
          </div>
          <Bar pct={utilization.vercelPct} />
          <div className="mt-2 text-xs text-zinc-600">{utilization.vercelPct}% of free tier</div>
        </div>
      </div>
      <div className="p-4 rounded-xl border bg-white">
        <h2 className="font-medium mb-3">Event Counters (24h)</h2>
        <ul className="text-sm grid grid-cols-2 gap-2">
          {Object.entries(counters).map(([k,v]) => (
            <li key={k} className="flex justify-between"><span>{k}</span><span className="font-medium">{v as number}</span></li>
          ))}
        </ul>
      </div>
    </main>
  );
}
