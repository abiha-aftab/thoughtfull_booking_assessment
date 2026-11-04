import type { AvailabilityInterval, IsoWeekday } from '@thoughtfull/shared';

export const WEEKDAYS: readonly { day: IsoWeekday; name: string }[] = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 7, name: 'Sunday' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_INTERVALS = 21;

export function weekdayName(day: IsoWeekday): string {
  return WEEKDAYS.find((item) => item.day === day)?.name ?? 'Day';
}

export function normalizeClock(value: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(value);
  if (!match?.[1] || !match[2]) {
    return value;
  }
  return `${match[1]}:${match[2]}`;
}

function minutes(value: string): number | undefined {
  const match = TIME_PATTERN.exec(value);
  if (!match?.[1] || !match[2]) {
    return undefined;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export type HoursCheck = {
  messages: string[];
  indexes: number[];
};

export function checkHours(intervals: readonly AvailabilityInterval[]): HoursCheck {
  const messages: string[] = [];
  const indexes = new Set<number>();
  if (intervals.length > MAX_INTERVALS) {
    messages.push('You can save up to 21 intervals.');
  }

  let invalidTime = false;
  let tooShort = false;
  for (const [index, interval] of intervals.entries()) {
    const start = minutes(interval.startTime);
    const end = minutes(interval.endTime);
    if (start === undefined || end === undefined) {
      invalidTime = true;
      indexes.add(index);
      continue;
    }
    if (end - start < 50) {
      tooShort = true;
      indexes.add(index);
    }
  }
  if (invalidTime) {
    messages.push('Use 24-hour HH:mm');
  }
  if (tooShort) {
    messages.push('Each working interval must be at least 50 minutes');
  }

  const ordered = intervals
    .map((interval, index) => ({ interval, index, start: minutes(interval.startTime) }))
    .filter((item): item is { interval: AvailabilityInterval; index: number; start: number } => {
      return item.start !== undefined && minutes(item.interval.endTime) !== undefined;
    })
    .sort(
      (left, right) =>
        left.interval.dayOfWeek - right.interval.dayOfWeek || left.start - right.start,
    );

  let overlap = false;
  for (let cursor = 1; cursor < ordered.length; cursor += 1) {
    const previous = ordered[cursor - 1];
    const current = ordered[cursor];
    if (!previous || !current || previous.interval.dayOfWeek !== current.interval.dayOfWeek) {
      continue;
    }
    const previousEnd = minutes(previous.interval.endTime);
    if (previousEnd !== undefined && previousEnd > current.start) {
      overlap = true;
      indexes.add(previous.index);
      indexes.add(current.index);
    }
  }
  if (overlap) {
    messages.push('Working intervals on the same day cannot overlap');
  }

  return { messages, indexes: [...indexes] };
}

export function sortedIntervals(
  intervals: readonly AvailabilityInterval[],
): AvailabilityInterval[] {
  return [...intervals].sort(
    (left, right) =>
      left.dayOfWeek - right.dayOfWeek || left.startTime.localeCompare(right.startTime),
  );
}

export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
