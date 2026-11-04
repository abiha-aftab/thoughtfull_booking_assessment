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

  it('forgets addresses whose attempts have all left the window', async () => {
    let now = 1_000;
    const hits = new Map<string, number[]>();
    const app = express();
    app.set('trust proxy', true);
    app.use(rateLimit({ windowMs: 100, max: 2, now: () => now, hits }));
    app.get('/limited', (_req, res) => {
      res.status(204).send();
    });

    for (const address of ['203.0.113.1', '203.0.113.2', '203.0.113.3']) {
      await request(app).get('/limited').set('X-Forwarded-For', address);
    }
    expect(hits.size).toBe(3);

    now = 1_150;
    await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.9');
    expect([...hits.keys()]).toEqual(['203.0.113.9']);
  });
});
