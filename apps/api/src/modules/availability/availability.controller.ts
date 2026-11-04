import type { Request, Response } from 'express';
import { authUser } from '../auth/auth.middleware';
import { validatedBody, validatedParams } from '../../common/middleware/validate';
import { blockedDateSchema, weeklyHoursSchema } from './availability.schema';
import { blockDate, getAvailability, replaceWeeklyHours, unblockDate } from './scheduling.service';

export async function readMine(_req: Request, res: Response): Promise<void> {
  const availability = await getAvailability(authUser(res).id);
  res.status(200).json({ availability });
}

export async function updateMine(_req: Request, res: Response): Promise<void> {
  const input = validatedBody(res, weeklyHoursSchema);
  const availability = await replaceWeeklyHours(authUser(res).id, input.intervals);
  res.status(200).json({ availability });
}

export async function addBlockedDate(_req: Request, res: Response): Promise<void> {
  const input = validatedBody(res, blockedDateSchema);
  const availability = await blockDate(authUser(res).id, input.date);
  res.status(200).json({ availability });
}

export async function removeBlockedDate(_req: Request, res: Response): Promise<void> {
  const params = validatedParams(res, blockedDateSchema);
  await unblockDate(authUser(res).id, params.date);
  res.status(204).send();
}
