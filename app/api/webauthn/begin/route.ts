export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUser, createUser, setChallenge } from '@/lib/db/operations';
import { generateRegOptionsJSON, generateAuthOptionsJSON, rpFromRequest } from '@/lib/auth/webauthn';
import { rateLimiter } from '@/lib/security';
import { track } from '@/lib/metrics/track';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!(await rateLimiter.check('webauthn', ip))) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const { rpID, rpName } = rpFromRequest(request);

    let user = await getUser(email);
    if (!user) {
      user = {
        userId: crypto.randomUUID(),
        email,
        credentials: [],
        createdAt: Date.now(),
      };
      await createUser(user);
    }

    const hasCreds = (user.credentials || []).length > 0;
    const mode: 'auth' | 'register' = hasCreds ? 'auth' : 'register';

    if (mode === 'register') {
      const options = await generateRegOptionsJSON(user, rpID, rpName);
      await setChallenge(`register:`, options.challenge);
  // Write both prefixes so verify can find it regardless of version
  await setChallenge(`register:${email}`, options.challenge);
  await setChallenge(`reg:${email}`, options.challenge);

  await setChallenge(`reg:`, options.challenge);
      await track('authBegin');     // matches your dashboard counters
      await track('regOptions');
      return NextResponse.json({ mode, options });
    } else {
      const options = await generateAuthOptionsJSON(user, rpID);
      await setChallenge(`auth:${email}`, options.challenge);
      await track('authBegin');
      await track('authOptions');
      return NextResponse.json({ mode, options });
    }
  } catch (err: any) {
    console.error('[webauthn/begin] ERROR:', err?.stack || err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
