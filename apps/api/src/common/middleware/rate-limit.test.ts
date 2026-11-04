import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from './error-handler';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  it('blocks further attempts until the window moves forward', async () => {
    let now = 1_000;
    const app = express();
    app.use(
      rateLimit({
        windowMs: 100,
        max: 2,
        now: () => now,
      }),
    );
    app.get('/limited', (_req, res) => {
      res.status(204).send();
    });
    app.use(errorHandler);

    expect((await request(app).get('/limited')).status).toBe(204);
    expect((await request(app).get('/limited')).status).toBe(204);

    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('rate_limited');

    now = 1_200;
    expect((await request(app).get('/limited')).status).toBe(204);
  });
});
