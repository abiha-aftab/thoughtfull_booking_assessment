import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { rateLimit } from '../../common/middleware/rate-limit';
import { validate } from '../../common/middleware/validate';
import { env } from '../../config/env';
import { login, logout, me, register } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';
import { requireUser } from './auth.middleware';

const authAttempts = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1_000 : 20,
});

export const authRouter = Router();

authRouter.post(
  '/register',
  authAttempts,
  validate({ body: registerSchema }),
  asyncHandler(register),
);
authRouter.post('/login', authAttempts, validate({ body: loginSchema }), asyncHandler(login));
authRouter.post('/logout', asyncHandler(logout));
authRouter.get('/me', asyncHandler(requireUser), me);
