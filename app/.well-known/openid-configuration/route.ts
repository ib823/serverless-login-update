export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const issuer = `${url.protocol}//${url.host}`;
  return NextResponse.json({
    issuer,
    authorization_endpoint: issuer + '/api/oauth/authorize',
    token_endpoint: issuer + '/api/oauth/token',
    userinfo_endpoint: issuer + '/api/oidc/userinfo',
    jwks_uri: issuer + '/api/jwks',
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: ['none','client_secret_post'],
    grant_types_supported: ['authorization_code','refresh_token'],
    code_challenge_methods_supported: ['S256']
  });
}
