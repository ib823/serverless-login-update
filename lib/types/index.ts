import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

export interface Credential {
  credId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  credentialDeviceType?: string;
  credentialBackedUp?: boolean;
  aaguid?: string;
  friendlyName?: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface User {
  userId: string;
  email: string;
  credentials: Credential[];
  createdAt: number;
}

export interface Session {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number; // epoch ms
}

export interface AuthCode {
  code: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  method: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

export interface RefreshToken {
  tokenId: string;
  userId: string;
  clientId: string;
  rotationId: string;
  prevId?: string;
  expiresAt: number;
}

export interface AuditEvent {
  type: string;
  userId?: string;
  ip?: string;
  metadata?: Record<string, any>;
}
