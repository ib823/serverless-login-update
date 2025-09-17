export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRegResponseWrap, rpFromRequest } from '@/lib/auth/webauthn';
import { getUser, createUser, updateUser, popChallenge, createSession } from '@/lib/db/operations';
import { serialize } from 'cookie';

function b64url(buf: ArrayBuffer | Uint8Array) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Buffer.from(u8).toString('base64url');
}

export async function POST(req: NextRequest) {
  try {
    const { origin, rpID } = rpFromRequest(req);
    const body = await req.json(); // expects { email, response }
    const email: string = (body?.email || '').toLowerCase().trim();
    const response = body?.response;

    if (!email || !response) {
      return NextResponse.json({ ok: false, error: 'missing_email_or_response' }, { status: 400 });
    }

    // Accept both prefixes to match any prior begin() version
    const challenge =
      (await popChallenge(`register:${email}`) || await popChallenge(`reg:${email}`)) ||
      (await popChallenge(`reg:${email}`));

    if (!challenge) {
      return NextResponse.json({ ok: false, error: 'missing_challenge' }, { status: 400 });
    }

    const { verified, registrationInfo } = await verifyRegResponseWrap({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verified || !registrationInfo) {
      return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 400 });
    }

    const credID    = b64url(registrationInfo.credentialID);
    const pubKey    = b64url(registrationInfo.credentialPublicKey);
    const counter   = registrationInfo.counter ?? 0;
    const transports = (response?.transports || []) as string[];

    // Upsert user + credential
    const existing = await getUser(email);
    if (!existing) {
      await createUser({
        email,
        credentials: [{ id: credID, publicKey: pubKey, counter, transports }],
      });
    } else {
      const creds = existing.credentials || [];
      const idx = creds.findIndex(c => c.id === credID);
      if (idx >= 0) {
        creds[idx] = { ...creds[idx], publicKey: pubKey, counter, transports };
      } else {
        creds.push({ id: credID, publicKey: pubKey, counter, transports });
      }
      await updateUser(email, { credentials: creds });
    }

    // Create session
    const sid = await createSession(email);
    const cookie = serialize('sid', sid, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Set-Cookie': cookie, 'content-type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[register/verify] ERROR:', e?.message, e?.stack);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
