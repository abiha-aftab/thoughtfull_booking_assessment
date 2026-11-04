import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { validatedBody } from '../../common/middleware/validate';
import { loginUser, registerUser, revokeSession } from './auth.service';
import { authUser, readSessionToken } from './auth.middleware';
import { SESSION_COOKIE, sessionCookieOptions } from './auth.cookies';
import { loginSchema, registerSchema } from './auth.schema';

function sendUser(
  res: Response,
  status: number,
  issued: Awaited<ReturnType<typeof registerUser>>,
): void {
  res.cookie(SESSION_COOKIE, issued.token, sessionCookieOptions(issued.expiresAt, env.NODE_ENV));
  res.status(status).json({ user: issued.user });
}

export async function register(_req: Request, res: Response): Promise<void> {
  const issued = await registerUser(validatedBody(res, registerSchema));
  sendUser(res, 201, issued);
}

export async function login(_req: Request, res: Response): Promise<void> {
  const issued = await loginUser(validatedBody(res, loginSchema));
  sendUser(res, 200, issued);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await revokeSession(readSessionToken(req));
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(new Date(0), env.NODE_ENV));
  res.status(204).send();
}

export function me(_req: Request, res: Response): void {
  res.status(200).json({ user: authUser(res) });
}
