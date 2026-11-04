import { Link, Outlet } from 'react-router-dom';
import { roleLabel, timezoneLabel } from '../auth/paths';
import { useCurrentUser, useLogout } from '../auth/session';

export function AppShell() {
  const session = useCurrentUser();
  const logout = useLogout();
  const user = session.data;
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="font-serif text-3xl text-pine-dark">
            ThoughtFull
          </Link>
          <div className="text-sm">
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
