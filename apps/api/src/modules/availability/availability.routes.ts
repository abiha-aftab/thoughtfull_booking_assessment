import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate';
import { requireRole } from '../auth/auth.middleware';
import { addBlockedDate, readMine, removeBlockedDate, updateMine } from './availability.controller';
import { blockedDateSchema, weeklyHoursSchema } from './availability.schema';

const professional = requireRole('professional', 'Only professionals can edit availability');

export const availabilityRouter = Router();

availabilityRouter.get('/me', asyncHandler(professional), asyncHandler(readMine));
availabilityRouter.put(
  '/me',
  asyncHandler(professional),
  validate({ body: weeklyHoursSchema }),
  asyncHandler(updateMine),
);
availabilityRouter.post(
  '/me/blocked-dates',
  asyncHandler(professional),
  validate({ body: blockedDateSchema }),
  asyncHandler(addBlockedDate),
);
availabilityRouter.delete(
  '/me/blocked-dates/:date',
  asyncHandler(professional),
  validate({ params: blockedDateSchema }),
  asyncHandler(removeBlockedDate),
);
