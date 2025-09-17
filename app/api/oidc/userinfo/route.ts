export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return NextResponse.json({ error: 'missing_bearer' }, { status: 401 });
  try {
    const { payload } = await verifyJWT(m[1]);
    return NextResponse.json({ sub: payload.sub, email: (payload as any).email });
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }
}
