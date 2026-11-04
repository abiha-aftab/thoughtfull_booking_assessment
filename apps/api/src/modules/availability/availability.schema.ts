import { DateTime } from 'luxon';
import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm');

function minutes(value: string): number {
  const [hour, minute] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

function isCalendarDate(value: string): boolean {
  const parsed = DateTime.fromISO(value, { zone: 'utc' });
  return parsed.isValid && parsed.toISODate() === value;
}

const intervalSchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((interval) => minutes(interval.endTime) - minutes(interval.startTime) >= 50, {
    message: 'Each working interval must be at least 50 minutes',
  });

export const weeklyHoursSchema = z.object({
  intervals: z
    .array(intervalSchema)
    .max(21)
    .superRefine((intervals, ctx) => {
      const sorted = [...intervals].sort(
        (left, right) =>
          left.dayOfWeek - right.dayOfWeek || minutes(left.startTime) - minutes(right.startTime),
      );
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        if (!previous || !current || previous.dayOfWeek !== current.dayOfWeek) {
          continue;
        }
        if (minutes(previous.endTime) > minutes(current.startTime)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Working intervals on the same day cannot overlap',
            path: [index],
          });
        }
      }
    }),
});

export const blockedDateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .refine(isCalendarDate, 'Use a real calendar date'),
});

export const professionalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(80).optional().default(''),
});

export const professionalIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Professional id is invalid'),
});

export type WeeklyHoursInput = z.infer<typeof weeklyHoursSchema>;
export type ProfessionalListQuery = z.infer<typeof professionalListQuerySchema>;
