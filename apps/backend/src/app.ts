import cors from 'cors';
import express, { type Express } from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';
import { attachRequestContext, logRequestCompletion } from './middleware/request-context.js';
import { registerRoutes } from './routes/index.js';
import { uploadsRoot } from './uploads/storage.js';
import { getEnv } from './config/env.js';

function registerCoreMiddleware(app: Express): void {
  app.use(cors());
  app.use(express.json());
  app.use(attachRequestContext);
  app.use(logRequestCompletion);
}

export function createApp(): Express {
  const app = express();
  const env = getEnv();

  registerCoreMiddleware(app);
  app.use('/uploads', express.static(uploadsRoot));
  app.use(
    '/api/v1/salons/:slug/availability',
    createRateLimitMiddleware({
      bucket: 'public-availability',
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_AVAILABILITY_MAX_REQUESTS,
    }),
  );
  app.use(
    '/api/v1/salons/:slug/availability-calendar',
    createRateLimitMiddleware({
      bucket: 'public-availability-calendar',
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_AVAILABILITY_MAX_REQUESTS,
    }),
  );
  app.use(
    '/api/v1/bookings',
    createRateLimitMiddleware({
      bucket: 'public-bookings',
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_BOOKING_MAX_REQUESTS,
    }),
  );
  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}