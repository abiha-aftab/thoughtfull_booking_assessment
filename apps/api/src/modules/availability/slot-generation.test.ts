import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { generateSlots } from './slot-generation';

const monday = {
  professionalTimezone: 'Asia/Singapore',
  viewerTimezone: 'Asia/Singapore',
  intervals: [{ dayOfWeek: 1 as const, startTime: '09:00', endTime: '17:00' }],
  blockedDates: [],
  now: new Date('2026-06-01T00:00:00.000Z'),
  noticeHours: 0,
  windowDays: 28,
};

describe('generateSlots', () => {
  it('lays 50-minute slots from the start of the working interval and drops the one that would run past the end', () => {
    const slots = generateSlots(monday).filter((slot) =>
      DateTime.fromJSDate(slot.startAt, { zone: 'Asia/Singapore' }).hasSame(
        DateTime.fromISO('2026-06-01', { zone: 'Asia/Singapore' }),
        'day',
      ),
    );

    expect(
      slots.map((slot) =>
        DateTime.fromJSDate(slot.startAt, { zone: 'Asia/Singapore' }).toFormat('HH:mm'),
      ),
    ).toEqual(['09:00', '09:50', '10:40', '11:30', '12:20', '13:10', '14:00', '14:50', '15:40']);
    expect(slots[0]?.endAt.getTime()).toBe(
      slots[0] ? slots[0].startAt.getTime() + 50 * 60 * 1000 : 0,
    );
  });

  it('stores a Singapore morning slot as the matching UTC instant', () => {
    const slots = generateSlots({
      ...monday,
      intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:50' }],
    });
    const first = slots.find((slot) => slot.startAt.toISOString() === '2026-06-01T01:00:00.000Z');

    expect(first?.endAt.toISOString()).toBe('2026-06-01T01:50:00.000Z');
  });

  it('emits no slots from an interval shorter than 50 minutes', () => {
    const slots = generateSlots({
      ...monday,
      intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:49' }],
    });

    expect(slots).toEqual([]);
  });

  it('keeps separate morning and afternoon intervals', () => {
    const slots = generateSlots({
      ...monday,
      intervals: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:40' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '14:40' },
      ],
    }).filter((slot) => slot.startAt.toISOString().startsWith('2026-06-01'));

    expect(
      slots.map((slot) => DateTime.fromJSDate(slot.startAt, { zone: 'utc' }).toFormat('HH:mm')),
    ).toEqual(['01:00', '01:50', '05:00', '05:50']);
  });

  it('hides slots before the notice cutoff and keeps one that starts exactly two hours ahead', () => {
    const start = new Date('2026-06-01T01:00:00.000Z');
    const included = generateSlots({
      ...monday,
      intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:50' }],
      now: new Date(start.getTime() - 2 * 60 * 60 * 1000),
      noticeHours: 2,
    });
    const excluded = generateSlots({
      ...monday,
      intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:50' }],
      now: new Date(start.getTime() - 2 * 60 * 60 * 1000 + 60 * 1000),
      noticeHours: 2,
    });

    expect(included.some((slot) => slot.startAt.toISOString() === start.toISOString())).toBe(true);
    expect(excluded.some((slot) => slot.startAt.toISOString() === start.toISOString())).toBe(false);
  });

  it('omits a blocked professional-local date', () => {
    const slots = generateSlots({
      ...monday,
      blockedDates: ['2026-06-01'],
    });

    expect(slots.some((slot) => slot.startAt.toISOString().startsWith('2026-06-01'))).toBe(false);
    expect(slots.length).toBeGreaterThan(0);
  });

  it('removes an occupied slot and keeps a later slot that only touches its end', () => {
    const slots = generateSlots({
      ...monday,
      intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:40' }],
      occupied: [
        {
          startAt: new Date('2026-06-01T01:00:00.000Z'),
          endAt: new Date('2026-06-01T01:50:00.000Z'),
        },
      ],
    }).filter((slot) => slot.startAt.toISOString().startsWith('2026-06-01'));

    expect(slots.map((slot) => slot.startAt.toISOString())).toEqual(['2026-06-01T01:50:00.000Z']);
  });

  it('does not offer a slot that starts before the viewer-local window', () => {
    const slots = generateSlots({
      professionalTimezone: 'UTC',
      viewerTimezone: 'America/New_York',
      intervals: [{ dayOfWeek: 1, startTime: '03:00', endTime: '03:50' }],
      blockedDates: [],
      now: new Date('2026-06-01T05:00:00.000Z'),
      noticeHours: 0,
      windowDays: 28,
    });

    expect(slots.some((slot) => slot.startAt.toISOString() === '2026-06-01T03:00:00.000Z')).toBe(
      false,
    );
  });

  it('skips a local time that does not exist on a spring-forward morning', () => {
    const day = DateTime.fromISO('2026-03-08', { zone: 'America/New_York' });
    const missing = day.set({ hour: 2, minute: 30 });
    expect(day.weekday).toBe(7);
    expect(missing.hour === 2 && missing.minute === 30).toBe(false);

    const slots = generateSlots({
      professionalTimezone: 'America/New_York',
      viewerTimezone: 'America/New_York',
      intervals: [{ dayOfWeek: 7, startTime: '01:00', endTime: '04:00' }],
      blockedDates: [],
      now: new Date('2026-03-07T12:00:00.000Z'),
      noticeHours: 0,
      windowDays: 7,
    }).filter(
      (slot) =>
        DateTime.fromJSDate(slot.startAt, { zone: 'America/New_York' }).toISODate() ===
        '2026-03-08',
    );

    const labels = slots.map((slot) =>
      DateTime.fromJSDate(slot.startAt, { zone: 'America/New_York' }).toFormat('HH:mm'),
    );
    expect(labels).not.toContain('02:00');
    expect(labels).not.toContain('02:30');
    expect(labels[0]).toBe('01:00');
    expect(
      slots.every((slot) => slot.endAt.getTime() - slot.startAt.getTime() === 50 * 60 * 1000),
    ).toBe(true);

    const shifted = generateSlots({
      professionalTimezone: 'America/New_York',
      viewerTimezone: 'America/New_York',
      intervals: [{ dayOfWeek: 7, startTime: '02:30', endTime: '04:00' }],
      blockedDates: [],
      now: new Date('2026-03-07T12:00:00.000Z'),
      noticeHours: 0,
      windowDays: 7,
    }).filter(
      (slot) =>
        DateTime.fromJSDate(slot.startAt, { zone: 'America/New_York' }).toISODate() ===
        '2026-03-08',
    );
    expect(
      shifted.map((slot) =>
        DateTime.fromJSDate(slot.startAt, { zone: 'America/New_York' }).toFormat('HH:mm'),
      ),
    ).toEqual(['03:00']);
  });

  it('uses the earlier offset for a repeated local time when the clocks fall back', () => {
    const day = DateTime.fromISO('2026-11-01', { zone: 'America/New_York' });
    expect(day.weekday).toBe(7);

    const slots = generateSlots({
      professionalTimezone: 'America/New_York',
      viewerTimezone: 'America/New_York',
      intervals: [{ dayOfWeek: 7, startTime: '01:00', endTime: '02:40' }],
      blockedDates: [],
      now: new Date('2026-10-31T12:00:00.000Z'),
      noticeHours: 0,
      windowDays: 7,
    }).filter((slot) => slot.startAt.toISOString().startsWith('2026-11-01'));

    expect(slots[0]?.startAt.toISOString()).toBe('2026-11-01T05:00:00.000Z');
    expect(slots.map((slot) => slot.startAt.toISOString())).not.toContain(
      '2026-11-01T06:00:00.000Z',
    );
    expect(new Set(slots.map((slot) => slot.startAt.toISOString())).size).toBe(slots.length);
    expect(
      slots.every((slot) => slot.endAt.getTime() - slot.startAt.getTime() === 50 * 60 * 1000),
    ).toBe(true);
  });
});
