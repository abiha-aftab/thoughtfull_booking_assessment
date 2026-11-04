import type { AuthenticatedUser } from '@thoughtfull/shared';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error';
import { userForToken } from './auth.service';
import { SESSION_COOKIE } from './auth.cookies';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.timezone !== 'string'
  ) {
    return false;
  }
  if (value.role === 'member') {
    return true;
  }
  return (
    value.role === 'professional' &&
    typeof value.title === 'string' &&
    typeof value.bio === 'string'
  );
}

export function readSessionToken(req: Request): string | undefined {
  const cookies: unknown = req.cookies;
  if (!isRecord(cookies) || !(SESSION_COOKIE in cookies)) {
    return undefined;
  }
  const token = cookies[SESSION_COOKIE];
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

export function authUser(res: Response): AuthenticatedUser {
  const value: unknown = res.locals.authUser;
  if (!isAuthenticatedUser(value)) {
    throw new AppError(401, 'unauthenticated', 'Sign in to continue');
  }
  return value;
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await userForToken(readSessionToken(req));
  if (!user) {
    throw new AppError(401, 'unauthenticated', 'Sign in to continue');
  }
  res.locals.authUser = user;
  next();
}
