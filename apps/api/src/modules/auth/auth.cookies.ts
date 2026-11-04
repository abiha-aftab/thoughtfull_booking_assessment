import type { Env } from '../../config/env';

export const SESSION_COOKIE = 'session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(expiresAt: Date, nodeEnv: Env['NODE_ENV']) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: nodeEnv === 'production',
    path: '/',
    expires: expiresAt,
  };
}
