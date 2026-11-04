import { useCurrentUser } from '../auth/session';
import { ProfessionalsPage } from './professionals-page';
import { SchedulePage } from './schedule-page';

export function HomePage() {
  const session = useCurrentUser();
  const user = session.data;
  if (!user) {
    return null;
  }
  return user.role === 'member' ? <ProfessionalsPage /> : <SchedulePage />;
}
