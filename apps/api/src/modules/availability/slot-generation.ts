import {
  BOOKING_WINDOW_DAYS,
  MIN_BOOKING_NOTICE_HOURS,
  SESSION_DURATION_MINUTES,
  type AvailabilityInterval,
} from '@thoughtfull/shared';
import { DateTime } from 'luxon';

export type OccupiedRange = {
  startAt: Date;
  endAt: Date;
};

export type GenerateSlotsInput = {
  professionalTimezone: string;
  viewerTimezone: string;
  intervals: AvailabilityInterval[];
  blockedDates: readonly string[];
  now: Date;
  occupied?: readonly OccupiedRange[];
  durationMinutes?: number;
  noticeHours?: number;
  windowDays?: number;
};

export type GeneratedSlot = {
  startAt: Date;
  endAt: Date;
};

function localTime(day: DateTime, time: string): DateTime | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    return undefined;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const zoned = day.set({ hour, minute, second: 0, millisecond: 0 });
  if (zoned.isValid && zoned.hour === hour && zoned.minute === minute) {
    return zoned;
  }

  const target = hour * 60 + minute;
  let probe = day.startOf('day');
  const limit = day.endOf('day');
  while (probe <= limit) {
    if (probe.hour * 60 + probe.minute >= target) {
      return probe;
    }
    probe = probe.plus({ minutes: 1 });
  }
  return undefined;
}

function overlaps(start: DateTime, end: DateTime, occupied: readonly OccupiedRange[]): boolean {
  const startMs = start.toMillis();
  const endMs = end.toMillis();
  return occupied.some(
    (range) => startMs < range.endAt.getTime() && endMs > range.startAt.getTime(),
  );
}

export function generateSlots(input: GenerateSlotsInput): GeneratedSlot[] {
  const durationMinutes = input.durationMinutes ?? SESSION_DURATION_MINUTES;
  const noticeHours = input.noticeHours ?? MIN_BOOKING_NOTICE_HOURS;
  const windowDays = input.windowDays ?? BOOKING_WINDOW_DAYS;
  const occupied = input.occupied ?? [];

  const viewerNow = DateTime.fromJSDate(input.now, { zone: input.viewerTimezone });
  const professionalNow = DateTime.fromJSDate(input.now, { zone: input.professionalTimezone });
  if (!viewerNow.isValid || !professionalNow.isValid) {
    throw new Error('Invalid timezone');
  }

  const windowStart = viewerNow.startOf('day');
  const windowEnd = windowStart.plus({ days: windowDays });
  const earliest = DateTime.fromJSDate(input.now, { zone: 'utc' }).plus({ hours: noticeHours });
  const blocked = new Set(input.blockedDates);
  const slots: GeneratedSlot[] = [];
  const seen = new Set<number>();

  let day = windowStart.setZone(input.professionalTimezone).startOf('day').minus({ days: 1 });
  const lastDay = windowEnd.setZone(input.professionalTimezone).startOf('day').plus({ days: 1 });

  while (day < lastDay) {
    const dateKey = day.toISODate();
    if (dateKey && !blocked.has(dateKey)) {
      for (const interval of input.intervals) {
        if (interval.dayOfWeek !== day.weekday) {
          continue;
        }
        const intervalStart = localTime(day, interval.startTime);
        const intervalEnd = localTime(day, interval.endTime);
        if (!intervalStart || !intervalEnd || intervalEnd <= intervalStart) {
          continue;
        }

        let cursor = intervalStart;
        while (cursor.plus({ minutes: durationMinutes }) <= intervalEnd) {
          const slotEnd = cursor.plus({ minutes: durationMinutes });
          const startUtc = cursor.toUTC();
          const startMs = startUtc.toMillis();
          const insideWindow = startUtc >= windowStart.toUTC() && startUtc < windowEnd.toUTC();
          if (
            insideWindow &&
            startUtc >= earliest &&
            !overlaps(cursor, slotEnd, occupied) &&
            !seen.has(startMs)
          ) {
            seen.add(startMs);
            slots.push({ startAt: cursor.toJSDate(), endAt: slotEnd.toJSDate() });
          }
          cursor = slotEnd;
        }
      }
    }
    day = day.plus({ days: 1 });
  }

  slots.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  return slots;
}
