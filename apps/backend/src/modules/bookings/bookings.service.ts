import { and, asc, eq, gt, lt, ne } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { bookings, customers, openingHours, salons, services, timeOffBlocks } from '../../db/schema.js';
import { HttpError } from '../../errors/http-error.js';
import type { AvailabilityQueryInput, CreateBookingInput } from './bookings.schemas.js';
import {
  addDaysToIsoDate,
  formatTimeInTimeZone,
  getDayBoundsInTimeZone,
  getIsoDateInTimeZone,
  getWeekdayForIsoDate,
  zonedDateTimeToUtc,
} from './booking-time.js';

const SLOT_INTERVAL_MINUTES = 30;
const MINIMUM_LEAD_TIME_MINUTES = 30;
const BOOKING_HORIZON_DAYS = 28;

type BookingRange = {
  startsAt: Date;
  endsAt: Date;
};
type SalonBookingConfig = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  active: boolean;
  bookingBufferMinutes: number;
};

type ServiceRecord = {
  id: string;
  salonId: string;
  name: string;
  durationMinutes: number;
  priceAmount: number;
  currency: string;
  active: boolean;
};

export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  label: string;
  available: boolean;
  unavailableReason: string | null;
};
function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}
function rangesOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart.getTime() < rightEnd.getTime() && leftEnd.getTime() > rightStart.getTime();
}
function readDateWindow(date: string, timeZone: string): { startsAt: Date; endsAt: Date } {
  return getDayBoundsInTimeZone(date, timeZone);
}
function validateBookableDate(date: string, timeZone: string): { today: string; latest: string } {
  const today = getIsoDateInTimeZone(new Date(), timeZone);
  const latest = addDaysToIsoDate(today, BOOKING_HORIZON_DAYS - 1);
  if (date < today || date > latest) {
    throw new HttpError(400, `date must be between ${today} and ${latest}`);
  }
  return { today, latest };
}

async function getSalonBySlugOrThrow(slug: string): Promise<SalonBookingConfig> {
  const [salon] = await db
    .select({
      id: salons.id,
  slug: salons.slug,
  name: salons.name,
  timezone: salons.timezone,
      active: salons.active,
      bookingBufferMinutes: salons.bookingBufferMinutes,
    })
  .from(salons)
  .where(eq(salons.slug, slug))
  .limit(1);
  if (!salon || !salon.active) {
    throw new HttpError(404, 'Salon not found');
  }
  return salon;
}

async function getServiceForSalonOrThrow(serviceId: string, salonId: string): Promise<ServiceRecord> {
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

async function getOpeningHoursForDate(salonId: string, date: string) {
  return db
    .select({
      startTime: openingHours.startTime,
      endTime: openingHours.endTime,
    })
    .from(openingHours)
  .where(and(eq(openingHours.salonId, salonId), eq(openingHours.weekday, getWeekdayForIsoDate(date))))
  .orderBy(asc(openingHours.startTime));
}

async function listExistingBookingsInRange(salonId: string, startsAt: Date, endsAt: Date): Promise<BookingRange[]> {
  return db
    .select({
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.salonId, salonId),
  ne(bookings.status, 'cancelled'),
  lt(bookings.startsAt, endsAt),
  gt(bookings.endsAt, startsAt),
      ),
    );
}

async function listTimeOffBlocksInRange(salonId: string, startsAt: Date, endsAt: Date): Promise<BookingRange[]> {
  return db
    .select({
      startsAt: timeOffBlocks.startsAt,
      endsAt: timeOffBlocks.endsAt,
  })
  .from(timeOffBlocks)
  .where(
      and(
        eq(timeOffBlocks.salonId, salonId),
        lt(timeOffBlocks.startsAt, endsAt),
        gt(timeOffBlocks.endsAt, startsAt),
      ),
    );
}

function isSlotBlockedByBookings(
  slotStartsAt: Date,
  slotOccupiedUntil: Date,
  existingBookings: BookingRange[],
  bookingBufferMinutes: number,
): boolean {
  return existingBookings.some((booking) => {
    const bookingOccupiedUntil = addMinutes(booking.endsAt, bookingBufferMinutes);
    return rangesOverlap(slotStartsAt, slotOccupiedUntil, booking.startsAt, bookingOccupiedUntil);
  });
}

function isSlotBlockedByTimeOff(slotStartsAt: Date, slotOccupiedUntil: Date, blocks: BookingRange[]): boolean {
  return blocks.some((block) => rangesOverlap(slotStartsAt, slotOccupiedUntil, block.startsAt, block.endsAt));
}

