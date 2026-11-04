import type { Role } from '@thoughtfull/shared';
import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUser } from '../auth/session';

export function RequireRole({ role }: { role: Role }) {
  const session = useCurrentUser();
  const user = session.data;
  if (!user) {
    return null;
  }
  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
