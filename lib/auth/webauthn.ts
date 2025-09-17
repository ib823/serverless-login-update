import { randomBytes } from 'node:crypto';
import { 
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse, 
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import type { 
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import type { User } from '@/lib/types';

export function rpFromRequest(req: Request | { headers: Headers; url: string }) {
  const headers = (req as any).headers as Headers;
  const get = (k: string) => typeof headers?.get === 'function' ? headers.get(k) : undefined;
  const url = new URL((req as any).url);
  
  // Get the actual host from the request
  const proto = (get('x-forwarded-proto') || url.protocol.replace(':', '')).toLowerCase();
  const host = (get('x-forwarded-host') || get('host') || url.host);
  
  // Strip port for RP ID
  const rpID = host.replace(/:\d+$/, '');
  const origin = `${proto}://${host}`;
  const rpName = process.env.RP_NAME || 'Passkeys IdP';
  
  console.log('[WebAuthn] Config:', { rpID, origin, rpName });
  
  return { rpID, rpName, origin };
}

// FIXED: Correct types for @simplewebauthn/server
export async function generateRegOptions(user: User, rpID: string, rpName: string) {
  const userIDBuffer = new TextEncoder().encode(user.userId);
  
  const opts: GenerateRegistrationOptionsOpts = {
    rpID, 
    rpName,
    userID: userIDBuffer,
    userName: user.email,
    userDisplayName: user.email.split('@')[0],
    attestationType: 'none',
    // FIXED: excludeCredentials expects { id: string, transports?: AuthenticatorTransportFuture[] }
    excludeCredentials: (user.credentials || []).map(cred => ({
      id: cred.credId, // Already a string, no Buffer conversion needed
      transports: cred.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    supportedAlgorithmIDs: [-7, -257, -8],
    timeout: 60000,
  };
  
  return await generateRegistrationOptions(opts);
}

// FIXED: Correct types for @simplewebauthn/server
export async function generateAuthOptions(user: User | null, rpID: string) {
  const opts: GenerateAuthenticationOptionsOpts = {
    rpID,
    // FIXED: allowCredentials expects { id: string, transports?: AuthenticatorTransportFuture[] }
    allowCredentials: user ? user.credentials.map(cred => ({
      id: cred.credId, // Already a string, no Buffer conversion needed
      transports: cred.transports as AuthenticatorTransportFuture[],
    })) : undefined,
    userVerification: 'preferred',
    timeout: 60000,
  };
  
  return await generateAuthenticationOptions(opts);
}

// Standardized registration verification
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
    requireUserVerification: false,
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

// Standardized authentication verification
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
    requireUserVerification: false,
  });

  if (verification.verified && verification.authenticationInfo) {
    const { newCounter } = verification.authenticationInfo;
    // Log only; counters can be non-monotonic with multi-device passkeys
    if (newCounter > 0 && newCounter <= credential.counter) {
      console.warn('SECURITY_ALERT: Non-incrementing counter', { credId: credential.credId });
    }
    return { verified: true, newCounter } as const;
  }
  return { verified: false } as const;
}

// Backwards compatibility aliases
export const generateRegOptionsJSON = generateRegOptions;
export const generateAuthOptionsJSON = generateAuthOptions;
export const verifyRegResponseWrap = verifyRegResponse;
export const verifyAuthResponseWrap = verifyAuthResponse;
