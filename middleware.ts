import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';
  const resp = NextResponse.next();

  const scriptSrc = isProd
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

  const connectSrc = isProd
    ? "connect-src 'self' https://api.upstash.com"
    : "connect-src 'self' ws: wss: https://api.upstash.com";

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    connectSrc,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  resp.headers.set('Content-Security-Policy', csp);
  resp.headers.set('X-Frame-Options', 'DENY');
  resp.headers.set('X-Content-Type-Options', 'nosniff');
  resp.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  resp.headers.set('Permissions-Policy', "publickey-credentials-get=(self)");
  resp.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (origin && allowed.includes(origin)) {
      resp.headers.set('Access-Control-Allow-Origin', origin);
      resp.headers.set('Access-Control-Allow-Credentials', 'true');
      resp.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      resp.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
    }
  }
  return resp;
}
export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' };
