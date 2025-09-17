export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db/redis';
import { parse } from 'cookie';

export async function GET(req: NextRequest) {
  const cookies = req.headers.get('cookie') || '';
  const { ['__Secure-session']: sid } = parse(cookies);
  if (!sid) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const data = await redis.get(`session:${sid}`);
  if (!data) {
    // expire client cookie as well
    return NextResponse.json({ error: 'Session not found' }, {
      status: 401,
      headers: { 'Set-Cookie': '__Secure-session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict' }
    });
  }
  const session = typeof data === 'string' ? JSON.parse(data) : data;
  return NextResponse.json({ session });
}
