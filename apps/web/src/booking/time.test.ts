import { describe, expect, it } from 'vitest';
import { formatTime, formatWhen, groupSlots, memberChangeAllowed, sessionTiming } from './time';

const instant = '2026-11-04T14:00:00.000Z';

describe('member time display', () => {
  it('shows one UTC instant in the member timezone', () => {
    expect(formatWhen(instant, 'America/New_York')).toContain('Nov 4');
    expect(formatTime(instant, 'America/New_York').replace(/\s/g, ' ')).toBe('9:00 AM');
    expect(formatTime(instant, 'UTC').replace(/\s/g, ' ')).toBe('2:00 PM');
    expect(
      groupSlots([{ startAt: instant, endAt: '2026-11-04T14:50:00.000Z' }], 'America/New_York'),
    ).toEqual([expect.objectContaining({ dateKey: '2026-11-04' })]);
  });

  it('drops an unreadable slot and falls back when the timezone is unknown', () => {
    expect(formatTime('not-a-time', 'UTC')).toBe('Unknown time');
    expect(formatTime(instant, 'Not/AZone').replace(/\s/g, ' ')).toBe('2:00 PM');
    expect(groupSlots([{ startAt: 'nope', endAt: instant }], 'UTC')).toEqual([]);
  });

  it('allows a change at exactly 24 hours and refuses one millisecond inside', () => {
    const start = new Date('2026-11-06T15:00:00.000Z');
    const exactly = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const inside = new Date(exactly.getTime() + 1);
    expect(memberChangeAllowed(start.toISOString(), exactly)).toBe(true);
    expect(memberChangeAllowed(start.toISOString(), inside)).toBe(false);
    expect(memberChangeAllowed('not-a-time', exactly)).toBe(false);
  });

  it('labels a session from its clock time', () => {
    const start = '2026-11-06T15:00:00.000Z';
    const end = '2026-11-06T15:50:00.000Z';
    expect(sessionTiming(start, end, new Date('2026-11-06T14:00:00.000Z'))).toBe('Booked');
    expect(sessionTiming(start, end, new Date('2026-11-06T15:10:00.000Z'))).toBe('In progress');
    expect(sessionTiming(start, end, new Date('2026-11-06T16:00:00.000Z'))).toBe('Ended');
  });
});
