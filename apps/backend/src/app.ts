import cors from 'cors';
import express, { type Express } from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { registerRoutes } from './routes/index.js';
import { uploadsRoot } from './uploads/storage.js';

function registerCoreMiddleware(app: Express): void {
  app.use(cors());
  app.use(express.json());
  app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    });

    next();
  });
}

export function createApp(): Express {
  const app = express();

  registerCoreMiddleware(app);
  app.use('/uploads', express.static(uploadsRoot));
  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}