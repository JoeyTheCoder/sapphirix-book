import { z } from 'zod';

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.email().optional(),
);

export const createBookingSchema = z.object({
  salonSlug: z.string().trim().min(1),
  serviceId: z.uuid(),
  startsAt: z.string().datetime({ offset: true }),
  customer: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: optionalEmail,
    phone: optionalText,
  }),
  customerNotes: optionalText,
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;