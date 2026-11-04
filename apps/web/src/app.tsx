import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { RequireRole } from './components/role-gate';
import { GuestOnly, RequireAuth } from './components/session-gate';
import { AvailabilityPage } from './pages/availability-page';
import { ConfirmPage } from './pages/confirm-page';
import { HomePage } from './pages/home-page';
import { LoginPage } from './pages/login-page';
import { NotificationsPage } from './pages/notifications-page';
import { ProfilePage } from './pages/profile-page';
import { RegisterPage } from './pages/register-page';
import { ReschedulePage } from './pages/reschedule-page';
import { SessionPage } from './pages/session-page';
import { SessionsPage } from './pages/sessions-page';

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/sessions/:id" element={<SessionPage />} />
          <Route element={<RequireRole role="member" />}>
            <Route path="/professionals/:id/book" element={<ConfirmPage />} />
            <Route path="/professionals/:id" element={<ProfilePage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:id/reschedule" element={<ReschedulePage />} />
          </Route>
          <Route element={<RequireRole role="professional" />}>
            <Route path="/availability" element={<AvailabilityPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
