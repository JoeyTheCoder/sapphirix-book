import { Router } from 'express';

import { HttpError } from '../errors/http-error.js';
import { requireAdminAuth } from '../middleware/require-admin-auth.js';
import { validateBody } from '../middleware/validate-body.js';
import {
  createServiceSchema,
  createTimeOffBlockSchema,
  replaceOpeningHoursSchema,
  updateSalonProfileSchema,
} from '../modules/admin/admin-setup.schemas.js';
import {
  archiveService,
  createService,
  createTimeOffBlock,
  deleteTimeOffBlock,
  getOpeningHours,
  getSalonProfile,
  listServices,
  listTimeOffBlocks,
  replaceOpeningHours,
  setSalonLogo,
  updateSalonProfile,
  updateService,
} from '../modules/admin/admin-setup.service.js';
import { listUpcomingBookingsForSalon } from '../modules/bookings/bookings.service.js';
import { salonLogoUpload, toSalonLogoPublicPath } from '../uploads/storage.js';

function readRouteParam(value: string | string[] | undefined, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${fieldName} is required`);
  }

  return value;
}

export function createAdminRouter(): Router {
  const router = Router();

  router.use(requireAdminAuth);

  router.get('/me', (req, res) => {
    res.json(res.locals.adminContext);
  });

  router.get('/salon', async (_req, res, next) => {
    try {
      const salon = await getSalonProfile(res.locals.adminContext.salon.id);
      res.json({ salon });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/salon', validateBody(updateSalonProfileSchema), async (req, res, next) => {
    try {
      const salon = await updateSalonProfile(res.locals.adminContext.salon.id, req.body);
      res.json({ salon });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/salon/logo',
    (req, res, next) => {
      salonLogoUpload.single('logo')(req, res, (error) => {
        if (error) {
          next(error);
          return;
        }

        next();
      });
    },
    async (req, res, next) => {
      try {
        if (!req.file) {
          throw new HttpError(400, 'Logo file is required');
        }

        const salon = await setSalonLogo(res.locals.adminContext.salon.id, toSalonLogoPublicPath(req.file.filename));
        res.json({ salon });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/services', async (_req, res, next) => {
    try {
      const services = await listServices(res.locals.adminContext.salon.id);
      res.json({ services });
    } catch (error) {
      next(error);
    }
  });

  router.post('/services', validateBody(createServiceSchema), async (req, res, next) => {
    try {
      const service = await createService(res.locals.adminContext.salon.id, req.body);
      res.status(201).json({ service });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/services/:serviceId', validateBody(createServiceSchema), async (req, res, next) => {
    try {
      const serviceId = readRouteParam(req.params.serviceId, 'serviceId');
      const service = await updateService(res.locals.adminContext.salon.id, serviceId, req.body);
      res.json({ service });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/services/:serviceId', async (req, res, next) => {
    try {
      const serviceId = readRouteParam(req.params.serviceId, 'serviceId');
      await archiveService(res.locals.adminContext.salon.id, serviceId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/opening-hours', async (_req, res, next) => {
    try {
      const openingHours = await getOpeningHours(res.locals.adminContext.salon.id);
      res.json({ openingHours });
    } catch (error) {
      next(error);
    }
  });

  router.put('/opening-hours', validateBody(replaceOpeningHoursSchema), async (req, res, next) => {
    try {
      const openingHours = await replaceOpeningHours(res.locals.adminContext.salon.id, req.body);
      res.json({ openingHours });
    } catch (error) {
      next(error);
    }
  });

  router.get('/time-off-blocks', async (_req, res, next) => {
    try {
      const timeOffBlocks = await listTimeOffBlocks(res.locals.adminContext.salon.id);
      res.json({ timeOffBlocks });
    } catch (error) {
      next(error);
    }
  });

  router.post('/time-off-blocks', validateBody(createTimeOffBlockSchema), async (req, res, next) => {
    try {
      const timeOffBlock = await createTimeOffBlock(res.locals.adminContext.salon.id, req.body);
      res.status(201).json({ timeOffBlock });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/time-off-blocks/:blockId', async (req, res, next) => {
    try {
      const blockId = readRouteParam(req.params.blockId, 'blockId');
      await deleteTimeOffBlock(res.locals.adminContext.salon.id, blockId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/bookings/upcoming', async (_req, res, next) => {
    try {
      const bookings = await listUpcomingBookingsForSalon(res.locals.adminContext.salon.id);
      res.json({ bookings });
    } catch (error) {
      next(error);
    }
  });

  return router;
}