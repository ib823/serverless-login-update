import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/db/redis';
import { SECURITY_CONFIG } from '@/lib/config/security';

// Create rate limiters for different endpoints
const limiters = {
  webauthn: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      SECURITY_CONFIG.rateLimit.webauthn.tokens,
      SECURITY_CONFIG.rateLimit.webauthn.window
    ),
  }),
  oauth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      SECURITY_CONFIG.rateLimit.oauth.tokens,
      SECURITY_CONFIG.rateLimit.oauth.window
    ),
  }),
  credentials: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      SECURITY_CONFIG.rateLimit.credentials.tokens,
      SECURITY_CONFIG.rateLimit.credentials.window
    ),
  }),
  metrics: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      SECURITY_CONFIG.rateLimit.metrics.tokens,
      SECURITY_CONFIG.rateLimit.metrics.window
    ),
  }),
};

export const rateLimiter = {
  check: async (type: keyof typeof limiters, identifier: string) => {
    const limiter = limiters[type];
    const { success } = await limiter.limit(identifier);
    return success;
  }
};
