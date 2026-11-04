import type { AvailabilityInterval } from '@thoughtfull/shared';
import { useState } from 'react';
import {
  checkHours,
  isCalendarDate,
  MAX_INTERVALS,
  normalizeClock,
  sortedIntervals,
  WEEKDAYS,
} from '../booking/hours';
import { useAvailability, useBlockDate, useSaveHours, useUnblockDate } from '../booking/queries';
import { FormError, errorMessage } from '../components/form-error';
import { ApiError } from '../api/client';
import {
  EmptyNote,
  Page,
  QueryState,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/page';

function issueText(error: unknown): string {
  if (error instanceof ApiError && error.issues.length > 0) {
    return error.issues.map((issue) => issue.message).join(' ');
  }
  return errorMessage(error);
}

export function AvailabilityPage() {
  const query = useAvailability();
  const save = useSaveHours();
  const block = useBlockDate();
  const unblock = useUnblockDate();
  const [draft, setDraft] = useState<AvailabilityInterval[] | null>(null);
  const [hourErrors, setHourErrors] = useState<string[]>([]);
  const [invalidRows, setInvalidRows] = useState<number[]>([]);
  const [saveFailed, setSaveFailed] = useState<unknown>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const availability = query.data;
  const intervals = draft ?? availability?.intervals ?? [];

  function update(next: AvailabilityInterval[]) {
    setDraft(next);
    setHourErrors([]);
    setInvalidRows([]);
    setSaveFailed(null);
  }

  return (
    <Page
      title="Working hours"
      lede="Hours are in your timezone. Each interval is at least 50 minutes, stays on one day, and can leave a gap for a break."
    >
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {availability ? (
          <div className="grid gap-10">
            <section className="space-y-4">
              {WEEKDAYS.map((weekday) => {
                const rows = intervals
                  .map((interval, index) => ({ interval, index }))
                  .filter((row) => row.interval.dayOfWeek === weekday.day);
                return (
                  <div key={weekday.day} className="rounded-3xl border border-line bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-serif text-2xl">{weekday.name}</h2>
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={intervals.length >= MAX_INTERVALS}
                        onClick={() => {
                          update([
                            ...intervals,
                            { dayOfWeek: weekday.day, startTime: '09:00', endTime: '17:00' },
                          ]);
                        }}
                      >
                        Add hours on {weekday.name}
                      </button>
                    </div>
                    {rows.length === 0 ? <p className="mt-3 text-sm text-mist">Closed</p> : null}
                    <ul className="mt-3 space-y-3">
                      {rows.map((row) => {
                        const invalid = invalidRows.includes(row.index);
                        return (
                          <li
                            key={`${weekday.day}-${String(row.index)}`}
                            className="flex flex-wrap items-center gap-3"
                          >
                            <input
                              aria-label={`Start time, ${weekday.name} ${String(row.index + 1)}`}
                              aria-invalid={invalid || undefined}
                              type="time"
                              className="rounded-lg border border-line bg-card px-3 py-2"
                              value={row.interval.startTime}
                              onChange={(event) => {
                                const next = intervals.map((interval, index) =>
                                  index === row.index
                                    ? { ...interval, startTime: normalizeClock(event.target.value) }
                                    : interval,
                                );
                                update(next);
                              }}
                            />
                            <span className="text-sm text-mist">to</span>
                            <input
                              aria-label={`End time, ${weekday.name} ${String(row.index + 1)}`}
                              aria-invalid={invalid || undefined}
                              type="time"
                              className="rounded-lg border border-line bg-card px-3 py-2"
                              value={row.interval.endTime}
                              onChange={(event) => {
                                const next = intervals.map((interval, index) =>
                                  index === row.index
                                    ? { ...interval, endTime: normalizeClock(event.target.value) }
                                    : interval,
                                );
                                update(next);
                              }}
                            />
                            <button
                              type="button"
                              className={secondaryButtonClass}
                              onClick={() => {
                                update(intervals.filter((_, index) => index !== row.index));
                              }}
                            >
                              Remove {weekday.name} {row.interval.startTime} to{' '}
                              {row.interval.endTime}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {hourErrors.length > 0 ? (
                <div role="alert" className="rounded-lg bg-[#f8ebe7] px-3 py-2 text-sm text-clay">
                  {hourErrors.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </div>
              ) : null}
              <FormError message={saveFailed ? issueText(saveFailed) : null} />
              <button
                type="button"
                className={primaryButtonClass}
                disabled={save.isPending}
                onClick={() => {
                  const checked = checkHours(intervals);
                  if (checked.messages.length > 0) {
                    setHourErrors(checked.messages);
                    setInvalidRows(checked.indexes);
                    setSaveFailed(null);
                    return;
                  }
                  setHourErrors([]);
                  setInvalidRows([]);
                  setSaveFailed(null);
                  save.mutate(sortedIntervals(intervals), {
                    onSuccess: (saved) => {
                      setDraft(saved.intervals);
                    },
                    onError: (error: unknown) => {
                      setSaveFailed(error);
                    },
                  });
                }}
              >
                {save.isPending ? 'Saving…' : 'Save hours'}
              </button>
            </section>
            <section className="space-y-4">
              <h2 className="font-serif text-2xl">Blocked dates</h2>
              <p className="text-mist">
                A blocked date removes every opening that starts on that local day.
              </p>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const rawDate = data.get('date');
                  const date = typeof rawDate === 'string' ? rawDate : '';
                  if (!isCalendarDate(date)) {
                    setDateError('Use a real calendar date');
                    return;
                  }
                  if (availability.blockedDates.includes(date)) {
                    setDateError('That date is already blocked');
                    return;
                  }
                  setDateError(null);
                  block.mutate(date, {
                    onSuccess: () => {
                      form.reset();
                    },
                    onError: (error: unknown) => {
                      setDateError(issueText(error));
                    },
                  });
                }}
              >
                <label className="text-sm">
                  <span className="font-semibold">Date to block</span>
                  <input
                    name="date"
                    type="date"
                    required
                    className="mt-1 block rounded-lg border border-line bg-card px-3 py-2"
                  />
                </label>
                <button type="submit" className={secondaryButtonClass} disabled={block.isPending}>
                  {block.isPending ? 'Blocking…' : 'Block date'}
                </button>
              </form>
              <FormError message={dateError} />
              {availability.blockedDates.length === 0 ? (
                <EmptyNote>No blocked dates.</EmptyNote>
              ) : null}
              <ul className="space-y-2">
                {availability.blockedDates.map((date) => (
                  <li
                    key={date}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
                  >
                    <span>{date}</span>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={unblock.isPending}
                      onClick={() => {
                        setDateError(null);
                        unblock.mutate(date, {
                          onError: (error: unknown) => {
                            setDateError(errorMessage(error));
                          },
                        });
                      }}
                    >
                      Unblock {date}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </QueryState>
    </Page>
  );
}
