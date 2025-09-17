export const SECURITY_CONFIG = {
  webauthn: {
    timeout: 60000,
    userVerification: 'preferred' as const,
    attestationType: 'none' as const,
    authenticatorAttachment: undefined,
    residentKey: 'preferred' as const,
    supportedAlgorithms: [-7, -257, -8], // ES256, RS256, EdDSA
  },
  rateLimit: {
    webauthn: { tokens: 10, window: '1m' },
    oauth: { tokens: 20, window: '1m' },
    credentials: { tokens: 30, window: '1m' },
    metrics: { tokens: 100, window: '1m' },
  },
  session: {
    devCookieName: '__Secure-session',
    prodCookieName: '__Host-session',
    maxAge: 3600,
    sameSite: 'strict' as const,
    secure: true,
    httpOnly: true,
  },
  audit: {
    enabled: process.env.ENABLE_AUDIT_LOGGING === 'true',
    retentionDays: 90,
  },
  csrf: {
    headerName: 'x-csrf-token',
    cookieName: '__Host-csrf',
  },
};
