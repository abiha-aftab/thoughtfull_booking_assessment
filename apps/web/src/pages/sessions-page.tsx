import { Link, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../auth/session';
import { useSessions } from '../booking/queries';
import { formatWhen, sessionTiming } from '../booking/time';
import { EmptyNote, Page, QueryState, secondaryButtonClass } from '../components/page';

export function SessionsPage() {
  const [params] = useSearchParams();
  const when = params.get('when') === 'past' ? 'past' : 'upcoming';
  const session = useCurrentUser();
  const query = useSessions(when);
  const user = session.data;

  return (
    <Page
      title="Your sessions"
      lede="Upcoming visits stay here until they end. Cancelled visits move to the past list."
    >
      <div className="mb-6 flex gap-2" role="group" aria-label="Session lists">
        <Link
          to="/sessions"
          className={
            when === 'upcoming' ? secondaryButtonClass + ' border-pine' : secondaryButtonClass
          }
          aria-current={when === 'upcoming' ? 'page' : undefined}
        >
          Upcoming
        </Link>
        <Link
          to="/sessions?when=past"
          className={when === 'past' ? secondaryButtonClass + ' border-pine' : secondaryButtonClass}
          aria-current={when === 'past' ? 'page' : undefined}
        >
          Past
        </Link>
      </div>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {query.data && query.data.length === 0 ? (
          <EmptyNote>
            {when === 'upcoming' ? 'You have no upcoming sessions.' : 'You have no past sessions.'}
          </EmptyNote>
        ) : null}
        <ul className="grid gap-3">
          {user
            ? query.data?.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/sessions/${item.id}`}
                    className="block rounded-3xl border border-line bg-card p-5"
                  >
                    <h2 className="font-serif text-2xl">{item.professionalName}</h2>
                    <p className="mt-1">{formatWhen(item.startAt, user.timezone)}</p>
                    <p className="mt-1 text-sm text-mist">
                      {item.status === 'cancelled'
                        ? 'Cancelled'
                        : sessionTiming(item.startAt, item.endAt)}
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
