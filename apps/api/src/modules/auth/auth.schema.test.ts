import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.schema';

const password = 'correct-horse-1';

describe('registerSchema', () => {
  it('normalizes email and timezone whitespace', () => {
    const parsed = registerSchema.parse({
      name: '  Maya Chen  ',
      email: '  Maya@Example.com ',
      password,
      role: 'member',
      timezone: '  America/New_York ',
    });

    expect(parsed).toMatchObject({
      name: 'Maya Chen',
      email: 'maya@example.com',
      timezone: 'America/New_York',
    });
  });

  it('rejects an unknown role, timezone, short password, and a password over 72 bytes', () => {
    expect(
      registerSchema.safeParse({
        name: 'Maya',
        email: 'maya@example.com',
        password,
        role: 'admin',
        timezone: 'UTC',
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: 'Maya',
        email: 'maya@example.com',
        password,
        role: 'member',
        timezone: 'Not/AZone',
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: 'Maya',
        email: 'maya@example.com',
        password: '        ',
        role: 'member',
        timezone: 'UTC',
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: 'Maya',
        email: 'maya@example.com',
        password: 'a'.repeat(72),
        role: 'member',
        timezone: 'UTC',
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        name: 'Maya',
        email: 'maya@example.com',
        password: 'a'.repeat(73),
        role: 'member',
        timezone: 'UTC',
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: 'Maya',
        email: 'maya@example.com',
        password: '😀'.repeat(19),
        role: 'member',
        timezone: 'UTC',
      }).success,
    ).toBe(false);
  });

  it('requires a title and bio for a professional and drops them for a member', () => {
    const professional = registerSchema.safeParse({
      name: 'Avery',
      email: 'avery@example.com',
      password,
      role: 'professional',
      timezone: 'Asia/Singapore',
      title: ' Coach ',
      bio: ' Fictional profile. ',
    });
    expect(professional.success).toBe(true);
    if (professional.success) {
      expect(professional.data).toMatchObject({ title: 'Coach', bio: 'Fictional profile.' });
    }

    const missingBio = registerSchema.safeParse({
      name: 'Avery',
      email: 'avery@example.com',
      password,
      role: 'professional',
      timezone: 'Asia/Singapore',
      title: 'Coach',
    });
    expect(missingBio.success).toBe(false);

    const member = registerSchema.parse({
      name: 'Maya',
      email: 'maya@example.com',
      password,
      role: 'member',
      timezone: 'UTC',
      title: 'Should not stick',
    });
    expect(member).not.toHaveProperty('title');
  });
});

describe('loginSchema', () => {
  it('rejects an oversized password without revealing account details', () => {
    expect(
      loginSchema.safeParse({ email: 'maya@example.com', password: 'a'.repeat(73) }).success,
    ).toBe(false);
  });
});
