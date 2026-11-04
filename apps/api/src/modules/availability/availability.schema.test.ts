import { describe, expect, it } from 'vitest';
import { blockedDateSchema, weeklyHoursSchema } from './availability.schema';

const validInterval = { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' };

describe('weeklyHoursSchema', () => {
  it('accepts touching intervals and rejects overlaps, short intervals, and overnight ranges', () => {
    expect(
      weeklyHoursSchema.safeParse({
        intervals: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '12:00', endTime: '17:00' },
        ],
      }).success,
    ).toBe(true);

    expect(
      weeklyHoursSchema.safeParse({
        intervals: [validInterval, { dayOfWeek: 1, startTime: '16:00', endTime: '18:00' }],
      }).success,
    ).toBe(false);

    expect(
      weeklyHoursSchema.safeParse({
        intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:49' }],
      }).success,
    ).toBe(false);

    expect(
      weeklyHoursSchema.safeParse({
        intervals: [{ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }],
      }).success,
    ).toBe(false);

    expect(
      weeklyHoursSchema.safeParse({
        intervals: [{ dayOfWeek: 0, startTime: '09:00', endTime: '17:00' }],
      }).success,
    ).toBe(false);
  });
});

describe('blockedDateSchema', () => {
  it('rejects a date that is not on the calendar', () => {
    expect(blockedDateSchema.safeParse({ date: '2026-02-31' }).success).toBe(false);
    expect(blockedDateSchema.safeParse({ date: '2026-02-28' }).success).toBe(true);
    expect(blockedDateSchema.safeParse({ date: '2026-2-28' }).success).toBe(false);
  });
});
