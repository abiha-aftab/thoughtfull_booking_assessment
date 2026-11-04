import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../auth/session';
import { ThemeToggle } from './theme-toggle';

function SessionStatus({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-6">
      <div className="mb-8 flex justify-end">
        <ThemeToggle />
      </div>
      <p className="text-lg font-semibold tracking-tight text-pine">ThoughtFull</p>
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      {action && onAction ? (
        <button
          type="button"
          className="mt-6 w-fit rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-paper"
          onClick={onAction}
        >
          {action}
        </button>
      ) : null}
    </main>
  );
}

export function RequireAuth() {
  const session = useCurrentUser();
  const location = useLocation();

  if (session.isPending) {
    return <SessionStatus title="Checking your session…" />;
  }
  if (session.isError) {
    return (
      <SessionStatus
        title="ThoughtFull could not be reached."
        action="Try again"
        onAction={() => {
          void session.refetch();
        }}
      />
    );
  }
  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const session = useCurrentUser();
  if (session.isPending) {
    return <SessionStatus title="Checking your session…" />;
  }
  if (session.isError) {
    return (
      <SessionStatus
        title="ThoughtFull could not be reached."
        action="Try again"
        onAction={() => {
          void session.refetch();
        }}
      />
    );
  }
  if (session.data) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
