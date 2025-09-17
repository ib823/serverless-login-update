export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { deleteRefreshToken } from '@/lib/db/operations';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const p = new URLSearchParams(body);
  const token = p.get('token') || '';
  await deleteRefreshToken(token);
  return NextResponse.json({ revoked: true });
}
