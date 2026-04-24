import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from '../errors/http-error.js';
import { logError } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;

  if (error instanceof HttpError) {
    if (error.statusCode >= 500) {
      logError('request.failed', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: error.statusCode,
        message: error.message,
        details: error.details ?? null,
      });
    }

    res.status(error.statusCode).json({
      error: error.message,
      details: error.details ?? null,
      requestId: requestId ?? null,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.flatten(),
      requestId: requestId ?? null,
    });
    return;
  }

  logError('request.unhandled_error', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack ?? null : null,
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId: requestId ?? null,
  });
};