import { describe, expect, it } from 'vitest';
import { bookSessionSchema, sessionListQuerySchema } from './session.schema';

describe('bookSessionSchema', () => {
  it('requires a 24-character id and an instant', () => {
    expect(
      bookSessionSchema.safeParse({
        professionalId: '507f1f77bcf86cd799439011',
        startAt: '2026-06-01T09:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      bookSessionSchema.safeParse({
        professionalId: '123456789012',
        startAt: '2026-06-01T09:00:00.000Z',
      }).success,
    ).toBe(false);
    expect(
      bookSessionSchema.safeParse({
        professionalId: '507f1f77bcf86cd799439011',
        startAt: '2026-06-01',
      }).success,
    ).toBe(false);
  });
});

describe('sessionListQuerySchema', () => {
  it('accepts only upcoming or past', () => {
    expect(sessionListQuerySchema.safeParse({ when: 'upcoming' }).success).toBe(true);
    expect(sessionListQuerySchema.safeParse({ when: 'later' }).success).toBe(false);
    expect(sessionListQuerySchema.safeParse({}).success).toBe(false);
  });
});
