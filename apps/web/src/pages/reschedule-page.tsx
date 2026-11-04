import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { TimeSlot } from '@thoughtfull/shared';
import { isObjectId } from '../api/booking';
import { useCurrentUser } from '../auth/session';
import { useRescheduleSession, useSession, useSlots } from '../booking/queries';
import { CANCELLATION_WINDOW_MESSAGE, formatWhen, memberChangeAllowed } from '../booking/time';
import { FormError, errorMessage } from '../components/form-error';
import { Page, QueryState, primaryButtonClass } from '../components/page';
import { SlotPicker } from '../components/slot-picker';

export function ReschedulePage() {
  const params = useParams();
  const navigate = useNavigate();
  const account = useCurrentUser();
  const id = params.id ?? '';
  const valid = isObjectId(id);
  const query = useSession(id, valid);
  const session = query.data;
  const open = session?.status === 'booked' && memberChangeAllowed(session.startAt);
  const slots = useSlots(session?.professionalId ?? '', valid && open);
  const reschedule = useRescheduleSession(id);
  const [selected, setSelected] = useState<TimeSlot | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const user = account.data;

  if (!valid) {
    return (
      <Page title="Choose a new time">
        <FormError message="Session id is invalid" />
      </Page>
    );
  }

  return (
    <Page
      title="Choose a new time"
      lede="The session keeps the same professional. A failed change leaves the original time in place."
    >
      <QueryState
        isPending={query.isPending || (open && slots.isPending)}
        isError={query.isError || slots.isError}
        error={query.error ?? slots.error}
        onRetry={() => {
          void query.refetch();
          void slots.refetch();
        }}
      >
        {session && user ? (
          <div className="space-y-6">
            <p>
              <Link to={`/sessions/${session.id}`} className="text-sm text-pine">
                Back to the session
              </Link>
            </p>
            <p>
              Current time: {formatWhen(session.startAt, user.timezone)} with{' '}
              {session.professionalName}
            </p>
            {session.status !== 'booked' ? <p>That session is no longer booked</p> : null}
            {session.status === 'booked' && !memberChangeAllowed(session.startAt) ? (
              <p>{CANCELLATION_WINDOW_MESSAGE}</p>
            ) : null}
            {open ? (
              <SlotPicker
                slots={slots.data ?? []}
                timeZone={user.timezone}
                selectedStart={selected?.startAt}
                onSelect={setSelected}
                emptyMessage="No other open times in the next 4 weeks."
              />
            ) : null}
            <FormError message={failed ? errorMessage(failed) : null} />
            {open && selected ? (
              <button
                type="button"
                className={primaryButtonClass}
                disabled={reschedule.isPending}
                onClick={() => {
                  setFailed(null);
                  reschedule.mutate(selected.startAt, {
                    onSuccess: (updated) => {
                      void navigate(`/sessions/${updated.id}`, { replace: true });
                    },
                    onError: (error: unknown) => {
                      setFailed(error);
                    },
                  });
                }}
              >
                {reschedule.isPending ? 'Moving…' : 'Confirm new time'}
              </button>
            ) : null}
          </div>
        ) : null}
      </QueryState>
    </Page>
  );
}
