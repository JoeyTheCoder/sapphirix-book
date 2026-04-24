import { z } from 'zod';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoMonthPattern = /^\d{4}-\d{2}$/;

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const requiredText = z.string().trim().min(1);

const requiredEmail = z.email();

export const availabilityQuerySchema = z.object({
  serviceId: z.uuid(),
  date: z.string().regex(isoDatePattern, 'Expected YYYY-MM-DD'),
});

export const availabilityCalendarPreviewQuerySchema = z.object({
  serviceId: z.uuid(),
  month: z.string().regex(isoMonthPattern, 'Expected YYYY-MM'),
});

export const createBookingSchema = z.object({
  salonSlug: z.string().trim().min(1),
  serviceId: z.uuid(),
  startsAt: z.string().datetime({ offset: true }),
  botProtectionToken: optionalText,
  customer: z.object({
    firstName: requiredText,
    lastName: requiredText,
    email: requiredEmail,
    phone: requiredText,
  }),
  customerNotes: optionalText,
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type AvailabilityCalendarPreviewQueryInput = z.infer<typeof availabilityCalendarPreviewQuerySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;