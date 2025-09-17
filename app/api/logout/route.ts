export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { redis } from '@/lib/db/redis';

export async function POST(req: NextRequest) {
  const cookies = req.headers.get('cookie') || '';
  const { ['__Secure-session']: sid } = parse(cookies);
  if (sid) await redis.del(`session:${sid}`);
  return NextResponse.json({ ok: true }, {
    headers: { 'Set-Cookie': '__Secure-session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict' }
  });
}
