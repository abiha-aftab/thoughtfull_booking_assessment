import type { ApiFieldIssue, AuthenticatedUser } from '@thoughtfull/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: readonly ApiFieldIssue[];

  constructor(
    status: number,
    code: string,
    message: string,
    issues: readonly ApiFieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldIssue(value: unknown): value is ApiFieldIssue {
  return isRecord(value) && typeof value.path === 'string' && typeof value.message === 'string';
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function apiOrigin(): string {
  const configured = import.meta.env.VITE_API_URL;
  return (
    configured && configured.trim().length > 0 ? configured : 'http://localhost:4000'
  ).replace(/\/$/, '');
}

function errorFromPayload(status: number, payload: unknown): ApiError {
  if (!isRecord(payload) || !isRecord(payload.error) || typeof payload.error.message !== 'string') {
    return new ApiError(status, 'request_failed', 'The request could not be completed.');
  }
  const code = typeof payload.error.code === 'string' ? payload.error.code : 'request_failed';
  const issues = Array.isArray(payload.error.issues)
    ? payload.error.issues.filter(isFieldIssue)
    : [];
  return new ApiError(status, code, payload.error.message, issues);
}

export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'network', 'The server could not be reached.');
  }

  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  let payload: unknown;
  if (text.length === 0) {
    payload = undefined;
  } else {
    try {
      payload = parseJson(text);
    } catch {
      throw new ApiError(
        response.status,
        'invalid_json',
        'The server returned an unreadable response.',
      );
    }
  }

  if (!response.ok) {
    throw errorFromPayload(response.status, payload);
  }
  return payload;
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.timezone !== 'string'
  ) {
    return false;
  }
  if (value.role === 'member') {
    return true;
  }
  return (
    value.role === 'professional' &&
    typeof value.title === 'string' &&
    typeof value.bio === 'string'
  );
}

export function readSessionUser(payload: unknown): AuthenticatedUser {
  if (!isRecord(payload) || !isAuthenticatedUser(payload.user)) {
    throw new ApiError(500, 'invalid_response', 'The server returned an unexpected account.');
  }
  return payload.user;
}
