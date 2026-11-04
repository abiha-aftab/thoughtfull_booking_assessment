import { REMINDER_LEAD_TIMES_HOURS, type ReminderKind } from '@thoughtfull/shared';
import { randomUUID } from 'node:crypto';

export const REMINDER_STATUSES = ['pending', 'claimed', 'delivered', 'cancelled'] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export type PlannedReminder = {
  reminderId: string;
  userId: string;
  kind: ReminderKind;
  fireAt: Date;
  status: ReminderStatus;
  claimToken: string;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function kindFor(hours: (typeof REMINDER_LEAD_TIMES_HOURS)[number]): ReminderKind {
  return hours === 24 ? '24h' : '1h';
}

function message(kind: ReminderKind, otherName: string): string {
  const lead = kind === '24h' ? '24 hours' : '1 hour';
  return `Your session with ${otherName} starts in ${lead}.`;
}

export function reminderMessage(kind: ReminderKind, otherName: string): string {
  return message(kind, otherName);
}

export function planReminders(input: {
  memberId: string;
  professionalId: string;
  startAt: Date;
  now: Date;
  existing?: readonly PlannedReminder[];
}): PlannedReminder[] {
  const delivered = (input.existing ?? []).filter((reminder) => reminder.status === 'delivered');
  const claimed = (input.existing ?? [])
    .filter((reminder) => reminder.status === 'claimed')
    .map((reminder) => ({ ...reminder, status: 'cancelled' as const, claimToken: '' }));

  const fresh: PlannedReminder[] = [];
  for (const hours of REMINDER_LEAD_TIMES_HOURS) {
    const fireAt = new Date(input.startAt.getTime() - hours * HOUR_MS);
    if (fireAt < input.now) {
      continue;
    }
    const kind = kindFor(hours);
    fresh.push(
      {
        reminderId: randomUUID(),
        userId: input.memberId,
        kind,
        fireAt,
        status: 'pending',
        claimToken: '',
      },
      {
        reminderId: randomUUID(),
        userId: input.professionalId,
        kind,
        fireAt,
        status: 'pending',
        claimToken: '',
      },
    );
  }

  return [...delivered, ...claimed, ...fresh];
}

export function memberChangeAllowed(startAt: Date, now: Date): boolean {
  return startAt.getTime() - now.getTime() >= WINDOW_MS;
}
