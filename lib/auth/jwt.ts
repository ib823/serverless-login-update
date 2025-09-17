import { SignJWT, jwtVerify, importJWK, generateKeyPair, exportJWK, JWK } from 'jose';

const KID = process.env.ACTIVE_KID || 'dev-kid';
let DEV_PRIV: JWK | null = null;
let DEV_PUB: JWK | null = null;

async function getPriv(): Promise<JWK> {
  if (process.env.JWK_PRIVATE_CURRENT) return JSON.parse(process.env.JWK_PRIVATE_CURRENT);
  if (!DEV_PRIV) {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    DEV_PRIV = await exportJWK(privateKey); (DEV_PRIV as any).kid = KID; (DEV_PRIV as any).alg = 'RS256';
    DEV_PUB  = await exportJWK(publicKey);  (DEV_PUB  as any).kid = KID; (DEV_PUB  as any).alg = 'RS256';
  }
  return DEV_PRIV!;
}

export async function currentPublicJWKS(): Promise<{keys:JWK[]}> {
  if (process.env.JWK_PUBLIC_CURRENT) {
    const cur = JSON.parse(process.env.JWK_PUBLIC_CURRENT);
    const prev = JSON.parse(process.env.JWK_PUBLIC_PREVIOUS || '[]');
    return { keys: [cur, ...prev].filter(Boolean) };
  }
  if (!DEV_PUB) await getPriv();
  return { keys: [DEV_PUB!] };
}

export async function signJWT(payload: Record<string, any>, ttlSec: number) {
  const jwk = await getPriv();
  const key = await importJWK(jwk, 'RS256');
  const now = Math.floor(Date.now()/1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuedAt(now)
    .setIssuer(process.env.ISSUER || '')
    .setAudience(process.env.OAUTH_CLIENT_ID || '')
    .setExpirationTime(now + (ttlSec||3600))
    .sign(key);
}

export async function verifyJWT(token: string, jwkPublic?: any) {
  const pub = jwkPublic || (await currentPublicJWKS()).keys[0];
  const key = await importJWK(pub, 'RS256');
  return jwtVerify(token, key, { issuer: process.env.ISSUER || '' });
}
