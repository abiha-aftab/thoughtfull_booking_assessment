import { Link } from 'react-router-dom';
import { useCurrentUser } from '../auth/session';
import { formatWhen } from '../booking/time';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../booking/queries';
import { FormError, errorMessage } from '../components/form-error';
import { EmptyNote, Page, QueryState, secondaryButtonClass } from '../components/page';
import { useState } from 'react';

export function NotificationsPage() {
  const account = useCurrentUser();
  const query = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [failed, setFailed] = useState<unknown>(null);
  const user = account.data;
  const notifications = query.data ?? [];
  const unread = notifications.filter((item) => item.readAt === null).length;

  return (
    <Page title="Notifications" lede="Reminders appear here 24 hours and 1 hour before a session.">
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      >
        <div className="space-y-4">
          {unread > 0 ? (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={markAll.isPending}
              onClick={() => {
                setFailed(null);
                markAll.mutate(undefined, {
                  onError: (error: unknown) => {
                    setFailed(error);
                  },
                });
              }}
            >
              {markAll.isPending ? 'Marking…' : 'Mark all read'}
            </button>
          ) : null}
          <FormError message={failed ? errorMessage(failed) : null} />
          {notifications.length === 0 ? <EmptyNote>No notifications yet.</EmptyNote> : null}
          <ul className="grid gap-3">
            {notifications.map((item) => (
              <li
                key={item.id}
                className={
                  item.readAt
                    ? 'rounded-2xl border border-line bg-card p-4'
                    : 'rounded-2xl border border-pine bg-pine-soft p-4'
                }
              >
                <p>{item.message}</p>
                {user ? (
                  <p className="mt-1 text-sm text-mist">
                    {formatWhen(item.createdAt, user.timezone)}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link to={`/sessions/${item.sessionId}`} className="text-sm text-pine">
                    View session
                  </Link>
                  {item.readAt === null ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={markOne.isPending}
                      onClick={() => {
                        setFailed(null);
                        markOne.mutate(item.id, {
                          onError: (error: unknown) => {
                            setFailed(error);
                          },
                        });
                      }}
                    >
                      Mark read
                    </button>
                  ) : (
                    <p className="text-sm text-mist">Read</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </QueryState>
    </Page>
  );
}
