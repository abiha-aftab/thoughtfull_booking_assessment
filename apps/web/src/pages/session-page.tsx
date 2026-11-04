import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isObjectId } from '../api/booking';
import { useCurrentUser } from '../auth/session';
import { useCancelSession, useSession } from '../booking/queries';
import {
  CANCELLATION_WINDOW_MESSAGE,
  formatWhen,
  memberChangeAllowed,
  sessionTiming,
} from '../booking/time';
import { FormError, errorMessage } from '../components/form-error';
import { Page, QueryState, primaryButtonClass, secondaryButtonClass } from '../components/page';

export function SessionPage() {
  const params = useParams();
  const account = useCurrentUser();
  const id = params.id ?? '';
  const valid = isObjectId(id);
  const query = useSession(id, valid);
  const cancel = useCancelSession();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState<unknown>(null);
  const user = account.data;
  const session = query.data;

  if (!valid) {
    return (
      <Page title="Session">
        <FormError message="Session id is invalid" />
      </Page>
    );
  }

  const otherName =
    session && user
      ? user.role === 'member'
        ? session.professionalName
        : session.memberName
      : 'Session';
  const allowed = session ? memberChangeAllowed(session.startAt) : false;
  const booked = session?.status === 'booked';

  return (
    <Page title={session ? `Session with ${otherName}` : 'Session'}>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {session && user ? (
          <div className="max-w-xl space-y-4">
            <p>
              <Link to={user.role === 'member' ? '/sessions' : '/'} className="text-sm text-pine">
                {user.role === 'member' ? 'Your sessions' : 'Upcoming sessions'}
              </Link>
            </p>
            <p className="text-lg">{formatWhen(session.startAt, user.timezone)}</p>
            <p className="text-sm text-mist">
              {session.status === 'cancelled'
                ? 'Cancelled'
                : sessionTiming(session.startAt, session.endAt)}
            </p>
            {booked && user.role === 'member' && !allowed ? (
              <p>{CANCELLATION_WINDOW_MESSAGE}</p>
            ) : null}
            <FormError message={failed ? errorMessage(failed) : null} />
            {booked && user.role === 'member' ? (
              <div className="flex flex-wrap gap-3">
                {allowed ? (
                  <Link to={`/sessions/${session.id}/reschedule`} className={secondaryButtonClass}>
                    Reschedule
                  </Link>
                ) : (
                  <button type="button" className={secondaryButtonClass} disabled>
                    Reschedule
                  </button>
                )}
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={!allowed || cancel.isPending}
                  onClick={() => {
                    setConfirming(true);
                  }}
                >
                  Cancel session
                </button>
              </div>
            ) : null}
            {booked && user.role === 'professional' ? (
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={cancel.isPending}
                onClick={() => {
                  setConfirming(true);
                }}
              >
                Cancel session
              </button>
            ) : null}
            {confirming && booked ? (
              <div className="space-y-3 rounded-3xl border border-line bg-card p-5">
                <p>Cancel this session? Pending reminders are dropped.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={cancel.isPending}
                    onClick={() => {
                      setFailed(null);
                      cancel.mutate(session.id, {
                        onSuccess: () => {
                          setConfirming(false);
                        },
                        onError: (error: unknown) => {
                          setFailed(error);
                        },
                      });
                    }}
                  >
                    {cancel.isPending ? 'Cancelling…' : 'Confirm cancellation'}
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setConfirming(false);
                    }}
                  >
                    Keep session
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </QueryState>
    </Page>
  );
}
