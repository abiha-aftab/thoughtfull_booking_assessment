import { Link } from 'react-router-dom';
import { useCurrentUser } from '../auth/session';
import { useSchedule } from '../booking/queries';
import { formatWhen, sessionTiming } from '../booking/time';
import { EmptyNote, Page, QueryState } from '../components/page';

export function SchedulePage() {
  const account = useCurrentUser();
  const query = useSchedule();
  const user = account.data;

  return (
    <Page
      title="Upcoming sessions"
      lede="These are the visits still on your calendar, including one that has already started."
    >
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {query.data && query.data.length === 0 ? (
          <EmptyNote>No upcoming sessions.</EmptyNote>
        ) : null}
        <ul className="grid gap-3">
          {user
            ? query.data?.map((session) => (
                <li key={session.id}>
                  <Link
                    to={`/sessions/${session.id}`}
                    className="block rounded-3xl border border-line bg-card p-5"
                  >
                    <h2 className="font-serif text-2xl">{session.memberName}</h2>
                    <p className="mt-1">{formatWhen(session.startAt, user.timezone)}</p>
                    <p className="mt-1 text-sm text-mist">
                      {sessionTiming(session.startAt, session.endAt)}
                    </p>
                  </Link>
                </li>
              ))
            : null}
        </ul>
      </QueryState>
    </Page>
  );
}
