import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from './error-handler';
import { validate } from './validate';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post(
    '/echo',
    validate({
      body: z.object({ name: z.string().min(1) }),
      query: z.object({ limit: z.coerce.number().int().positive() }),
    }),
    (_req, res) => {
      res.status(200).json(res.locals.validated);
    },
  );
  app.use(errorHandler);
  return app;
}

describe('validate', () => {
  it('replaces the body and query with the parsed values', async () => {
    const response = await request(buildApp()).post('/echo?limit=5').send({ name: 'Maya' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { name: 'Maya' },
      query: { limit: 5 },
    });
  });

  it('returns field issues when the body is invalid', async () => {
    const response = await request(buildApp()).post('/echo?limit=5').send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_error');
    expect(response.body.error.issues).toEqual([expect.objectContaining({ path: 'name' })]);
  });

  it('returns field issues when the query is invalid', async () => {
    const response = await request(buildApp()).post('/echo?limit=0').send({ name: 'Maya' });

    expect(response.status).toBe(400);
    expect(response.body.error.issues).toEqual([expect.objectContaining({ path: 'limit' })]);
  });

  it('rejects a null body, an array body, and a repeated query value', async () => {
    const app = buildApp();

    const nullBody = await request(app)
      .post('/echo?limit=5')
      .set('Content-Type', 'application/json')
      .send('null');
    const arrayBody = await request(app).post('/echo?limit=5').send(['Maya']);
    const repeatedQuery = await request(app).post('/echo?limit=1&limit=2').send({ name: 'Maya' });

    expect(nullBody.status).toBe(400);
    expect(arrayBody.status).toBe(400);
    expect(repeatedQuery.status).toBe(400);
    expect(repeatedQuery.body.error.issues).toEqual([expect.objectContaining({ path: 'limit' })]);
  });
});
