import { describe, expect, it } from 'vitest';
import {
  BOOKING_WINDOW_DAYS,
  CANCELLATION_WINDOW_HOURS,
  MIN_BOOKING_NOTICE_HOURS,
  REMINDER_KINDS,
  REMINDER_LEAD_TIMES_HOURS,
  SESSION_DURATION_MINUTES,
} from './constants';

describe('booking rules', () => {
  it('keeps the assessment constraints in one place', () => {
    expect(SESSION_DURATION_MINUTES).toBe(50);
    expect(CANCELLATION_WINDOW_HOURS).toBe(24);
    expect(BOOKING_WINDOW_DAYS).toBe(28);
    expect(MIN_BOOKING_NOTICE_HOURS).toBe(2);
    expect(REMINDER_LEAD_TIMES_HOURS).toEqual([24, 1]);
    expect(REMINDER_KINDS).toEqual(['24h', '1h']);
  });
});
