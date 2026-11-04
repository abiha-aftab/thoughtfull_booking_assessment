import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app';
import { CANCELLATION_WINDOW_MESSAGE, formatTime } from './time';

const member = {
  id: '507f1f77bcf86cd799439011',
  name: 'Maya Chen',
  email: 'maya@example.com',
  role: 'member' as const,
  timezone: 'America/New_York',
};

const professionalUser = {
  id: '507f1f77bcf86cd799439012',
  name: 'Priya Shah',
  email: 'priya@example.com',
  role: 'professional' as const,
  title: 'Counsellor',
  bio: 'I help people prepare for difficult conversations.',
  timezone: 'Asia/Karachi',
};

const profile = {
  id: professionalUser.id,
  name: professionalUser.name,
  title: professionalUser.title,
  bio: professionalUser.bio,
  timezone: professionalUser.timezone,
};

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function requestBody(body: BodyInit | null | undefined): string {
  return typeof body === 'string' ? body : '';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(<App />, { wrapper: Wrapper });
}

function slotAround(offsetMs: number) {
  const start = new Date(Date.now() + offsetMs);
  return {
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 50 * 60 * 1000).toISOString(),
  };
}

function sessionFor(
  slot: { startAt: string; endAt: string },
  status: 'booked' | 'cancelled' = 'booked',
) {
  return {
    id: '507f1f77bcf86cd799439013',
    memberId: member.id,
    professionalId: profile.id,
    memberName: member.name,
    professionalName: profile.name,
    startAt: slot.startAt,
    endAt: slot.endAt,
    status,
  };
}

