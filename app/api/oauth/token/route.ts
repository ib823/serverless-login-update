export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, rotateRefresh, ACCESS_TTL, ID_TTL } from '@/lib/oauth/helpers';
import { signJWT } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const p = new URLSearchParams(body);

  const grant = p.get('grant_type');
  if (grant !== 'authorization_code') return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });

  try {
    const data = await exchangeCode({
      code: p.get('code') || '',
      clientId: p.get('client_id') || '',
      redirectUri: p.get('redirect_uri') || '',
      codeVerifier: p.get('code_verifier') || '',
    });

    const sub = data.userId;
    const email = data.email;

    const access = await signJWT({ sub, scope: 'openid email profile' }, ACCESS_TTL);
    const id = await signJWT({ sub, email }, ID_TTL);
    const refresh = await rotateRefresh(null, sub, data.clientId);

    return NextResponse.json({
      token_type: 'Bearer',
      expires_in: ACCESS_TTL,
      access_token: access,
      id_token: id,
      refresh_token: refresh,
    });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'invalid_request' }, { status: 400 });
  }
}
