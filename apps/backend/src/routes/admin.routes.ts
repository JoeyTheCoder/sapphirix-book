import { Router } from 'express';

import { HttpError } from '../errors/http-error.js';
import { requireAdminAuth } from '../middleware/require-admin-auth.js';
import { validateBody } from '../middleware/validate-body.js';
import {
  createServiceSchema,
  createStaffMemberSchema,
  createTimeOffBlockSchema,
  replaceOpeningHoursSchema,
  updateSalonProfileSchema,
} from '../modules/admin/admin-setup.schemas.js';
import {
  adminBookingsCalendarQuerySchema,
  adminBookingsQuerySchema,
  createAdminBookingSchema,
  updateAdminBookingSchema,
} from '../modules/bookings/admin-bookings.schemas.js';
import {
  archiveService,
  createService,
  createStaffMember,
  createTimeOffBlock,
  deleteStaffMember,
  deleteTimeOffBlock,
  getOpeningHours,
  getSalonProfile,
  listServices,
  listStaffMembers,
  listTimeOffBlocks,
  replaceOpeningHours,
  setSalonLogo,
  updateSalonProfile,
  updateService,
} from '../modules/admin/admin-setup.service.js';
import { listNotificationsForAdmin, markNotificationsAsRead } from '../modules/admin/admin-notifications.service.js';
import {
  createAdminBookingForSalon,
  deleteBookingForSalon,
  getBookingDetailForSalon,
  listBookingsForSalon,
  listCalendarBookingsForSalon,
  listUpcomingBookingsForSalon,
  updateBookingForSalon,
} from '../modules/bookings/bookings.service.js';
import { salonLogoUpload, toSalonLogoPublicPath } from '../uploads/storage.js';

function readRouteParam(value: string | string[] | undefined, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${fieldName} is required`);
  }

  return value;
}

function readQuery<T>(value: unknown, schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => unknown } } }) {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'Invalid query parameters', result.error.flatten());
  }

  return result.data;
}

export function createAdminRouter(): Router {
  const router = Router();

  router.use(requireAdminAuth);

  router.get('/me', (req, res) => {
    res.json(res.locals.adminContext);
  });

  router.get('/notifications', async (_req, res, next) => {
    try {
      const result = await listNotificationsForAdmin(
        res.locals.adminContext.admin.id,
        res.locals.adminContext.salon.id,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/notifications/read', async (_req, res, next) => {
    try {
      const result = await markNotificationsAsRead(res.locals.adminContext.admin.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
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

  router.get('/bookings', async (req, res, next) => {
    try {
      const query = readQuery(req.query, adminBookingsQuerySchema);
      const bookings = await listBookingsForSalon(res.locals.adminContext.salon.id, query);
      res.json({ bookings });
    } catch (error) {
      next(error);
    }
  });

  router.get('/bookings/calendar', async (req, res, next) => {
    try {
      const query = readQuery(req.query, adminBookingsCalendarQuerySchema);
      const calendar = await listCalendarBookingsForSalon(res.locals.adminContext.salon.id, query);
      res.json(calendar);
    } catch (error) {
      next(error);
    }
  });

  router.get('/bookings/:bookingId', async (req, res, next) => {
    try {
      const bookingId = readRouteParam(req.params.bookingId, 'bookingId');
      const booking = await getBookingDetailForSalon(res.locals.adminContext.salon.id, bookingId);
      res.json({ booking });
    } catch (error) {
      next(error);
    }
  });

  router.post('/bookings', validateBody(createAdminBookingSchema), async (req, res, next) => {
    try {
      const booking = await createAdminBookingForSalon(res.locals.adminContext.salon.id, req.body);
      res.status(201).json({ booking });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/bookings/:bookingId', validateBody(updateAdminBookingSchema), async (req, res, next) => {
    try {
      const bookingId = readRouteParam(req.params.bookingId, 'bookingId');
      const booking = await updateBookingForSalon(res.locals.adminContext.salon.id, bookingId, req.body);
      res.json({ booking });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/bookings/:bookingId', async (req, res, next) => {
    try {
      const bookingId = readRouteParam(req.params.bookingId, 'bookingId');
      await deleteBookingForSalon(res.locals.adminContext.salon.id, bookingId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ── Staff members ──────────────────────────────────────────────────────────

  router.get('/staff-members', async (_req, res, next) => {
    try {
      const members = await listStaffMembers(res.locals.adminContext.salon.id);
      res.json({ staffMembers: members });
    } catch (error) {
      next(error);
    }
  });

  router.post('/staff-members', validateBody(createStaffMemberSchema), async (req, res, next) => {
    try {
      const member = await createStaffMember(res.locals.adminContext.salon.id, req.body);
      res.status(201).json({ staffMember: member });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/staff-members/:staffMemberId', async (req, res, next) => {
    try {
      const staffMemberId = readRouteParam(req.params.staffMemberId, 'staffMemberId');
      await deleteStaffMember(res.locals.adminContext.salon.id, staffMemberId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}