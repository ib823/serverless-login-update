export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getUser, setChallenge } from '@/lib/db/operations';
import { generateRegOptions, generateAuthOptions, rpFromRequest } from '@/lib/auth/webauthn';
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
  const forceMode = String(body?.forceMode || '').toLowerCase();
  
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const rp = rpFromRequest(request);
  const existing = await getUser(email);
  const mode = forceMode === 'register' ? 'register' : (existing ? 'auth' : 'register');

  const userForReg = existing ?? { 
    userId: randomUUID(), 
    email, 
    credentials: [], 
    createdAt: Date.now() 
  } as any;

  const options = mode === 'auth'
    ? generateAuthOptions(existing, rp.rpID)
    : generateRegOptions(userForReg, rp.rpID, rp.rpName);

  // Store challenge with all possible keys for compatibility
  const challengeValue = options.challenge;
  await setChallenge(`${mode}:${email}`, challengeValue);
  
  // Also store with both register variations for compatibility
  if (mode === 'register') {
    await setChallenge(`register:${email}`, challengeValue);
    await setChallenge(`reg:${email}`, challengeValue);
  } else {
    await setChallenge(`auth:${email}`, challengeValue);
    await setChallenge(`authenticate:${email}`, challengeValue);
  }

  await track('auth.begin');
  await track(mode === 'auth' ? 'auth.options' : 'reg.options');

  return NextResponse.json({ mode, options });
}
