import { Router } from 'express';

import { checkDatabaseHealth } from '../db/client.js';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/ready', async (_req, res, next) => {
    try {
      await checkDatabaseHealth();
      res.json({ ok: true, database: 'ready' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}