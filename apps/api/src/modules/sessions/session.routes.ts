import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate';
import { requireRole, requireUser } from '../auth/auth.middleware';
import { cancel, create, list, read, reschedule, schedule } from './session.controller';
import {
  bookSessionSchema,
  rescheduleSessionSchema,
  sessionListQuerySchema,
  sessionParamsSchema,
} from './session.schema';

const member = requireRole('member', 'Only members can book sessions');
const professional = requireRole('professional', 'Only professionals can view a schedule');

export const sessionsRouter = Router();

sessionsRouter.post(
  '/',
  asyncHandler(member),
  validate({ body: bookSessionSchema }),
  asyncHandler(create),
);
sessionsRouter.get('/schedule', asyncHandler(professional), asyncHandler(schedule));
sessionsRouter.get(
  '/',
  asyncHandler(member),
  validate({ query: sessionListQuerySchema }),
  asyncHandler(list),
);
sessionsRouter.get(
  '/:id',
  asyncHandler(requireUser),
  validate({ params: sessionParamsSchema }),
  asyncHandler(read),
);
sessionsRouter.post(
  '/:id/cancel',
  asyncHandler(requireUser),
  validate({ params: sessionParamsSchema }),
  asyncHandler(cancel),
);
sessionsRouter.post(
  '/:id/reschedule',
  asyncHandler(requireUser),
  validate({ body: rescheduleSessionSchema, params: sessionParamsSchema }),
  asyncHandler(reschedule),
);
