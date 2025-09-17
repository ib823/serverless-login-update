export const runtime = 'nodejs';

import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

type Cred = {
  credId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
};

export function rpFromRequest(req: Request) {
  const url = new URL(req.url);
  const host = url.host; // includes :port if present
  const rpID = process.env.RP_ID || host.replace(/:\d+$/, '');
  const rpName = process.env.RP_NAME || 'Passkeys IdP';
  const origin = `${url.protocol}//${url.host}`;
  return { rpID, rpName, origin };
}

/** Exactly what app/api/webauthn/begin imports */
export function generateRegOptionsJSON(
  user: { userId: string; email: string; credentials: Cred[] },
  rpID: string,
  rpName: string
) {
  return generateRegistrationOptions({
    rpID,
    rpName,
    userName: user.email,
    userDisplayName: user.email.split('@')[0],
    userID: new TextEncoder().encode(user.userId),
    attestationType: 'none',
    supportedAlgorithmIDs: [-7, -257, -8], // ES256, RS256, EdDSA
    timeout: 60000,
    excludeCredentials: (user.credentials || []).map((c) => ({
      id: Buffer.from(c.credId, 'base64url'),
      type: 'public-key' as const,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });
}

/** Exactly what app/api/webauthn/begin imports */
export function generateAuthOptionsJSON(
  user: { credentials: Cred[] } | null,
  rpID: string
) {
  return generateAuthenticationOptions({
    rpID,
    timeout: 60000,
    userVerification: 'required',
    allowCredentials: user
      ? (user.credentials || []).map((c) => ({
          id: Buffer.from(c.credId, 'base64url'),
          type: 'public-key' as const,
          transports: c.transports,
        }))
      : undefined,
  });
}

/** Exactly what app/api/webauthn/register/verify imports */
export async function verifyRegResponseWrap(
  response: any,
  expectedChallenge: string,
  expectedOrigin: string,
  expectedRPID: string
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: [expectedOrigin],
    expectedRPID,
    requireUserVerification: true,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential, credentialBackedUp, credentialDeviceType } =
      verification.registrationInfo;

    return {
      verified: true as const,
      credentialID: Buffer.from(credential.id).toString('base64url'),
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter || 0,
      credentialBackedUp,
      credentialDeviceType,
      aaguid: credential.aaguid
        ? Buffer.from(credential.aaguid).toString('hex')
        : undefined,
    };
  }
  return { verified: false as const };
}

/** Optional auth verify helper (kept for symmetry) */
export async function verifyAuthResponseWrap(
  response: any,
  expectedChallenge: string,
  expectedOrigin: string,
  expectedRPID: string,
  credential: Cred
) {
  const verification = await verifyAuthenticationResponse({
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

  if (verification.verified && verification.authenticationInfo) {
    const { newCounter } = verification.authenticationInfo;
    return { verified: true as const, newCounter };
  }
  return { verified: false as const };
}
