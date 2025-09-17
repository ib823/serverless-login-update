export interface Credential {
  credId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  friendlyName?: string;
  createdAt: number;
  lastUsedAt: number;
  aaguid?: string;
  credentialDeviceType?: string;
  credentialBackedUp?: boolean;
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
  expiresAt: number;
}
export interface AuthCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}
export interface RefreshToken {
  tokenId: string;
  userId: string;
  clientId: string;
  rotationId: string;
  prevId?: string;
  expiresAt: number;
}
