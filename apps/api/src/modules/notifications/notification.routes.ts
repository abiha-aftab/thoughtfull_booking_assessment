import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate';
import { requireUser } from '../auth/auth.middleware';
import { sessionParamsSchema } from '../sessions/session.schema';
import { list, read, readAll } from './notification.controller';

export const notificationsRouter = Router();

notificationsRouter.get('/', asyncHandler(requireUser), asyncHandler(list));
notificationsRouter.post('/read-all', asyncHandler(requireUser), asyncHandler(readAll));
notificationsRouter.post(
  '/:id/read',
  asyncHandler(requireUser),
  validate({ params: sessionParamsSchema }),
  asyncHandler(read),
);
