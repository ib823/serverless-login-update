export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUser, setChallenge } from '@/lib/db/operations';
import { generateRegOptionsJSON, generateAuthOptionsJSON, rpFromRequest } from '@/lib/auth/webauthn';
import { rateLimiter } from '@/lib/security';
import { track } from '@/lib/metrics/track';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!(await rateLimiter.check('webauthn', ip))) {
    await track('rate_limit.dropped');
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const rp = rpFromRequest(request);
  const user = await getUser(email);
  const mode = user ? 'auth' : 'register' as const;

  const options = mode === 'auth'
    ? generateAuthOptionsJSON(user, rp.rpID)
    : generateRegOptionsJSON({ userId: crypto.randomUUID(), email, credentials: [], createdAt: Date.now() } as any, rp.rpID, rp.rpName);

  // Store challenge under both prefixes to avoid drift
  await setChallenge(`${mode}:${email}`, options.challenge);
  if (mode === 'register') await setChallenge(`reg:${email}`, options.challenge);
  if (mode === 'auth') await setChallenge(`auth:${email}`, options.challenge);

  await track('auth.begin');
  await track(mode === 'auth' ? 'auth.options' : 'reg.options');

  return NextResponse.json({ mode, options });
}
