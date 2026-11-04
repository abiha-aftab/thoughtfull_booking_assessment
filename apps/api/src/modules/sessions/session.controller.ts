import type { Request, Response } from 'express';
import { validatedBody, validatedParams, validatedQuery } from '../../common/middleware/validate';
import { authUser } from '../auth/auth.middleware';
import {
  bookSessionSchema,
  rescheduleSessionSchema,
  sessionListQuerySchema,
  sessionParamsSchema,
} from './session.schema';
import {
  bookSession,
  cancelSession,
  getSession,
  listMemberSessions,
  listProfessionalSchedule,
  rescheduleSession,
} from './session.service';

export async function create(_req: Request, res: Response): Promise<void> {
  const body = validatedBody(res, bookSessionSchema);
  const session = await bookSession({
    memberId: authUser(res).id,
    professionalId: body.professionalId,
    startAt: new Date(body.startAt),
  });
  res.status(201).json({ session });
}

export async function list(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery(res, sessionListQuerySchema);
  const sessions = await listMemberSessions(authUser(res).id, query.when);
  res.status(200).json({ sessions });
}

export async function schedule(_req: Request, res: Response): Promise<void> {
  const sessions = await listProfessionalSchedule(authUser(res).id);
  res.status(200).json({ sessions });
}

export async function read(_req: Request, res: Response): Promise<void> {
  const params = validatedParams(res, sessionParamsSchema);
  const session = await getSession(authUser(res).id, params.id);
  res.status(200).json({ session });
}

export async function cancel(_req: Request, res: Response): Promise<void> {
  const params = validatedParams(res, sessionParamsSchema);
  const session = await cancelSession({ actorId: authUser(res).id, sessionId: params.id });
  res.status(200).json({ session });
}

export async function reschedule(_req: Request, res: Response): Promise<void> {
  const params = validatedParams(res, sessionParamsSchema);
  const body = validatedBody(res, rescheduleSessionSchema);
  const session = await rescheduleSession({
    actorId: authUser(res).id,
    sessionId: params.id,
    startAt: new Date(body.startAt),
  });
  res.status(200).json({ session });
}
