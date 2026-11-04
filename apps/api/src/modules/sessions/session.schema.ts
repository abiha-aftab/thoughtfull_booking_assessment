import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Id is invalid');

export const bookSessionSchema = z.object({
  professionalId: objectIdSchema,
  startAt: z.iso.datetime(),
});

export const rescheduleSessionSchema = z.object({
  startAt: z.iso.datetime(),
});

export const sessionParamsSchema = z.object({
  id: objectIdSchema,
});

export const sessionListQuerySchema = z.object({
  when: z.enum(['upcoming', 'past']),
});
