import { describe, expect, it } from 'vitest';
import { loginFormSchema, registerFormSchema, registerRequestBody } from './schemas';

const member = {
  name: ' Maya Chen ',
  email: ' Maya@Example.com ',
  password: 'correct-horse-1',
  timezone: 'UTC',
  role: 'member' as const,
  title: 'Should not be sent',
  bio: 'Should not be sent',
};

describe('registerFormSchema', () => {
  it('normalizes a member and leaves title and bio out of the request', () => {
    const parsed = registerFormSchema.parse(member);
    expect(parsed.email).toBe('maya@example.com');
    expect(parsed.name).toBe('Maya Chen');
    expect(registerRequestBody(parsed)).toEqual({
      name: 'Maya Chen',
      email: 'maya@example.com',
      password: 'correct-horse-1',
      timezone: 'UTC',
      role: 'member',
    });
  });

  it('requires a title and bio for a professional and rejects a short or oversized password', () => {
    expect(
      registerFormSchema.safeParse({ ...member, role: 'professional', title: ' ', bio: '' })
        .success,
    ).toBe(false);
    expect(registerFormSchema.safeParse({ ...member, password: 'short' }).success).toBe(false);
    expect(registerFormSchema.safeParse({ ...member, password: 'a'.repeat(73) }).success).toBe(
      false,
    );
    expect(registerFormSchema.safeParse({ ...member, timezone: 'Not/AZone' }).success).toBe(false);
    expect(
      registerFormSchema.safeParse({
        ...member,
        role: 'professional',
        title: 'Coach',
        bio: 'Fictional coach used for tests.',
      }).success,
    ).toBe(true);
  });
});

describe('loginFormSchema', () => {
  it('rejects an empty password and a password over 72 bytes', () => {
    expect(loginFormSchema.safeParse({ email: 'maya@example.com', password: '' }).success).toBe(
      false,
    );
    expect(
      loginFormSchema.safeParse({ email: 'maya@example.com', password: 'a'.repeat(73) }).success,
    ).toBe(false);
    expect(
      loginFormSchema.safeParse({ email: ' Maya@Example.com ', password: 'correct-horse-1' })
        .success,
    ).toBe(true);
  });
});
