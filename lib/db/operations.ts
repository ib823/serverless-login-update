import { redis } from './redis';
import type { User, Session, AuthCode, RefreshToken } from '@/lib/types';
import { randomBytes } from 'node:crypto';

// Users
export async function createUser(user: User) {
  await redis.set(`user:${user.email}`, JSON.stringify(user));
  await redis.set(`user:id:${user.userId}`, user.email);
}

export async function getUser(email: string) {
  const data = await redis.get(`user:${email}`);
  return data ? JSON.parse(data as string) as User : null;
}

export async function updateUser(user: User) {
  await redis.set(`user:${user.email}`, JSON.stringify(user));
}

// Challenges
export async function setChallenge(key: string, challenge: string) {
  await redis.set(`challenge:${key}`, challenge, { ex: 300 });
}

export async function popChallenge(key: string) {
  const challenge = await redis.get(`challenge:${key}`);
  if (challenge) await redis.del(`challenge:${key}`);
  return (challenge as string) ?? null;
}

// Sessions – TTL in seconds
export async function createSession(session: Session) {
  const sessionId = randomBytes(32).toString('hex');
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = Math.floor(session.expiresAt / 1000);
  const ttl = Math.max(1, expSec - nowSec);
  await redis.set(`session:${sessionId}`, JSON.stringify(session), { ex: ttl });
  return sessionId;
}

export async function getSession(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data as string) as Session : null;
}

export async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}

// OAuth codes & refresh (rotation)
export async function setAuthCode(code: AuthCode) {
  await redis.set(`auth_code:${code.code}`, JSON.stringify(code), { ex: 300 });
}

export async function popAuthCode(code: string) {
  const data = await redis.get(`auth_code:${code}`);
  if (!data) return null;
  await redis.del(`auth_code:${code}`);
  return JSON.parse(data as string) as AuthCode;
}

export async function setRefreshToken(token: RefreshToken) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = Math.floor(token.expiresAt / 1000);
  const ttl = Math.max(1, expSec - nowSec);
  await redis.set(`refresh:${token.tokenId}`, JSON.stringify(token), { ex: ttl });
}

export async function getRefreshToken(tokenId: string) {
  const data = await redis.get(`refresh:${tokenId}`);
  return data ? JSON.parse(data as string) as RefreshToken : null;
}

export async function deleteRefreshToken(tokenId: string) {
  await redis.del(`refresh:${tokenId}`);
}
