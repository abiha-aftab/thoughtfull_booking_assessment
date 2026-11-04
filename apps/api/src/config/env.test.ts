import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/thoughtfull-booking',
  WEB_ORIGIN: 'http://localhost:5173',
};

describe('parseEnv', () => {
  it('applies defaults for port and environment', () => {
    expect(parseEnv(valid)).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 4000,
      MONGODB_URI: valid.MONGODB_URI,
      WEB_ORIGIN: valid.WEB_ORIGIN,
    });
  });

  it('rejects a missing database uri', () => {
    expect(() => parseEnv({ WEB_ORIGIN: valid.WEB_ORIGIN })).toThrow(/MONGODB_URI/);
  });

  it('rejects an origin that is not a url', () => {
    expect(() => parseEnv({ ...valid, WEB_ORIGIN: 'localhost' })).toThrow(/WEB_ORIGIN/);
  });

  it('rejects a non-positive port', () => {
    expect(() => parseEnv({ ...valid, API_PORT: '0' })).toThrow(/API_PORT/);
  });

  it('rejects a port above 65535 and a value that is not an integer', () => {
    expect(() => parseEnv({ ...valid, API_PORT: '65536' })).toThrow(/API_PORT/);
    expect(() => parseEnv({ ...valid, API_PORT: '4000.5' })).toThrow(/API_PORT/);
  });

  it('rejects an unknown environment and a uri that is not MongoDB', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ ...valid, MONGODB_URI: 'postgres://localhost/db' })).toThrow(
      /MONGODB_URI/,
    );
  });

  it('trims the origin and accepts a mongodb+srv uri', () => {
    expect(
      parseEnv({
        MONGODB_URI: 'mongodb+srv://cluster.example.net/thoughtfull-booking',
        WEB_ORIGIN: '  http://localhost:5173  ',
      }),
    ).toMatchObject({
      MONGODB_URI: 'mongodb+srv://cluster.example.net/thoughtfull-booking',
      WEB_ORIGIN: 'http://localhost:5173',
    });
  });
});
