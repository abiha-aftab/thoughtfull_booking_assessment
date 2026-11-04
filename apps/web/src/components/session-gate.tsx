import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../auth/session';

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
      <p className="font-serif text-3xl">ThoughtFull</p>
      <h1 className="mt-4 text-xl">{title}</h1>
      {action && onAction ? (
        <button
          type="button"
          className="mt-6 w-fit rounded-full bg-pine px-4 py-2 text-card"
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
