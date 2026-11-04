import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { validate } from '../../common/middleware/validate';
import { requireRole } from '../auth/auth.middleware';
import {
  professionalIdSchema,
  professionalListQuerySchema,
} from '../availability/availability.schema';
import { list, profile, slots } from './professionals.controller';

const member = requireRole('member', 'Only members can view professionals');

export const professionalsRouter = Router();

professionalsRouter.get(
  '/',
  asyncHandler(member),
  validate({ query: professionalListQuerySchema }),
  asyncHandler(list),
);
professionalsRouter.get(
  '/:id/slots',
  asyncHandler(member),
  validate({ params: professionalIdSchema }),
  asyncHandler(slots),
);
professionalsRouter.get(
  '/:id',
  asyncHandler(member),
  validate({ params: professionalIdSchema }),
  asyncHandler(profile),
);
