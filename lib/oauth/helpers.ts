import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { setAuthCode, popAuthCode, setRefreshToken, getRefreshToken, deleteRefreshToken } from '@/lib/db/operations';

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SEC || 3600);
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL_SEC || 1209600);
const ID_TTL = Number(process.env.ID_TOKEN_TTL_SEC || 3600);

export function okClient(clientId: string, redirectUri: string) {
  const cid = process.env.OAUTH_CLIENT_ID || '';
  const allowed = (process.env.OAUTH_REDIRECT_URIS || '').split(',').map(s=>s.trim()).filter(Boolean);
  return clientId === cid && allowed.includes(redirectUri);
}

export function sha256b64url(input: string) {
  return createHash('sha256').update(input).digest().toString('base64url');
}

export async function issueCode(params: {
  userId: string, email: string, clientId: string, redirectUri: string,
  codeChallenge: string, method: 'S256'
}) {
  const code = randomBytes(32).toString('base64url');
  const now = Date.now();
  await setAuthCode({
    code,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    method: params.method,
    userId: params.userId,
    email: params.email,
    createdAt: now,
    expiresAt: now + 5*60*1000
  } as any);
  return code;
}

export async function exchangeCode(params: {
  code: string, clientId: string, redirectUri: string, codeVerifier: string
}) {
  const saved = await popAuthCode(params.code);
  if (!saved) throw new Error('invalid_code');

  if (saved.clientId !== params.clientId) throw new Error('invalid_client');
  if (saved.redirectUri !== params.redirectUri) throw new Error('invalid_redirect_uri');

  const expect = sha256b64url(params.codeVerifier);
  if (saved.method !== 'S256' || saved.codeChallenge !== expect) throw new Error('pkce_mismatch');

  return { userId: saved.userId as string, email: saved.email as string, clientId: saved.clientId as string };
}

export async function rotateRefresh(prevId: string | null, userId: string, clientId: string) {
  const tokenId = randomUUID();
  const now = Date.now();
  const rt = {
    tokenId, userId, clientId,
    rotationId: prevId || randomUUID(),
    prevId: prevId || undefined,
    expiresAt: now + REFRESH_TTL*1000,
  };
  await setRefreshToken(rt as any);
  if (prevId) await deleteRefreshToken(prevId);
  return tokenId;
}

export async function validateRefresh(tokenId: string) {
  const rec = await getRefreshToken(tokenId);
  if (!rec) throw new Error('invalid_refresh');
  return rec;
}

export { ACCESS_TTL, REFRESH_TTL, ID_TTL };
