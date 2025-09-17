import { z } from 'zod';

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .toLowerCase()
  .trim();

export const uuidSchema = z.string().uuid();

export const challengeSchema = z.string()
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid challenge format')
  .min(43)
  .max(128);

export const codeVerifierSchema = z.string()
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid verifier format')
  .min(43)
  .max(128);

export async function validateRequestSize(req: Request, maxBytes = 10240) {
  const length = req.headers.get('content-length');
  if (length && parseInt(length) > maxBytes) {
    throw new Error('Request body too large');
  }
}
