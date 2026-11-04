import type { Request, Response } from 'express';
import { validatedParams } from '../../common/middleware/validate';
import { authUser } from '../auth/auth.middleware';
import { sessionParamsSchema } from '../sessions/session.schema';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notification.service';

export async function list(_req: Request, res: Response): Promise<void> {
  const notifications = await listNotifications(authUser(res).id);
  res.status(200).json({ notifications });
}

export async function read(_req: Request, res: Response): Promise<void> {
  const params = validatedParams(res, sessionParamsSchema);
  const notification = await markNotificationRead(authUser(res).id, params.id);
  res.status(200).json({ notification });
}

export async function readAll(_req: Request, res: Response): Promise<void> {
  await markAllNotificationsRead(authUser(res).id);
  res.status(204).send();
}
