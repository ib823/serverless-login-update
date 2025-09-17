export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db/operations';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  const cookies = request.headers.get('cookie') || '';
  const sessionId = cookies.split(';')
    .find(c => c.trim().startsWith('__Secure-session='))
    ?.split('=')[1];

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const cookie = serialize('__Secure-session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0 // This will delete the cookie
  });

  return NextResponse.json({ success: true }, { 
    headers: { 'Set-Cookie': cookie } 
  });
}
