import type { Request, Response } from 'express';
import { authUser } from '../auth/auth.middleware';
import { validatedParams, validatedQuery } from '../../common/middleware/validate';
import {
  professionalIdSchema,
  professionalListQuerySchema,
} from '../availability/availability.schema';
import {
  getProfessional,
  listProfessionals,
  slotsForProfessional,
} from '../availability/scheduling.service';

export async function list(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery(res, professionalListQuerySchema);
  const result = await listProfessionals(query);
  res.status(200).json(result);
}

export async function profile(_req: Request, res: Response): Promise<void> {
  const params = validatedParams(res, professionalIdSchema);
  const professional = await getProfessional(params.id);
  res.status(200).json({ professional });
}

export async function slots(_req: Request, res: Response): Promise<void> {
  const params = validatedParams(res, professionalIdSchema);
  const slotList = await slotsForProfessional({
    professionalId: params.id,
    viewerTimezone: authUser(res).timezone,
  });
  res.status(200).json({ slots: slotList });
}
