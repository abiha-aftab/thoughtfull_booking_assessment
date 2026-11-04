import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

const member = {
  id: '507f1f77bcf86cd799439011',
  name: 'Maya Chen',
  email: 'maya@example.com',
  role: 'member',
  timezone: 'America/New_York',
};

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

function renderApp(path: string) {
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

describe('auth screens', () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a signed-out visitor to sign in and keeps an empty password on the client', async () => {
    fetchMock.mockResolvedValue(
      json({ error: { code: 'unauthenticated', message: 'Sign in to continue' } }, 401),
    );
    const user = userEvent.setup();
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'maya@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your password')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows an invalid login and then the account after a successful sign-in', async () => {
    fetchMock.mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/login')) {
        const body = JSON.parse(requestBody(init?.body)) as { userId?: string };
        expect(body.userId).toBeUndefined();
        expect(init?.credentials).toBe('include');
        return Promise.resolve(
          json(
            { error: { code: 'invalid_credentials', message: 'Invalid email or password' } },
            401,
          ),
        );
      }
      return Promise.resolve(
        json({ error: { code: 'unauthenticated', message: 'Sign in to continue' } }, 401),
      );
    });
    const user = userEvent.setup();
    renderApp('/sessions');

    await user.type(await screen.findByLabelText('Email'), 'maya@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');

    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);
      if (url.includes('/api/professionals')) {
        return Promise.resolve(json({ professionals: [], page: 1, pageSize: 20, total: 0 }));
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve(json({ notifications: [] }));
      }
      return Promise.resolve(json({ user: member }));
    });
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Professionals' })).toBeInTheDocument();
    expect(screen.getByText('Maya Chen')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText(/\d{1,2}:\d{2}\s*[AP]M \(EST\)/)).toBeInTheDocument();
    expect(await screen.findByText('No professionals yet.')).toBeInTheDocument();
  });

  it('asks a professional for a title and does not send one for a member', async () => {
    fetchMock.mockResolvedValue(
      json({ error: { code: 'unauthenticated', message: 'Sign in to continue' } }, 401),
    );
    const user = userEvent.setup();
    renderApp('/register');

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Professional'));
    expect(screen.getByLabelText('Title')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Avery Cole');
    await user.type(screen.getByLabelText('Email'), 'avery@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Add a title')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText('Member'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) => requestUrl(call[0]).endsWith('/api/auth/register')),
      ).toBe(true);
    });
    const registerCall = fetchMock.mock.calls.find((call) =>
      requestUrl(call[0]).endsWith('/api/auth/register'),
    );
    const body = JSON.parse(requestBody(registerCall?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      name: 'Avery Cole',
      email: 'avery@example.com',
      role: 'member',
    });
    expect(body).not.toHaveProperty('title');
    expect(body).not.toHaveProperty('bio');
  });

  it('keeps the visitor on an error screen when the account cannot be loaded', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    renderApp('/');
    expect(
      await screen.findByRole('heading', { name: 'ThoughtFull could not be reached.' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('logs out and returns to the sign-in screen', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);
      if (url.endsWith('/api/auth/logout')) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(json({ user: member }));
    });
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
