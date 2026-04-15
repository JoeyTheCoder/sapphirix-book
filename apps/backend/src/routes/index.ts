import type { Express } from 'express';

import { createAdminRouter } from './admin.routes.js';
import { createHealthRouter } from './health.routes.js';
import { createPublicRouter } from './public.routes.js';

export function registerRoutes(app: Express): void {
  app.use(createHealthRouter());
  app.use('/api/v1', createPublicRouter());
  app.use('/api/v1/admin', createAdminRouter());
}