async function buildAvailability(
  salon: SalonBookingConfig,
  service: ServiceRecord,
  date: string,
): Promise<AvailabilitySlot[]> {
  validateBookableDate(date, salon.timezone);

  const openingRanges = await getOpeningHoursForDate(salon.id, date);

  if (openingRanges.length === 0) {
    return [];
  }

  const { startsAt: dayStartsAt, endsAt: dayEndsAt } = readDateWindow(date, salon.timezone);
  const [existingBookings, blockedRanges] = await Promise.all([
    listExistingBookingsInRange(salon.id, dayStartsAt, dayEndsAt),
    listTimeOffBlocksInRange(salon.id, dayStartsAt, dayEndsAt),
  ]);
  const leadTimeThreshold = addMinutes(new Date(), MINIMUM_LEAD_TIME_MINUTES);
  const slotDurationMinutes = service.durationMinutes;
  const slots: AvailabilitySlot[] = [];

  for (const openingRange of openingRanges) {
    if (!openingRange.startTime || !openingRange.endTime) {
      continue;
    }

    const rangeStartsAt = zonedDateTimeToUtc(date, openingRange.startTime, salon.timezone);
    const rangeEndsAt = zonedDateTimeToUtc(date, openingRange.endTime, salon.timezone);

    for (
      let slotStartsAt = new Date(rangeStartsAt);
      slotStartsAt.getTime() < rangeEndsAt.getTime();
      slotStartsAt = addMinutes(slotStartsAt, SLOT_INTERVAL_MINUTES)
    ) {
      const slotEndsAt = addMinutes(slotStartsAt, slotDurationMinutes);
      const slotOccupiedUntil = addMinutes(slotEndsAt, salon.bookingBufferMinutes);

      let available = true;
      let unavailableReason: string | null = null;

      if (slotStartsAt.getTime() < leadTimeThreshold.getTime()) {
        available = false;
        unavailableReason = 'lead_time';
      } else if (slotOccupiedUntil.getTime() > rangeEndsAt.getTime()) {
        available = false;
        unavailableReason = 'outside_opening_hours';
      } else if (isSlotBlockedByTimeOff(slotStartsAt, slotOccupiedUntil, blockedRanges)) {
        available = false;
        unavailableReason = 'time_off';
      } else if (isSlotBlockedByBookings(slotStartsAt, slotOccupiedUntil, existingBookings, salon.bookingBufferMinutes)) {
        available = false;
        unavailableReason = 'booking_conflict';
      }

      slots.push({
        startsAt: slotStartsAt.toISOString(),
        endsAt: slotEndsAt.toISOString(),
        label: formatTimeInTimeZone(slotStartsAt, salon.timezone),
        available,
        unavailableReason,
      });
    }
  }

  return slots.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export async function getAvailability(query: AvailabilityQueryInput & { salonSlug: string }) {
  const salon = await getSalonBySlugOrThrow(query.salonSlug);
  const service = await getServiceForSalonOrThrow(query.serviceId, salon.id);
  const slots = await buildAvailability(salon, service, query.date);

  return {
    salon: {
      slug: salon.slug,
      name: salon.name,
      timezone: salon.timezone,
      bookingBufferMinutes: salon.bookingBufferMinutes,
    },
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceAmount: service.priceAmount,
      currency: service.currency,
    },
    date: query.date,
    slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
    minimumLeadTimeMinutes: MINIMUM_LEAD_TIME_MINUTES,
    bookingHorizonDays: BOOKING_HORIZON_DAYS,
    slots,
  };
}

export async function createBooking(input: CreateBookingInput) {
  const salon = await getSalonBySlugOrThrow(input.salonSlug);
  const service = await getServiceForSalonOrThrow(input.serviceId, salon.id);
  const startsAt = new Date(input.startsAt);

  if (Number.isNaN(startsAt.getTime())) {
    throw new HttpError(400, 'startsAt must be a valid ISO datetime');
  }

  const bookingDate = getIsoDateInTimeZone(startsAt, salon.timezone);
  const availability = await buildAvailability(salon, service, bookingDate);
  const matchedSlot = availability.find((slot) => slot.startsAt === startsAt.toISOString());

  if (!matchedSlot) {
    throw new HttpError(400, 'The selected slot is invalid');
  }

  if (!matchedSlot.available) {
    throw new HttpError(409, 'The selected time slot is no longer available');
  }

  const endsAt = new Date(matchedSlot.endsAt);

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
    .returning({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      email: customers.email,
      phone: customers.phone,
    });

  const [booking] = await db
    .insert(bookings)
    .values({
      salonId: salon.id,
      customerId: customer.id,
      serviceId: service.id,
      status: 'pending',
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
      timezone: salon.timezone,
    },
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceAmount: service.priceAmount,
      currency: service.currency,
    },
    customer,
  };
}

export async function listUpcomingBookingsForSalon(salonId: string) {
  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      priceAmount: bookings.priceAmount,
      currency: bookings.currency,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(and(eq(bookings.salonId, salonId), ne(bookings.status, 'cancelled'), gt(bookings.endsAt, new Date())))
    .orderBy(asc(bookings.startsAt))
    .limit(10)
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        status: row.status,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        priceAmount: row.priceAmount,
        currency: row.currency,
        customer: {
          firstName: row.customerFirstName,
          lastName: row.customerLastName,
          email: row.customerEmail,
          phone: row.customerPhone,
        },
        service: {
          name: row.serviceName,
        },
      })),
    );
}
