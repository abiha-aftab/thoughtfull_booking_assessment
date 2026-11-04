import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, readSessionUser } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends the session cookie and reads a JSON body', async () => {
    const fetchMock = vi.fn(
      () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/auth/me');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('turns an error payload into an ApiError and a network failure into a reachable message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Response(
            JSON.stringify({
              error: { code: 'invalid_credentials', message: 'Invalid email or password' },
            }),
            { status: 401 },
          ),
      ),
    );

    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      code: 'invalid_credentials',
      message: 'Invalid email or password',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('failed'))),
    );
    await expect(apiRequest('/api/auth/me')).rejects.toMatchObject({
      code: 'network',
      message: 'The server could not be reached.',
    });
  });

  it('accepts an empty logout response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Response(null, { status: 204 })),
    );
    await expect(apiRequest('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});

describe('readSessionUser', () => {
  it('rejects a payload that is missing the signed-in account', () => {
    expect(() => readSessionUser({ user: { id: '1' } })).toThrow(ApiError);
  });
});
