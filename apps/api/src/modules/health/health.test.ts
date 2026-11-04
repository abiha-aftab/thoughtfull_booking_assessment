import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../config/db';

describe('health', () => {
  afterEach(async () => {
    await disconnectDb();
  });

  it('reports that the database is disconnected', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable', database: 'disconnected' });
  });

  it('pings MongoDB through Mongoose when connected', async () => {
    const server = await MongoMemoryServer.create();
    try {
      await connectDb(server.getUri());
      const response = await request(createApp()).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    } finally {
      await disconnectDb();
      await server.stop();
    }
  });

  it('returns a not-found error for an unknown route', async () => {
    const response = await request(createApp()).get('/api/missing');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });

  it('rejects a body larger than 100kb', async () => {
    const response = await request(createApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send({ blob: 'x'.repeat(120_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('payload_too_large');
  });
});
