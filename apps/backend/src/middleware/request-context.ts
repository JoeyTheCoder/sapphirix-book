import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

import { logInfo } from '../utils/logger.js';

type RequestWithStartTime = {
  _startedAt?: number;
};

function readClientIp(forwardedForHeader: string | string[] | undefined, fallbackIp: string | undefined): string {
  if (typeof forwardedForHeader === 'string' && forwardedForHeader.trim().length > 0) {
    return forwardedForHeader.split(',')[0]!.trim();
  }

  if (Array.isArray(forwardedForHeader) && forwardedForHeader[0]) {
    return forwardedForHeader[0].trim();
  }

  return fallbackIp ?? 'unknown';
}

export const attachRequestContext: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id')?.trim() || randomUUID();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  (req as RequestWithStartTime)._startedAt = Date.now();

  next();
};

export const logRequestCompletion: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    const startedAt = (req as RequestWithStartTime)._startedAt ?? Date.now();
    const durationMs = Date.now() - startedAt;

    logInfo('request.completed', {
      requestId: typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: readClientIp(req.headers['x-forwarded-for'], req.ip),
    });
  });

  next();
};