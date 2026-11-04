import { describe, expect, it } from 'vitest';
import { databaseFailureMessage } from './redact';

describe('databaseFailureMessage', () => {
  it('removes the configured connection string', () => {
    const uri = 'mongodb+srv://user:secret@cluster.example.net/thoughtfull-booking';
    const message = databaseFailureMessage(new Error(`connect failed for ${uri}`), uri);

    expect(message).toBe('connect failed for [redacted]');
    expect(message).not.toContain('secret');
  });

  it('removes credentials when the driver rewrites the connection string', () => {
    const message = databaseFailureMessage(
      new Error('failed mongodb://user:secret@127.0.0.1:27017/db'),
      'mongodb://127.0.0.1:27017/other',
    );

    expect(message).toBe('failed mongodb://[redacted]/db');
    expect(message).not.toContain('secret');
  });
});
