import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { isObjectId } from '../api/booking';
import { timezoneLabel } from '../auth/paths';
import { useCurrentUser } from '../auth/session';
import { useBookSession, useProfessional, useSlots } from '../booking/queries';
import { formatWhen, sameInstant } from '../booking/time';
import { FormError, errorMessage } from '../components/form-error';
import { Page, QueryState, primaryButtonClass, secondaryButtonClass } from '../components/page';

export function ConfirmPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useCurrentUser();
  const id = params.id ?? '';
  const valid = isObjectId(id);
  const start = searchParams.get('start');
  const professional = useProfessional(id, valid);
  const slots = useSlots(id, valid);
  const book = useBookSession();
  const [failed, setFailed] = useState<unknown>(null);
  const user = session.data;
  const profile = professional.data;
  const match =
    start && slots.data ? slots.data.find((slot) => sameInstant(slot.startAt, start)) : undefined;

  if (!valid) {
    return (
      <Page title="Confirm your session">
        <FormError message="Professional id is invalid" />
      </Page>
    );
  }

  return (
    <Page
      title="Confirm your session"
      lede="Booking holds this time for you and schedules reminders for both of you."
    >
      <QueryState
        isPending={professional.isPending || slots.isPending}
        isError={professional.isError || slots.isError}
        error={professional.error ?? slots.error}
        onRetry={() => {
          void professional.refetch();
          void slots.refetch();
        }}
      >
        {profile && user ? (
          <div className="max-w-xl space-y-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-sm font-medium text-pine">{profile.title}</p>
            {match ? (
              <p className="rounded-xl bg-pine-soft px-3 py-2 text-sm font-medium text-pine">
                {formatWhen(match.startAt, user.timezone)}
              </p>
            ) : (
              <FormError message="That time is not available" />
            )}
            <p className="text-sm text-mist">
              50 minutes, shown in {timezoneLabel(user.timezone)}.
            </p>
            <FormError message={failed ? errorMessage(failed) : null} />
            <div className="flex flex-wrap gap-3">
              {match ? (
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={book.isPending}
                  onClick={() => {
                    setFailed(null);
                    book.mutate(
                      { professionalId: id, startAt: match.startAt },
                      {
                        onSuccess: (booked) => {
                          void navigate(`/sessions/${booked.id}`, { replace: true });
                        },
                        onError: (error: unknown) => {
                          setFailed(error);
                        },
                      },
                    );
                  }}
                >
                  {book.isPending ? 'Booking…' : 'Book session'}
                </button>
              ) : null}
              <Link to={`/professionals/${id}`} className={secondaryButtonClass}>
                Choose another time
              </Link>
            </div>
          </div>
        ) : null}
      </QueryState>
    </Page>
  );
}
