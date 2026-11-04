import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  now?: () => number;
};

export function rateLimit(options: RateLimitOptions) {
  const hits = new Map<string, number[]>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = options.now?.() ?? Date.now();
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
