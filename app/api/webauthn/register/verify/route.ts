export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRegResponse, rpFromRequest } from '@/lib/auth/webauthn';
import { getUser, createUser, updateUser, popChallenge, createSession } from '@/lib/db/operations';
import { audit } from '@/lib/security/audit';
import { rateLimiter } from '@/lib/security';
import { randomUUID } from 'node:crypto';
import { serialize } from 'cookie';
import { track } from '@/lib/metrics/track';
import type { User } from '@/lib/types';

async function popAnyRegisterChallenge(email: string) {
  const e = email.toLowerCase();
  // Try all possible challenge keys
  const keys = [`register:${e}`, `reg:${e}`];
  for (const key of keys) {
    const challenge = await popChallenge(key);
    if (challenge) return challenge;
  }
  return null;
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
    if (!em || !response) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const challenge = await popAnyRegisterChallenge(em);
    if (!challenge) return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 });

    const rp = rpFromRequest(request);
    const verification = await verifyRegResponse(response, challenge, rp.origin, rp.rpID);

    if (!verification?.verified) {
      await audit({ type: 'register_failure', userId: em, ip, metadata: { reason: 'verification_failed' } });
      return NextResponse.json({ error: 'Registration failed' }, { status: 400 });
    }

    const credId = verification.credentialID!;
    const pubKey = verification.credentialPublicKey!;
    const counter = verification.counter!;
    
    let user: User | null = await getUser(em);
    if (!user) {
      const newUser: User = { 
        userId: randomUUID(), 
        email: em, 
        credentials: [], 
        createdAt: Date.now() 
      };
      await createUser(newUser);
      user = newUser;
    }

    if (!user.credentials.some(c => c.credId === credId)) {
      user.credentials.push({
        credId: credId,
        publicKey: pubKey,
        counter,
        transports: response?.response?.transports,
        credentialDeviceType: verification.credentialDeviceType,
        credentialBackedUp: verification.credentialBackedUp,
        aaguid: verification.aaguid,
        friendlyName: `Passkey ${user.credentials.length + 1}`,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      });
      await updateUser(user);
    }

    const session = { userId: user.userId, email: user.email, createdAt: Date.now(), expiresAt: Date.now() + 3600_000 };
    const sessionId = await createSession(session);

    const cookie = serialize('__Secure-session', sessionId, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 3600
    });

    await audit({ type: 'register_success', userId: user.userId, ip, metadata: { credentialId: credId } });
    await track('reg.verify');

    return NextResponse.json({ success: true }, { headers: { 'Set-Cookie': cookie } });
  } catch (e: any) {
    const msg = e?.message || 'unknown';
    const cause = e?.cause?.message || undefined;
    console.error('[register/verify] ERROR:', msg, cause);
    const body = process.env.NODE_ENV === 'production'
      ? { error: 'Internal server error' }
      : { error: 'Internal server error', detail: msg, cause };
    await audit({ type: 'register_failure', ip, metadata: { error: msg, cause } });
    return NextResponse.json(body, { status: 500 });
  }
}
