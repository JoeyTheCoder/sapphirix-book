import { Router } from 'express';

import { HttpError } from '../errors/http-error.js';
import { validateBody } from '../middleware/validate-body.js';
import { availabilityQuerySchema, createBookingSchema } from '../modules/bookings/bookings.schemas.js';
import { createBooking, getAvailability } from '../modules/bookings/bookings.service.js';
import { getSalonBySlug, listServicesBySalonSlug } from '../modules/salons/salons.service.js';

export function createPublicRouter(): Router {
  const router = Router();

  router.get('/salons/:slug', async (req, res, next) => {
    try {
      const salon = await getSalonBySlug(req.params.slug);

      if (!salon) {
        throw new HttpError(404, 'Salon not found');
      }

      res.json({ salon });
    } catch (error) {
      next(error);
    }
  });

  router.get('/salons/:slug/services', async (req, res, next) => {
    try {
      const result = await listServicesBySalonSlug(req.params.slug);

      if (!result) {
        throw new HttpError(404, 'Salon not found');
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/salons/:slug/availability', async (req, res, next) => {
    try {
      const queryResult = availabilityQuerySchema.safeParse(req.query);

      if (!queryResult.success) {
        throw new HttpError(400, 'Invalid availability query', queryResult.error.flatten());
      }

      const availability = await getAvailability({
        salonSlug: req.params.slug,
        ...queryResult.data,
      });

      res.json({ availability });
    } catch (error) {
      next(error);
    }
  });

  router.post('/bookings', validateBody(createBookingSchema), async (req, res, next) => {
    try {
      const booking = await createBooking(req.body);
      res.status(201).json({ booking });
    } catch (error) {
      next(error);
    }
  });

  return router;
}