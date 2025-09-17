export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthResponseWrap, rpFromRequest } from '@/lib/auth/webauthn';
import { getUser, popChallenge, updateUser, createSession } from '@/lib/db/operations';
import { audit } from '@/lib/security/audit';
import { rateLimiter } from '@/lib/security';
import { serialize } from 'cookie';
import { track } from '@/lib/metrics/track';

async function popAnyChallenge(email: string) {
  const e = email.toLowerCase();
  return (await popChallenge(`auth:${e}`)) || (await popChallenge(`authenticate:${e}`));
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!(await rateLimiter.check('webauthn', ip))) {
    await track('rate_limit.dropped');
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    const { email, response } = await request.json();
    const em = String(email || '').trim().toLowerCase();
    if (!em || !response?.id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const user = await getUser(em);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const credId = String(response.id);
    const cred = user.credentials.find(c => c.credId === credId);
    if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 400 });

    const challenge = await popAnyChallenge(em);
    if (!challenge) return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 });

    const rp = rpFromRequest(request);
    const verification = await verifyAuthResponseWrap(response, challenge, rp.origin, rp.rpID, cred);

    if (!verification?.verified || !verification.authenticationInfo) {
      await audit({ type: 'auth_failure', userId: user.userId, ip, metadata: { reason: 'verification_failed' } });
      return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
    }

    const { newCounter } = verification.authenticationInfo;
    if (typeof newCounter === 'number' && newCounter > cred.counter) cred.counter = newCounter;
    cred.lastUsedAt = Date.now();
    await updateUser(user);

    const session = { userId: user.userId, email: user.email, createdAt: Date.now(), expiresAt: Date.now() + 3600_000 };
    const sessionId = await createSession(session);

    const cookie = serialize('__Secure-session', sessionId, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 3600
    });

    await audit({ type: 'auth_success', userId: user.userId, ip, metadata: { credentialId: credId } });
    await track('auth.verify');

    return NextResponse.json({ success: true }, { headers: { 'Set-Cookie': cookie } });
  } catch (e: any) {
    const msg = e?.message || 'unknown';
    const cause = e?.cause?.message || undefined;
    const body = process.env.NODE_ENV === 'production' ? { error: 'Internal server error' } : { error: 'Internal server error', detail: msg, cause };
    await audit({ type: 'auth_failure', ip, metadata: { error: msg, cause } });
    return NextResponse.json(body, { status: 500 });
  }
}
