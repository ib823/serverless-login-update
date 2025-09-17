import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { User } from '@/lib/types';
import { SECURITY_CONFIG } from '@/lib/config/security';

export function rpFromRequest(req: Request | { headers: Headers; url: string }) {
  const headers = (req as any).headers as Headers;
  const get = (k: string) => typeof headers?.get === 'function' ? headers.get(k) : undefined;
  const url = new URL((req as any).url);
  
  const proto = (get('x-forwarded-proto') || url.protocol.replace(':', '')).toLowerCase();
  const host = (get('x-forwarded-host') || get('host') || url.host);
  
  const rpID = host.replace(/:\d+$/, '');
  const origin = `${proto}://${host}`;
  const rpName = process.env.RP_NAME || 'Passkeys IdP';
  
  console.log('[WebAuthn] Config:', { rpID, origin, rpName });
  
  return { rpID, rpName, origin };
}

// IMPORTANT: These functions are SYNCHRONOUS in @simplewebauthn/server v10+
export function generateRegOptions(user: User, rpID: string, rpName: string) {
  const userIDBuffer = new TextEncoder().encode(user.userId);
  
  // The library expects credential IDs as strings, NOT Buffers!
  return generateRegistrationOptions({
    rpID,
    rpName,
    userID: userIDBuffer,
    userName: user.email,
    userDisplayName: user.email.split('@')[0],
    attestationType: SECURITY_CONFIG.webauthn.attestationType,
    excludeCredentials: user.credentials.map(cred => ({
      id: cred.credId, // Already a base64url string - NO conversion needed!
      transports: cred.transports,
    })),
    authenticatorSelection: {
      authenticatorAttachment: SECURITY_CONFIG.webauthn.authenticatorAttachment,
      residentKey: SECURITY_CONFIG.webauthn.residentKey,
      userVerification: SECURITY_CONFIG.webauthn.userVerification,
    },
    supportedAlgorithmIDs: SECURITY_CONFIG.webauthn.supportedAlgorithms,
    timeout: SECURITY_CONFIG.webauthn.timeout,
  });
}

export function generateAuthOptions(user: User | null, rpID: string) {
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: user ? user.credentials.map(cred => ({
      id: cred.credId, // Already a base64url string - NO conversion needed!
      transports: cred.transports,
    })) : undefined,
    userVerification: SECURITY_CONFIG.webauthn.userVerification,
    timeout: SECURITY_CONFIG.webauthn.timeout,
  });
}

// For backward compatibility
export const generateRegOptionsJSON = generateRegOptions;
export const generateAuthOptionsJSON = generateAuthOptions;

export async function verifyRegResponse(response: any, expectedChallenge: string, expectedOrigin: string, expectedRPID: string) {
  console.log('[WebAuthn] Verifying registration:', { 
    expectedRPID, 
    expectedOrigin,
    responseId: response.id?.substring(0, 10) + '...'
  });
  
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: [expectedOrigin],
    expectedRPID,
    requireUserVerification: SECURITY_CONFIG.webauthn.userVerification === 'required',
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    return {
      verified: true,
      credentialID: Buffer.from(credential.id).toString('base64url'),
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter || 0,
      credentialDeviceType,
      credentialBackedUp,
      aaguid: credential.aaguid ? Buffer.from(credential.aaguid).toString('hex') : undefined,
    };
  }
  return { verified: false } as const;
}

export const verifyRegResponseWrap = verifyRegResponse;

export async function verifyAuthResponse(response: any, expectedChallenge: string, expectedOrigin: string, expectedRPID: string, credential: any) {
  console.log('[WebAuthn] Verifying auth:', { 
    expectedRPID, 
    expectedOrigin,
    credId: credential.credId?.substring(0, 10) + '...'
  });
  
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
    requireUserVerification: SECURITY_CONFIG.webauthn.userVerification === 'required',
  });

  if (verification.verified && verification.authenticationInfo) {
    const { newCounter } = verification.authenticationInfo;
    if (newCounter > 0 && newCounter <= credential.counter) {
      console.warn('SECURITY_ALERT: Non-incrementing counter', { credId: credential.credId });
    }
    return { verified: true, newCounter } as const;
  }
  return { verified: false } as const;
}

export const verifyAuthResponseWrap = verifyAuthResponse;
