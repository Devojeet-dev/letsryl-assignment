import { z } from 'zod';

export const sessionExchangeSchema = z.object({
  /** Google ID token, or a Supabase access token when the SPA already authenticated. */
  idToken: z.string().min(20).max(4096),
});

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  provider: z.enum(['google', 'supabase', 'app']),
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  user: authUserSchema,
});

export type SessionExchangeInput = z.infer<typeof sessionExchangeSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
