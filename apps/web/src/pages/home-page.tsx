import { SESSION_DURATION_MINUTES } from '@thoughtfull/shared';
import { roleLabel, timezoneLabel } from '../auth/paths';
import { useCurrentUser } from '../auth/session';

export function HomePage() {
  const session = useCurrentUser();
  const user = session.data;
  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-semibold tracking-wide text-pine uppercase">Account</p>
      <h1 className="mt-2 font-serif text-5xl">Hello, {user.name.split(' ')[0] ?? user.name}</h1>
      <p className="mt-4 max-w-xl text-lg text-mist">
        Appointments last {SESSION_DURATION_MINUTES} minutes and are shown in your timezone.
      </p>
      <dl className="mt-10 grid max-w-xl gap-4 rounded-3xl border border-line bg-card p-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-mist">Name</dt>
          <dd className="font-semibold">{user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-mist">Email</dt>
          <dd className="font-semibold">{user.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-mist">Role</dt>
          <dd className="font-semibold">{roleLabel(user.role)}</dd>
        </div>
        <div>
          <dt className="text-sm text-mist">Timezone</dt>
          <dd className="font-semibold">{timezoneLabel(user.timezone)}</dd>
        </div>
        {user.role === 'professional' ? (
          <>
            <div>
              <dt className="text-sm text-mist">Title</dt>
              <dd className="font-semibold">{user.title}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-mist">Bio</dt>
              <dd>{user.bio}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </main>
  );
}
