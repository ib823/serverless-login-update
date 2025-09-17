import crypto from 'crypto';
import { 
  verifyRegistrationResponse, 
  verifyAuthenticationResponse 
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

function b64urlFromStr(s: string) {
  return Buffer.from(new TextEncoder().encode(s)).toString('base64url');
}

function newChallenge() {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateRegOptionsJSON(user: User, rpID: string, rpName: string) {
  const challenge = newChallenge();
  const options = {
    challenge,
    rp: { id: rpID, name: rpName },
    user: { 
      id: b64urlFromStr(user.userId), 
      name: user.email, 
      displayName: user.email.split('@')[0] 
    },
    pubKeyCredParams: [
      { type: 'public-key' as const, alg: -7 },
      { type: 'public-key' as const, alg: -257 },
      { type: 'public-key' as const, alg: -8 }
    ],
    timeout: 60000,
    authenticatorSelection: { 
      residentKey: 'preferred' as const, 
      userVerification: 'preferred' as const  // Changed from 'required' to 'preferred'
    },
    attestation: 'none' as const,
    excludeCredentials: (user.credentials || []).map(cred => ({ 
      id: cred.credId, 
      type: 'public-key' as const, 
      transports: cred.transports 
    })),
  };
  
  console.log('[WebAuthn] Registration options:', { rpID, challenge: challenge.substring(0, 10) + '...' });
  return options;
}

export function generateAuthOptionsJSON(_user: User | null, rpID: string) {
  const challenge = newChallenge();
  const options = {
    challenge,
    rpId: rpID,
    userVerification: 'preferred' as const,  // Changed from 'required' to 'preferred'
    timeout: 60000,
  };
  
  console.log('[WebAuthn] Auth options:', { rpID, challenge: challenge.substring(0, 10) + '...' });
  return options;
}

export async function verifyRegResponseWrap(
  response: any, 
  expectedChallenge: string, 
  expectedOrigin: string, 
  expectedRPID: string
) {
  console.log('[WebAuthn] Verifying registration:', { 
    expectedRPID, 
    expectedOrigin,
    responseId: response.id?.substring(0, 10) + '...'
  });
  
  return await verifyRegistrationResponse({ 
    response, 
    expectedChallenge, 
    expectedOrigin: [expectedOrigin], 
    expectedRPID, 
    requireUserVerification: false  // Changed from true to false
  });
}

export async function verifyAuthResponseWrap(
  response: any, 
  expectedChallenge: string, 
  expectedOrigin: string, 
  expectedRPID: string, 
  credential: any
) {
  console.log('[WebAuthn] Verifying auth:', { 
    expectedRPID, 
    expectedOrigin,
    credId: credential.credId?.substring(0, 10) + '...'
  });
  
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
    requireUserVerification: false  // Changed from true to false
  });
}
