import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { HttpError } from '../errors/http-error.js';

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new HttpError(400, 'Invalid request body', result.error.flatten()));
      return;
    }

    req.body = result.data;
    next();
  };
}