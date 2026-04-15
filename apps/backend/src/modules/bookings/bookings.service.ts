import { and, eq, gt, lt, ne } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { bookings, customers, salons, services } from '../../db/schema.js';
import { HttpError } from '../../errors/http-error.js';
import type { CreateBookingInput } from './bookings.schemas.js';

type BookingConflictCheck = {
  salonId: string;
  startsAt: Date;
  endsAt: Date;
};

async function getSalonBySlugOrThrow(slug: string) {
  const [salon] = await db
    .select({
      id: salons.id,
      slug: salons.slug,
      name: salons.name,
      timezone: salons.timezone,
      active: salons.active,
    })
    .from(salons)
    .where(eq(salons.slug, slug))
    .limit(1);

  if (!salon || !salon.active) {
    throw new HttpError(404, 'Salon not found');
  }

  return salon;
}

async function getServiceForSalonOrThrow(serviceId: string, salonId: string) {
  const [service] = await db
    .select({
      id: services.id,
      salonId: services.salonId,
      name: services.name,
      durationMinutes: services.durationMinutes,
      priceAmount: services.priceAmount,
      currency: services.currency,
      active: services.active,
    })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)))
    .limit(1);

  if (!service || !service.active) {
    throw new HttpError(404, 'Service not found');
  }

  return service;
}

async function ensureNoBookingConflict({ salonId, startsAt, endsAt }: BookingConflictCheck): Promise<void> {
  const [existingBooking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.salonId, salonId),
        ne(bookings.status, 'cancelled'),
        lt(bookings.startsAt, endsAt),
        gt(bookings.endsAt, startsAt),
      ),
    )
    .limit(1);

  if (existingBooking) {
    throw new HttpError(409, 'The selected time slot is no longer available');
  }
}

export async function createBooking(input: CreateBookingInput) {
  const salon = await getSalonBySlugOrThrow(input.salonSlug);
  const service = await getServiceForSalonOrThrow(input.serviceId, salon.id);
  const startsAt = new Date(input.startsAt);

  if (Number.isNaN(startsAt.getTime())) {
    throw new HttpError(400, 'startsAt must be a valid ISO datetime');
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  await ensureNoBookingConflict({
    salonId: salon.id,
    startsAt,
    endsAt,
  });

  const [customer] = await db
    .insert(customers)
    .values({
      salonId: salon.id,
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      email: input.customer.email,
      phone: input.customer.phone,
      notes: null,
    })
    .returning({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName });

  const [booking] = await db
    .insert(bookings)
    .values({
      salonId: salon.id,
      customerId: customer.id,
      serviceId: service.id,
      status: 'confirmed',
      startsAt,
      endsAt,
      priceAmount: service.priceAmount,
      currency: service.currency,
      customerNotes: input.customerNotes,
      internalNotes: null,
    })
    .returning({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      customerNotes: bookings.customerNotes,
    });

  return {
    ...booking,
    salon: {
      slug: salon.slug,
      name: salon.name,
    },
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
    },
    customer,
  };
}