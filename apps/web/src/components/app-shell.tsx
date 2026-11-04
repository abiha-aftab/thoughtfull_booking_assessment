import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { roleLabel, timezoneAbbreviation, timezoneLabel } from '../auth/paths';
import { useCurrentUser, useLogout } from '../auth/session';
import { useNotifications } from '../booking/queries';
import { ThemeToggle } from './theme-toggle';

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? 'inline-flex items-center gap-1.5 rounded-lg bg-pine px-2 py-1.5 text-sm font-semibold text-paper shadow-[0_4px_14px_rgb(61_207_155_/_0.28)] lg:px-3'
    : 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-mist hover:bg-chip-strong hover:text-ink lg:px-3';
}

function ZoneClock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
  const zone = timezoneAbbreviation(timeZone, now) ?? timeZone;
  return (
    <span className="block whitespace-nowrap text-[11px] leading-4 font-medium text-ink tabular-nums">
      {time} ({zone})
    </span>
  );
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');
  return letters.toUpperCase();
}

function SectionLink({
  to,
  end = false,
  label,
  count = 0,
}: {
  to: string;
  end?: boolean;
  label: string;
  count?: number;
}) {
  return (
    <NavLink to={to} end={end} className={navClass}>
      {({ isActive }) => (
        <>
          {label}
          {count > 0 ? (
            <span
              className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                isActive ? 'bg-paper text-pine' : 'bg-pine text-paper'
              }`}
            >
              {count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
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
      <header className="sticky top-0 z-20 border-b border-hairline bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-3 py-2 sm:h-16 sm:flex-nowrap sm:py-0 lg:gap-6 lg:px-6">
          <Link to="/" aria-label="ThoughtFull" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-pine text-sm font-semibold text-paper">
              T
            </span>
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
              ThoughtFull
            </span>
          </Link>
          <nav
            className="order-last flex w-full min-w-0 items-center gap-0.5 overflow-x-auto rounded-xl bg-chip p-1 sm:order-none sm:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Sections"
          >
            {user.role === 'member' ? (
              <>
                <SectionLink to="/" end label="Professionals" />
                <SectionLink to="/sessions" label="Sessions" />
              </>
            ) : (
              <>
                <SectionLink to="/" end label="Schedule" />
                <SectionLink to="/availability" label="Hours" />
              </>
            )}
            <SectionLink to="/notifications" label="Notifications" count={unread} />
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <span aria-hidden="true" className="h-5 w-px bg-line" />
            <div
              className="flex items-center gap-2"
              title={`${user.name} · ${roleLabel(user.role)} · ${timezoneLabel(user.timezone)}`}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-pine-soft text-xs font-semibold text-pine ring-1 ring-pine/30">
                {initials(user.name)}
              </span>
              <span className="min-w-0">
                <span className="block max-w-36 truncate text-sm font-semibold leading-4">
                  {user.name}
                </span>
                <span className="block text-[11px] leading-4 text-mist">
                  {roleLabel(user.role)}
                </span>
                <ZoneClock timeZone={user.timezone} />
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-mist hover:bg-clay-soft hover:text-clay disabled:opacity-60"
              onClick={() => {
                logout.mutate();
              }}
              disabled={logout.isPending}
            >
              {logout.isPending ? 'Signing out…' : 'Log out'}
            </button>
          </div>
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
