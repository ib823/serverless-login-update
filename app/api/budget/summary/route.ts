export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db/redis';

const METRICS = ['auth.begin','auth.options','auth.verify','reg.options','reg.verify','rate_limit.dropped'] as const;
type MetricName = typeof METRICS[number];

function last24HourKeys(name: MetricName, now = new Date()) {
  const keys: string[] = [];
  for (let i=0;i<24;i++){
    const d = new Date(now.getTime() - i*3600_000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth()+1).padStart(2,'0');
    const day = String(d.getUTCDate()).padStart(2,'0');
    const h = String(d.getUTCHours()).padStart(2,'0');
    keys.push(`m:${name}:h:${y}${m}${day}${h}`);
  }
  return keys;
}
async function sum24h(name: MetricName) {
  const keys = last24HourKeys(name);
  const vals = await redis.mget(...(keys as any));
  return (vals || []).reduce((a: number, v: any) => a + (Number(v)||0), 0);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.METRICS_BEARER}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [authBegin, authOptions, authVerify, regOptions, regVerify, rlDropped] = await Promise.all(METRICS.map(sum24h));

  const authEvents = Math.max(authVerify, Math.min(authBegin, authOptions));
  const regEvents  = Math.max(regVerify, Math.min(regOptions, regOptions));

  const AUTH_CMDS = Number(process.env.BUDGET_AUTH_CMDS_PER_EVENT || 6);
  const REG_CMDS  = Number(process.env.BUDGET_REG_CMDS_PER_EVENT  || 8);
  const FX_INV    = Number(process.env.BUDGET_FUNC_INVOCATIONS_PER_EVENT || 2);

  const commands24h = (authEvents * AUTH_CMDS) + (regEvents * REG_CMDS);
  const functions24h = (authEvents + regEvents) * FX_INV;

  const upstashCap   = Number(process.env.BUDGET_UPSTASH_FREE_CMDS || 500000);
  const vercelCap    = Number(process.env.BUDGET_VERCEL_FREE_INVOCATIONS || 100000);

  return NextResponse.json({
    windowHours: 24,
    counters: { authBegin, authOptions, authVerify, regOptions, regVerify, rlDropped },
    estimates: { redisCommands24h: commands24h, functions24h },
    quotas: { upstashFreeCommands: upstashCap, vercelFreeInvocations: vercelCap },
    utilization: {
      upstashPct: upstashCap ? Math.round((commands24h / upstashCap) * 100) : null,
      vercelPct: vercelCap ? Math.round((functions24h / vercelCap) * 100) : null
    }
  });
}
