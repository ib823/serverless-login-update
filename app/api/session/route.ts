export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db/operations';

export async function GET(request: NextRequest) {
  const cookies = request.headers.get('cookie') || '';
  const sessionId = cookies.split(';')
    .find(c => c.trim().startsWith('__Secure-session='))
    ?.split('=')[1];

  if (!sessionId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = await getSession(sessionId);
  
  if (!session || session.expiresAt < Date.now()) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  return NextResponse.json({ 
    session: {
      userId: session.userId,
      email: session.email,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }
  });
}
