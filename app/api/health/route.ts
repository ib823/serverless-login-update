export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { redis } from '@/lib/db/redis';

export async function GET() {
  try {
    // Test Redis connection
    await redis.ping();
    
    return NextResponse.json({
      status: 'healthy',
      redis: true,
      time: Date.now(),
      version: '0.0.1'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      redis: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
