import type { RequestHandler } from 'express';

import { HttpError } from '../errors/http-error.js';

type RateLimitOptions = {
  bucket: string;
  windowMs: number;
  maxRequests: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

function getClientIp(value: string | string[] | undefined, fallbackIp: string | undefined): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',')[0]!.trim();
  }

  if (Array.isArray(value) && value[0]) {
    return value[0].trim();
  }

  return fallbackIp ?? 'unknown';
}

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const ip = getClientIp(req.headers['x-forwarded-for'], req.ip);
    const key = `${options.bucket}:${ip}`;
    const existingEntry = store.get(key);

    if (!existingEntry || existingEntry.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (existingEntry.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existingEntry.resetAt - now) / 1000));
      res.setHeader('retry-after', retryAfterSeconds.toString());
      next(new HttpError(429, 'Too many requests. Please try again shortly.'));
      return;
    }

    existingEntry.count += 1;
    store.set(key, existingEntry);
    next();
  };
}