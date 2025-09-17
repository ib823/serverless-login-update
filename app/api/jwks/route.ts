export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
export async function GET() {
  const current = JSON.parse(process.env.JWK_PUBLIC_CURRENT || 'null');
  const previous = JSON.parse(process.env.JWK_PUBLIC_PREVIOUS || '[]');
  const keys = [current, ...previous].filter(Boolean);
  return NextResponse.json({ keys });
}
