import type { TimeSlot } from '@thoughtfull/shared';
import { useState } from 'react';
import { timezoneLabel } from '../auth/paths';
import { formatTime, groupSlots, sameInstant } from '../booking/time';
import { EmptyNote } from './page';

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

  if (!active) {
    return <EmptyNote>{emptyMessage}</EmptyNote>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-mist">Times are shown in {timezoneLabel(timeZone)}.</p>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Dates">
        {days.map((day) => {
          const selected = day.dateKey === active.dateKey;
          return (
            <button
              key={day.dateKey}
              type="button"
              className={
                selected
                  ? 'shrink-0 rounded-full bg-pine px-4 py-2 text-sm text-card'
                  : 'shrink-0 rounded-full border border-line bg-card px-4 py-2 text-sm'
              }
              aria-pressed={selected}
              onClick={() => {
                setChosenDay(day.dateKey);
              }}
            >
              {day.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Times">
        {active.slots.map((slot) => {
          const selected = selectedStart !== undefined && sameInstant(selectedStart, slot.startAt);
          return (
            <button
              key={slot.startAt}
              type="button"
              className={
                selected
                  ? 'rounded-full bg-pine-dark px-4 py-2 text-sm text-card'
                  : 'rounded-full border border-line bg-card px-4 py-2 text-sm'
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
  );
}
