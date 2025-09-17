export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { currentPublicJWKS } from '@/lib/auth/jwt';
export async function GET() {
  return NextResponse.json(await currentPublicJWKS());
}
