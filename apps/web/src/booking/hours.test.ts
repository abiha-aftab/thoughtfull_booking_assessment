import { describe, expect, it } from 'vitest';
import { checkHours, isCalendarDate, sortedIntervals } from './hours';

describe('weekly hours', () => {
  it('accepts touching intervals and sorts them', () => {
    const intervals = [
      { dayOfWeek: 1 as const, startTime: '13:00', endTime: '17:00' },
      { dayOfWeek: 1 as const, startTime: '09:00', endTime: '13:00' },
    ];
    expect(checkHours(intervals)).toEqual({ messages: [], indexes: [] });
    expect(sortedIntervals(intervals)[0]?.startTime).toBe('09:00');
  });

  it('rejects a short interval, an overnight interval, overlap, and a bad clock', () => {
    expect(checkHours([{ dayOfWeek: 2, startTime: '09:00', endTime: '09:40' }]).messages).toContain(
      'Each working interval must be at least 50 minutes',
    );
    expect(checkHours([{ dayOfWeek: 2, startTime: '17:00', endTime: '09:00' }]).messages).toContain(
      'Each working interval must be at least 50 minutes',
    );
    const overlap = checkHours([
      { dayOfWeek: 3, startTime: '09:00', endTime: '13:00' },
      { dayOfWeek: 3, startTime: '12:00', endTime: '16:00' },
    ]);
    expect(overlap.messages).toContain('Working intervals on the same day cannot overlap');
    expect(overlap.indexes).toEqual([0, 1]);
    expect(checkHours([{ dayOfWeek: 4, startTime: '9:00', endTime: '17:00' }]).messages).toContain(
      'Use 24-hour HH:mm',
    );
  });

  it('rejects more than 21 intervals', () => {
    const intervals = Array.from({ length: 22 }, () => ({
      dayOfWeek: 1 as const,
      startTime: '09:00',
      endTime: '17:00',
    }));
    expect(checkHours(intervals).messages).toContain('You can save up to 21 intervals.');
  });

  it('accepts a real date and rejects a calendar gap', () => {
    expect(isCalendarDate('2026-11-04')).toBe(true);
    expect(isCalendarDate('2026-02-31')).toBe(false);
    expect(isCalendarDate('04-11-2026')).toBe(false);
  });
});
