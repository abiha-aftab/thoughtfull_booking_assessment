import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  now?: () => number;
  hits?: Map<string, number[]>;
};

export function rateLimit(options: RateLimitOptions) {
  const hits = options.hits ?? new Map<string, number[]>();
  let lastSweep = options.now?.() ?? Date.now();

  // Each address only gets pruned when it comes back, so without a sweep every
  // address that ever tried to sign in would stay in memory for the life of the process.
  function sweep(now: number): void {
    if (now - lastSweep < options.windowMs) {
      return;
    }
    lastSweep = now;
    for (const [key, timestamps] of hits) {
      const newest = timestamps[timestamps.length - 1];
      if (newest === undefined || now - newest >= options.windowMs) {
        hits.delete(key);
      }
    }
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = options.now?.() ?? Date.now();
    sweep(now);
    const key = req.ip ?? 'unknown';
    const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < options.windowMs);

    if (recent.length >= options.max) {
      hits.set(key, recent);
      next(new AppError(429, 'rate_limited', 'Too many attempts. Try again later.'));
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
