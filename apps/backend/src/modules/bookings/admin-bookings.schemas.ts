import { z } from 'zod';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const adminBookingsQuerySchema = z.object({
  date: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
});

export const adminBookingsCalendarQuerySchema = z
  .object({
    startDate: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
    endDate: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be the same as or later than startDate',
    path: ['endDate'],
  });

export const createAdminBookingSchema = z.object({
  serviceId: z.uuid(),
  startsAt: z.string().datetime({ offset: true }),
  customer: z.object({
    firstName: requiredText,
    lastName: requiredText,
    email: z.email(),
    phone: requiredText,
  }),
  customerNotes: optionalText,
});

export const updateAdminBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
});

export type AdminBookingsQueryInput = z.infer<typeof adminBookingsQuerySchema>;
export type AdminBookingsCalendarQueryInput = z.infer<typeof adminBookingsCalendarQuerySchema>;
export type CreateAdminBookingInput = z.infer<typeof createAdminBookingSchema>;
export type UpdateAdminBookingInput = z.infer<typeof updateAdminBookingSchema>;