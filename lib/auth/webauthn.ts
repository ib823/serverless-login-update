import crypto from 'crypto';
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { User } from '@/lib/types';

/** Derive RP ID + Origin from request, preferring forwarded headers (Codespaces/Proxies) */
export function rpFromRequest(req: Request | { headers: Headers; url: string }) {
  // Works for NextRequest and standard Request
  const headers = (req as any).headers as Headers;
  const get = (k: string) =>
    typeof headers?.get === 'function' ? headers.get(k) : undefined;

  const url = new URL((req as any).url);
  const xfProto = get('x-forwarded-proto');
  const xfHost = get('x-forwarded-host') || get('host');

  const proto = (xfProto || url.protocol.replace(':', '')).toLowerCase();
  const host  = (xfHost  || url.host);

  // RP ID should be a hostname (no scheme/port)
  const rpID = (process.env.RP_ID || host).replace(/:\d+$/, '');
  const origin = `${proto}://${host}`;
  const rpName = process.env.RP_NAME || 'Passkeys IdP';
  return { rpID, rpName, origin };
}

function b64urlFromStr(s: string) {
  return Buffer.from(new TextEncoder().encode(s)).toString('base64url');
}
function newChallenge() {
  return crypto.randomBytes(32).toString('base64url');
}

/** Registration options as pure JSON (safe to send to the browser) */
export function generateRegOptionsJSON(user: User, rpID: string, rpName: string) {
  const challenge = newChallenge();
  return {
    challenge,
    rp: { id: rpID, name: rpName },
    user: {
      id: b64urlFromStr(user.userId),
      name: user.email,
      displayName: user.email.split('@')[0],
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
      { type: 'public-key', alg: -8 },   // EdDSA
    ],
    timeout: 60000,
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
    attestation: 'none',
    excludeCredentials: (user.credentials || []).map(cred => ({
      id: cred.credId, type: 'public-key' as const, transports: cred.transports,
    })),
  };
}

/** Authentication options as pure JSON (safe to send to the browser) */
export function generateAuthOptionsJSON(user: User | null, rpID: string) {
  const challenge = newChallenge();
  return {
    challenge,
    rpId: rpID,
    allowCredentials: user ? user.credentials.map(cred => ({
      id: cred.credId, type: 'public-key' as const, transports: cred.transports,
    })) : undefined,
    userVerification: 'required' as const,
    timeout: 60000,
  };
}

/** Server-side verifiers */
export async function verifyRegResponseWrap(response: any, expectedChallenge: string, expectedOrigin: string, expectedRPID: string) {
  return await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: [expectedOrigin],
    expectedRPID,
    requireUserVerification: true,
  });
}

export async function verifyAuthResponseWrap(response: any, expectedChallenge: string, expectedOrigin: string, expectedRPID: string, credential: any) {
  return await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: [expectedOrigin],
    expectedRPID,
    authenticator: {
      credentialID: Buffer.from(credential.credId, 'base64url'),
      credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
      counter: credential.counter,
      transports: credential.transports,
    },
    requireUserVerification: true,
  });
}
