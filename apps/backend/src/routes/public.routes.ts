import { Router } from 'express';

import { HttpError } from '../errors/http-error.js';
import { validateBody } from '../middleware/validate-body.js';
import { createBookingSchema } from '../modules/bookings/bookings.schemas.js';
import { createBooking } from '../modules/bookings/bookings.service.js';
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