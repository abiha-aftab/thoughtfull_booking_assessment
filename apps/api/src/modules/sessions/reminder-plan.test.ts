import { describe, expect, it } from 'vitest';
import { memberChangeAllowed, planReminders, type PlannedReminder } from './reminder-plan';

const start = new Date('2026-06-01T09:00:00.000Z');
const base = {
  memberId: 'member-1',
  professionalId: 'pro-1',
  startAt: start,
};

function at(offsetMs: number): Date {
  return new Date(start.getTime() - offsetMs);
}

const hour = 60 * 60 * 1000;

describe('planReminders', () => {
  it('creates four reminders 30 hours ahead and at exactly 24 hours', () => {
    expect(planReminders({ ...base, now: at(30 * hour) })).toHaveLength(4);
    const exact = planReminders({ ...base, now: at(24 * hour) });
    expect(exact.map((reminder) => reminder.kind).sort()).toEqual(['1h', '1h', '24h', '24h']);
    expect(exact.every((reminder) => reminder.status === 'pending')).toBe(true);
  });

  it('skips a lead time that is already in the past, including one millisecond inside 24 hours', () => {
    const inside = planReminders({ ...base, now: new Date(at(24 * hour).getTime() + 1) });
    expect(inside.map((reminder) => reminder.kind)).toEqual(['1h', '1h']);

    const twoHours = planReminders({ ...base, now: at(2 * hour) });
    expect(twoHours.map((reminder) => reminder.kind)).toEqual(['1h', '1h']);
    expect(planReminders({ ...base, now: at(30 * 60 * 1000) })).toEqual([]);
  });

  it('keeps delivered reminders, cancels a claim in flight, and drops pending ones', () => {
    const delivered: PlannedReminder = {
      reminderId: 'kept',
      userId: 'member-1',
      kind: '24h',
      fireAt: at(24 * hour),
      status: 'delivered',
      claimToken: '',
    };
    const claimed: PlannedReminder = {
      reminderId: 'in-flight',
      userId: 'pro-1',
      kind: '24h',
      fireAt: at(24 * hour),
      status: 'claimed',
      claimToken: 'token',
    };
    const pending: PlannedReminder = {
      reminderId: 'old-pending',
      userId: 'member-1',
      kind: '1h',
      fireAt: at(hour),
      status: 'pending',
      claimToken: '',
    };

    const next = planReminders({
      ...base,
      now: at(30 * hour),
      existing: [delivered, claimed, pending],
    });

    expect(next.find((reminder) => reminder.reminderId === 'kept')?.status).toBe('delivered');
    expect(next.find((reminder) => reminder.reminderId === 'in-flight')).toMatchObject({
      status: 'cancelled',
      claimToken: '',
    });
    expect(next.some((reminder) => reminder.reminderId === 'old-pending')).toBe(false);
    expect(next.filter((reminder) => reminder.status === 'pending')).toHaveLength(4);
  });
});

describe('memberChangeAllowed', () => {
  it('allows exactly 24 hours and rejects one millisecond inside the window', () => {
    expect(memberChangeAllowed(start, at(24 * hour))).toBe(true);
    expect(memberChangeAllowed(start, new Date(at(24 * hour).getTime() + 1))).toBe(false);
  });
});
