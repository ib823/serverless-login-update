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
  const forceMode = String(body?.forceMode || '').toLowerCase(); // 'register' to force new passkey
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const rp = rpFromRequest(request);
  const existing = await getUser(email);
  const mode = forceMode === 'register' ? 'register' : (existing ? 'auth' : 'register');

  const userForReg = existing ?? { userId: crypto.randomUUID(), email, credentials: [], createdAt: Date.now() } as any;
  // IMPORTANT: generateAuthOptionsJSON omits allowCredentials to enable discoverable/QR sign-in
  const options = mode === 'auth'
    ? generateAuthOptionsJSON(existing, rp.rpID)
    : generateRegOptionsJSON(userForReg, rp.rpID, rp.rpName);

  await setChallenge(`${mode}:${email}`, options.challenge);
  if (mode === 'register') await setChallenge(`reg:${email}`, options.challenge);
  if (mode === 'auth') await setChallenge(`auth:${email}`, options.challenge);

  await track('auth.begin');
  await track(mode === 'auth' ? 'auth.options' : 'reg.options');

  return NextResponse.json({ mode, options });
}
