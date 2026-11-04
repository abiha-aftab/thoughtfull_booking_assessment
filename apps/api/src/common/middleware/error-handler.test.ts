import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/app-error';
import { asyncHandler } from './async-handler';
import { errorHandler } from './error-handler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get(
    '/forbidden',
    asyncHandler(async () => {
      await Promise.resolve();
      throw new AppError(403, 'forbidden', 'Not allowed');
    }),
  );
  app.get('/crash', () => {
    throw new Error('database password=secret');
  });
  app.get('/duplicate', () => {
    throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
  });
  app.get('/duplicate-cause', () => {
    throw new Error('wrapped', { cause: Object.assign(new Error('E11000'), { code: '11000' }) });
  });
  app.get('/unsupported', () => {
    throw Object.assign(new Error('unsupported charset'), {
      status: 415,
      type: 'charset.unsupported',
    });
  });
  app.get('/cast', () => {
    throw new mongoose.Error.CastError('ObjectId', 'nope', 'id');
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('returns the application error code and status', async () => {
    const response = await request(buildApp()).get('/forbidden');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: { code: 'forbidden', message: 'Not allowed' },
    });
  });

  it('hides unexpected error details', async () => {
    const response = await request(buildApp()).get('/crash');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'internal_error', message: 'Something went wrong' },
    });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('maps a duplicate key to a conflict', async () => {
    const response = await request(buildApp()).get('/duplicate');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('conflict');
  });

  it('maps a wrapped duplicate key to a conflict', async () => {
    const response = await request(buildApp()).get('/duplicate-cause');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('conflict');
  });

  it('maps an unsupported content type', async () => {
    const response = await request(buildApp()).get('/unsupported');

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('unsupported_media_type');
  });

  it('maps a mongoose cast error to validation', async () => {
    const response = await request(buildApp()).get('/cast');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_error');
  });

  it('rejects malformed json', async () => {
    const response = await request(buildApp())
      .post('/forbidden')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_json');
  });
});
