export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { redis } from '@/lib/db/redis';
import { issueCode, okClient } from '@/lib/oauth/helpers';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const client_id = url.searchParams.get('client_id') || '';
  const redirect_uri = url.searchParams.get('redirect_uri') || '';
  const state = url.searchParams.get('state') || '';
  const code_challenge = url.searchParams.get('code_challenge') || '';
  const code_method = (url.searchParams.get('code_challenge_method') || 'S256') as 'S256';

  if (!okClient(client_id, redirect_uri)) {
    return NextResponse.json({ error: 'invalid_client_or_redirect' }, { status: 400 });
  }
  if (!code_challenge || code_method !== 'S256') {
    return NextResponse.json({ error: 'invalid_pkce' }, { status: 400 });
  }

  // require session cookie
  const cookies = req.headers.get('cookie') || '';
  const sid = parse(cookies)['__Secure-session'];
  if (!sid) return NextResponse.json({ error: 'login_required' }, { status: 401 });

  const sess = await redis.get(`session:${sid}`);
  if (!sess) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const session = typeof sess === 'string' ? JSON.parse(sess) : sess;

  const code = await issueCode({
    userId: session.userId, email: session.email,
    clientId: client_id, redirectUri: redirect_uri,
    codeChallenge: code_challenge, method: 'S256'
  });

  const loc = new URL(redirect_uri);
  loc.searchParams.set('code', code);
  if (state) loc.searchParams.set('state', state);

  return NextResponse.redirect(loc.toString(), { status: 302 });
}