describe('booking screens', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('books a visible slot without sending a user id and ignores extra slot fields', async () => {
    const slot = slotAround(48 * 60 * 60 * 1000);
    const session = sessionFor(slot);
    fetchMock.mockImplementation((input, init) => {
      const url = requestUrl(input);
      const method = init?.method ?? 'GET';
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(json({ user: member }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      if (url.includes('/slots')) {
        return Promise.resolve(
          json({ slots: [{ ...slot, memberName: 'Hidden Member', bookingId: 'secret' }] }),
        );
      }
      if (url.includes(`/api/professionals/${profile.id}`)) {
        return Promise.resolve(json({ professional: profile }));
      }
      if (url.includes('/api/professionals')) {
        return Promise.resolve(json({ professionals: [profile], page: 1, pageSize: 20, total: 1 }));
      }
      if (method === 'POST' && url.endsWith('/api/sessions')) {
        return Promise.resolve(json({ session }, 201));
      }
      if (url.includes(`/api/sessions/${session.id}`)) {
        return Promise.resolve(json({ session }));
      }
      return Promise.resolve(json({ error: { code: 'not_found', message: 'Not found' } }, 404));
    });

    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('link', { name: /Priya Shah/ }));
    expect(screen.queryByText('Hidden Member')).not.toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: formatTime(slot.startAt, member.timezone) }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Confirm your session' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Book session' }));

    await screen.findByRole('heading', { name: 'Session with Priya Shah' });
    const post = fetchMock.mock.calls.find(
      (call) => requestUrl(call[0]).endsWith('/api/sessions') && call[1]?.method === 'POST',
    );
    const body = JSON.parse(requestBody(post?.[1]?.body)) as Record<string, unknown>;
    expect(body).toEqual({ professionalId: profile.id, startAt: slot.startAt });
    expect(post?.[1]?.credentials).toBe('include');
    expect(screen.getByRole('link', { name: 'Reschedule' })).toBeInTheDocument();
  });

  it('stays on confirmation when the slot was just taken', async () => {
    const slot = slotAround(48 * 60 * 60 * 1000);
    fetchMock.mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(json({ user: member }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      if (url.includes('/slots')) {
        return Promise.resolve(json({ slots: [slot] }));
      }
      if (url.includes('/api/professionals/')) {
        return Promise.resolve(json({ professional: profile }));
      }
      if (init?.method === 'POST') {
        return Promise.resolve(
          json({ error: { code: 'slot_unavailable', message: 'That time is not available' } }, 409),
        );
      }
      return Promise.resolve(json({ error: { code: 'not_found', message: 'Not found' } }, 404));
    });
    const user = userEvent.setup();
    renderAt(`/professionals/${profile.id}/book?start=${encodeURIComponent(slot.startAt)}`);
    await user.click(await screen.findByRole('button', { name: 'Book session' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That time is not available');
    expect(screen.getByRole('heading', { name: 'Confirm your session' })).toBeInTheDocument();
  });

  it('disables member changes inside 24 hours and keeps them for a later session', async () => {
    const near = sessionFor(slotAround(3 * 60 * 60 * 1000));
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(json({ user: member }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      if (url.includes(`/api/sessions/${near.id}`)) {
        return Promise.resolve(json({ session: near }));
      }
      return Promise.resolve(json({ error: { code: 'not_found', message: 'Not found' } }, 404));
    });
    const user = userEvent.setup();
    const view = renderAt(`/sessions/${near.id}`);
    expect(await screen.findByText(CANCELLATION_WINDOW_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel session' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(screen.queryByRole('button', { name: 'Confirm cancellation' })).not.toBeInTheDocument();

    const later = sessionFor(slotAround(48 * 60 * 60 * 1000));
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(json({ user: member }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      return Promise.resolve(json({ session: later }));
    });
    view.unmount();
    renderAt(`/sessions/${later.id}`);
    expect(await screen.findByRole('link', { name: 'Reschedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel session' })).toBeEnabled();
    expect(screen.queryByText(CANCELLATION_WINDOW_MESSAGE)).not.toBeInTheDocument();
  });

  it('lets a professional cancel inside the member window and shows the member name', async () => {
    const soon = sessionFor(slotAround(60 * 60 * 1000));
    const cancelled = { ...soon, status: 'cancelled' as const };
    let removed = false;
    fetchMock.mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(json({ user: professionalUser }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      if (url.endsWith('/api/sessions/schedule')) {
        return Promise.resolve(json({ sessions: removed ? [] : [soon] }));
      }
      if (init?.method === 'POST' && url.endsWith('/cancel')) {
        removed = true;
        return Promise.resolve(json({ session: cancelled }));
      }
      if (url.includes(`/api/sessions/${soon.id}`)) {
        return Promise.resolve(json({ session: removed ? cancelled : soon }));
      }
      return Promise.resolve(json({ error: { code: 'not_found', message: 'Not found' } }, 404));
    });
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('link', { name: /Maya Chen/ }));
    expect(
      await screen.findByRole('heading', { name: 'Session with Maya Chen' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(CANCELLATION_WINDOW_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reschedule' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel session' }));
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  });

  it('keeps overlapping hours off the server and blocks a duplicate date', async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(json({ user: professionalUser }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      if (url.endsWith('/api/availability/me') && (init?.method ?? 'GET') === 'GET') {
        return Promise.resolve(
          json({
            availability: {
              intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
              blockedDates: ['2026-12-01'],
            },
          }),
        );
      }
      return Promise.resolve(json({ error: { code: 'not_found', message: 'Not found' } }, 404));
    });
    const user = userEvent.setup();
    renderAt('/availability');
    await user.click(await screen.findByRole('button', { name: 'Add hours on Monday' }));
    await user.click(screen.getByRole('button', { name: 'Save hours' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Working intervals on the same day cannot overlap',
    );
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'PUT')).toBe(false);

    await user.type(screen.getByLabelText('Date to block'), '2026-12-01');
    await user.click(screen.getByRole('button', { name: 'Block date' }));
    expect(await screen.findByText('That date is already blocked')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'POST')).toBe(false);
  });

  it('shows an empty directory, a past cancellation, and refuses a member the hours page', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/me')) {
        return Promise.resolve(json({ user: member }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      if (url.includes('/api/professionals')) {
        return Promise.resolve(json({ professionals: [], page: 1, pageSize: 20, total: 0 }));
      }
      if (url.includes('when=past')) {
        return Promise.resolve(
          json({ sessions: [sessionFor(slotAround(-48 * 60 * 60 * 1000), 'cancelled')] }),
        );
      }
      if (url.includes('/api/sessions')) {
        return Promise.resolve(json({ sessions: [] }));
      }
      return Promise.resolve(json({ error: { code: 'not_found', message: 'Not found' } }, 404));
    });
    const user = userEvent.setup();
    const directory = renderAt('/');
    expect(await screen.findByText('No professionals yet.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search by name'), 'Nobody');
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => requestUrl(call[0]).includes('search=Nobody')),
      ).toBe(true);
    });
    directory.unmount();

    const past = renderAt('/sessions?when=past');
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    past.unmount();

    renderAt('/availability');
    expect(await screen.findByRole('heading', { name: 'Professionals' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save hours' })).not.toBeInTheDocument();
  });
});
