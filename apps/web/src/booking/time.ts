import { CANCELLATION_WINDOW_HOURS } from '@thoughtfull/shared';
import type { TimeSlot } from '@thoughtfull/shared';

export const CANCELLATION_WINDOW_MESSAGE =
  'You can cancel or reschedule until 24 hours before the start';

const WINDOW_MS = CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

export function memberChangeAllowed(startAt: string, now = new Date()): boolean {
  const start = new Date(startAt).getTime();
  if (Number.isNaN(start)) {
    return false;
  }
  return start - now.getTime() >= WINDOW_MS;
}

export function zoneOrUtc(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return 'UTC';
  }
}

export function formatWhen(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zoneOrUtc(timeZone),
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zoneOrUtc(timeZone),
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export type SlotDay = {
  dateKey: string;
  label: string;
  slots: TimeSlot[];
};

function dateParts(
  date: Date,
  timeZone: string,
): { year: string; month: string; day: string } | undefined {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
      return undefined;
    }
    return { year, month, day };
  } catch {
    return undefined;
  }
}

export function groupSlots(slots: readonly TimeSlot[], timeZone: string): SlotDay[] {
  const zone = zoneOrUtc(timeZone);
  const groups = new Map<string, SlotDay>();
  const ordered = [...slots].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  );
  for (const slot of ordered) {
    const date = new Date(slot.startAt);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const parts = dateParts(date, zone);
    if (!parts) {
      continue;
    }
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const existing = groups.get(dateKey);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }
    groups.set(dateKey, {
      dateKey,
      label: new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(date),
      slots: [slot],
    });
  }
  return [...groups.values()];
}

export function sameInstant(left: string, right: string): boolean {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return !Number.isNaN(leftTime) && leftTime === rightTime;
}

export function sessionTiming(startAt: string, endAt: string, now = new Date()): string {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const current = now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'Booked';
  }
  if (end <= current) {
    return 'Ended';
  }
  if (start <= current) {
    return 'In progress';
  }
  return 'Booked';
}
