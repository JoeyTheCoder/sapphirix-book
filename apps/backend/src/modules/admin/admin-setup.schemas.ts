import { z } from 'zod';

const timeValuePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const optionalTrimmedText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.email().optional(),
);

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

const openingHourSlotSchema = z
  .object({
    startTime: z.string().regex(timeValuePattern, 'Expected HH:MM'),
    endTime: z.string().regex(timeValuePattern, 'Expected HH:MM'),
  })
  .refine((slot) => timeToMinutes(slot.endTime) > timeToMinutes(slot.startTime), {
    message: 'endTime must be later than startTime',
    path: ['endTime'],
  });

const openingHoursDaySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  slots: z.array(openingHourSlotSchema).max(3),
});

export const updateSalonProfileSchema = z.object({
  name: z.string().trim().min(1),
  email: optionalEmail,
  phone: optionalTrimmedText,
  description: optionalTrimmedText,
  timezone: z.string().trim().min(1),
  addressLine1: optionalTrimmedText,
  addressLine2: optionalTrimmedText,
  postalCode: optionalTrimmedText,
  city: optionalTrimmedText,
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
});

export const createServiceSchema = z.object({
  name: z.string().trim().min(1),
  description: optionalTrimmedText,
  durationMinutes: z.number().int().min(5).max(720),
  priceAmount: z.number().int().min(0).max(100000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('CHF'),
  sortOrder: z.number().int().min(0).default(0),
});

export const replaceOpeningHoursSchema = z
  .object({
    days: z.array(openingHoursDaySchema).length(7),
  })
  .superRefine((value, ctx) => {
    const seenWeekdays = new Set<number>();

    for (const [dayIndex, day] of value.days.entries()) {
      if (seenWeekdays.has(day.weekday)) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', dayIndex, 'weekday'],
          message: 'Weekdays must be unique',
        });
      }

      seenWeekdays.add(day.weekday);

      const sortedSlots = [...day.slots].sort((left, right) => left.startTime.localeCompare(right.startTime));

      for (let slotIndex = 1; slotIndex < sortedSlots.length; slotIndex += 1) {
        const previousSlot = sortedSlots[slotIndex - 1]!;
        const currentSlot = sortedSlots[slotIndex]!;

        if (timeToMinutes(currentSlot.startTime) < timeToMinutes(previousSlot.endTime)) {
          ctx.addIssue({
            code: 'custom',
            path: ['days', dayIndex, 'slots', slotIndex, 'startTime'],
            message: 'Opening-hour slots cannot overlap',
          });
        }
      }
    }
  });

export const createTimeOffBlockSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    reason: optionalTrimmedText,
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: 'endsAt must be later than startsAt',
    path: ['endsAt'],
  });

export type UpdateSalonProfileInput = z.infer<typeof updateSalonProfileSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type ReplaceOpeningHoursInput = z.infer<typeof replaceOpeningHoursSchema>;
export type CreateTimeOffBlockInput = z.infer<typeof createTimeOffBlockSchema>;