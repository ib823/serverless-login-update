export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { validateRefresh, rotateRefresh, ACCESS_TTL, ID_TTL } from '@/lib/oauth/helpers';
import { signJWT } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const p = new URLSearchParams(body);
  const grant = p.get('grant_type');
  if (grant !== 'refresh_token') return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });

  try {
    const tokenId = p.get('refresh_token') || '';
    const rec = await validateRefresh(tokenId);

    const access = await signJWT({ sub: rec.userId, scope: 'openid email profile' }, ACCESS_TTL);
    const id = await signJWT({ sub: rec.userId }, ID_TTL);
    const next = await rotateRefresh(rec.tokenId, rec.userId, rec.clientId);

    return NextResponse.json({
      token_type: 'Bearer',
      expires_in: ACCESS_TTL,
      access_token: access,
      id_token: id,
      refresh_token: next,
    });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'invalid_request' }, { status: 400 });
  }
}
