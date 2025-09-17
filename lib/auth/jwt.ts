import { SignJWT, jwtVerify, importJWK } from 'jose';

export async function signIdToken(payload: object) {
  const jwkRaw = process.env.JWK_PRIVATE_CURRENT;
  if (!jwkRaw) throw new Error('JWK_PRIVATE_CURRENT missing');
  const key = await importJWK(JSON.parse(jwkRaw), 'RS256');
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: process.env.ACTIVE_KID || 'dev-kid' })
    .setIssuedAt()
    .setIssuer(process.env.ISSUER || 'http://localhost:3000')
    .setAudience(process.env.OAUTH_CLIENT_ID || 'demo-client')
    .setExpirationTime(`${process.env.ID_TOKEN_TTL_SEC || 3600}s`)
    .sign(key);
}

export async function verifyToken(token: string, jwkPublic: any) {
  const key = await importJWK(jwkPublic, 'RS256');
  return await jwtVerify(token, key, { issuer: process.env.ISSUER || 'http://localhost:3000' });
}

export async function currentPublicJWKS() {
  const current = JSON.parse(process.env.JWK_PUBLIC_CURRENT || 'null');
  const previous = JSON.parse(process.env.JWK_PUBLIC_PREVIOUS || '[]');
  const keys = [current, ...previous].filter(Boolean);
  return { keys };
}
