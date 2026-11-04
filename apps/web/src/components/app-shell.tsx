import { Link, NavLink, Outlet } from 'react-router-dom';
import { roleLabel, timezoneLabel } from '../auth/paths';
import { useCurrentUser, useLogout } from '../auth/session';
import { useNotifications } from '../booking/queries';

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'font-semibold text-pine' : 'text-mist';
}

export function AppShell() {
  const session = useCurrentUser();
  const logout = useLogout();
  const notifications = useNotifications();
  const user = session.data;
  if (!user) {
    return null;
  }
  const unread = notifications.data?.filter((item) => item.readAt === null).length ?? 0;

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <Link to="/" className="font-serif text-3xl text-pine-dark">
            ThoughtFull
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm" aria-label="Sections">
            {user.role === 'member' ? (
              <>
                <NavLink to="/" end className={navClass}>
                  Professionals
                </NavLink>
                <NavLink to="/sessions" className={navClass}>
                  Sessions
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={navClass}>
                  Schedule
                </NavLink>
                <NavLink to="/availability" className={navClass}>
                  Hours
                </NavLink>
              </>
            )}
            <NavLink to="/notifications" className={navClass}>
              Notifications
              {unread > 0 ? (
                <span className="ml-2 rounded-full bg-pine px-2 text-card">{unread}</span>
              ) : null}
            </NavLink>
          </nav>
          <div className="ml-auto text-sm">
            <p className="font-semibold">{user.name}</p>
            <p className="text-mist">
              {roleLabel(user.role)} · {timezoneLabel(user.timezone)}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-line px-4 py-2 text-sm"
            onClick={() => {
              logout.mutate();
            }}
            disabled={logout.isPending}
          >
            {logout.isPending ? 'Signing out…' : 'Log out'}
          </button>
        </div>
        {logout.isError ? (
          <p role="alert" className="px-6 pb-3 text-sm text-clay">
            Could not log out. Try again.
          </p>
        ) : null}
      </header>
      <Outlet />
    </div>
  );
}
