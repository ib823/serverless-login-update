import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  ISSUER: z.string().url(),
  RP_ID: z.string().min(1),
  RP_NAME: z.string().min(1).default('Passkeys IdP'),
  OAUTH_CLIENT_ID: z.string().min(1),
  OAUTH_REDIRECT_URIS: z.string().min(1),
  METRICS_BEARER: z.string().min(32),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(3600),
  REFRESH_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(1209600),
  ID_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(3600),
  // Optional but recommended
  ACTIVE_KID: z.string().optional(),
  JWK_PRIVATE_CURRENT: z.string().optional(),
  JWK_PUBLIC_CURRENT: z.string().optional(),
});
export const env = envSchema.parse(process.env);
