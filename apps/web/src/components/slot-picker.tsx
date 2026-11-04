import type { TimeSlot } from '@thoughtfull/shared';
import { useState } from 'react';
import { timezoneLabel } from '../auth/paths';
import { formatTime, groupSlots, sameInstant, type SlotDay } from '../booking/time';
import { EmptyNote } from './page';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function dateKeyWeekday(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    return 0;
  }
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function monthTitle(dateKey: string): string {
  const [year, month] = dateKey.split('-').map((part) => Number(part));
  if (!year || !month) {
    return dateKey;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function dayNumber(dateKey: string): string {
  const day = dateKey.split('-')[2] ?? '';
  return String(Number(day));
}

function daysInRange(start: string, end: string): string[] {
  const [startYear, startMonth, startDay] = start.split('-').map((part) => Number(part));
  const [endYear, endMonth, endDay] = end.split('-').map((part) => Number(part));
  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
    return [];
  }
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const last = Date.UTC(endYear, endMonth - 1, endDay);
  const keys: string[] = [];
  while (cursor.getTime() <= last) {
    const year = String(cursor.getUTCFullYear());
    const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cursor.getUTCDate()).padStart(2, '0');
    keys.push(`${year}-${month}-${day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

type CalendarCell = { key: string; day?: SlotDay };

function calendarMonths(days: readonly SlotDay[]): { title: string; cells: CalendarCell[] }[] {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) {
    return [];
  }
  const byKey = new Map(days.map((day) => [day.dateKey, day]));
  const months = new Map<string, CalendarCell[]>();
  for (const dateKey of daysInRange(first.dateKey, last.dateKey)) {
    const monthKey = dateKey.slice(0, 7);
    const cells = months.get(monthKey) ?? [];
    const day = byKey.get(dateKey);
    if (day) {
      cells.push({ key: dateKey, day });
    } else {
      cells.push({ key: dateKey });
    }
    months.set(monthKey, cells);
  }
  return [...months.entries()].map(([monthKey, cells]) => {
    const opening = cells[0];
    const lead = opening ? dateKeyWeekday(opening.key) : 0;
    const padded = [
      ...Array.from({ length: lead }, (_, index) => ({ key: `${monthKey}-pad-${String(index)}` })),
      ...cells,
    ];
    return { title: monthTitle(`${monthKey}-01`), cells: padded };
  });
}

export function SlotPicker({
  slots,
  timeZone,
  selectedStart,
  onSelect,
  emptyMessage,
}: {
  slots: readonly TimeSlot[];
  timeZone: string;
  selectedStart?: string | undefined;
  onSelect: (slot: TimeSlot) => void;
  emptyMessage: string;
}) {
  const days = groupSlots(slots, timeZone);
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const active = days.find((day) => day.dateKey === chosenDay) ?? days[0];
  const months = calendarMonths(days);

  if (!active) {
    return <EmptyNote>{emptyMessage}</EmptyNote>;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-card p-4 sm:p-5">
      <p className="text-sm text-mist">Times are shown in {timezoneLabel(timeZone)}.</p>
      <div className="grid gap-6 md:grid-cols-[240px_1fr] md:items-start">
        <div className="space-y-5" role="group" aria-label="Dates">
          {months.map((month) => (
            <div key={month.title}>
              <p className="text-sm font-semibold">{month.title}</p>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-mist">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {month.cells.map((cell) => {
                  if (!cell.day) {
                    return <span key={cell.key} className="h-9" />;
                  }
                  const selected = cell.day.dateKey === active.dateKey;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={
                        selected
                          ? 'h-9 rounded-lg bg-pine text-sm font-semibold text-paper'
                          : 'h-9 rounded-lg text-sm font-medium hover:bg-pine-soft'
                      }
                      aria-label={cell.day.label}
                      aria-pressed={selected}
                      onClick={() => {
                        setChosenDay(cell.day?.dateKey ?? null);
                      }}
                    >
                      {dayNumber(cell.day.dateKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">{active.label}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Times">
            {active.slots.map((slot) => {
              const selected =
                selectedStart !== undefined && sameInstant(selectedStart, slot.startAt);
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  className={
                    selected
                      ? 'rounded-xl bg-pine px-3 py-2.5 text-sm font-semibold text-paper'
                      : 'field rounded-xl px-3 py-2.5 text-sm font-medium'
                  }
                  aria-pressed={selected}
                  onClick={() => {
                    onSelect(slot);
                  }}
                >
                  {formatTime(slot.startAt, timeZone)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
