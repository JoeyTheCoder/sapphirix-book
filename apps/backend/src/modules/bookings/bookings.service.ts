import { and, asc, eq, gt, gte, lt, ne } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { bookings, customers, openingHours, salons, services, timeOffBlocks } from '../../db/schema.js';
import { HttpError } from '../../errors/http-error.js';
import type {
  AdminBookingsCalendarQueryInput,
  AdminBookingsQueryInput,
  CreateAdminBookingInput,
  UpdateAdminBookingInput,
} from './admin-bookings.schemas.js';
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

type BookingListRow = {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  startsAt: Date;
  endsAt: Date;
  priceAmount: number;
  currency: string;
  customerNotes: string | null;
  internalNotes: string | null;
  staffMemberPreference: string | null;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
};

export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  label: string;
  available: boolean;
  unavailableReason: string | null;
};

export type AvailabilityCalendarPreviewDay = {
  date: string;
  dayOfMonth: number;
  inRequestedMonth: boolean;
  available: boolean;
  selectable: boolean;
  availableSlotCount: number;
};

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function rangesOverlap(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart.getTime() < rightEnd.getTime() && leftEnd.getTime() > rightStart.getTime();
}

function readMonthParts(month: string): { year: number; monthNumber: number } {
  const [year, monthNumber] = month.split('-').map(Number);

  return {
    year,
    monthNumber,
  };
}

function getMonthStartDate(month: string): string {
  return `${month}-01`;
}

function getMonthForIsoDate(date: string): string {
  return date.slice(0, 7);
}

function getDaysInMonth(month: string): number {
  const { year, monthNumber } = readMonthParts(month);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function getBookableWindow(timeZone: string): { today: string; latest: string } {
  const today = getIsoDateInTimeZone(new Date(), timeZone);
  const latest = addDaysToIsoDate(today, BOOKING_HORIZON_DAYS - 1);

  return { today, latest };
}

function readDateWindow(date: string, timeZone: string): { startsAt: Date; endsAt: Date } {
  return getDayBoundsInTimeZone(date, timeZone);
}

function validateBookableDate(date: string, timeZone: string): { today: string; latest: string } {
  const { today, latest } = getBookableWindow(timeZone);
  if (date < today || date > latest) {
    throw new HttpError(400, `date must be between ${today} and ${latest}`);
  }
  return { today, latest };
}

function buildCalendarGridDates(month: string): string[] {
  const firstDate = getMonthStartDate(month);
  const daysInMonth = getDaysInMonth(month);
  const offset = getWeekdayForIsoDate(firstDate);
  const gridStartDate = addDaysToIsoDate(firstDate, -offset);

  return Array.from({ length: 42 }, (_, index) => {
    if (index < offset) {
      return addDaysToIsoDate(gridStartDate, index);
    }

    if (index < offset + daysInMonth) {
      return addDaysToIsoDate(firstDate, index - offset);
    }

    return addDaysToIsoDate(firstDate, index - offset);
  });
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

async function getSalonByIdOrThrow(salonId: string): Promise<SalonBookingConfig> {
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
    .where(eq(salons.id, salonId))
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

function mapBookingRow(row: BookingListRow) {
  return {
    id: row.id,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    priceAmount: row.priceAmount,
    currency: row.currency,
    customerNotes: row.customerNotes,
    internalNotes: row.internalNotes,
    staffMemberPreference: row.staffMemberPreference,
    customer: {
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      email: row.customerEmail,
      phone: row.customerPhone,
    },
    service: {
      id: row.serviceId,
      name: row.serviceName,
      durationMinutes: row.serviceDurationMinutes,
    },
  };
}

async function insertCustomerAndBooking(
  salon: SalonBookingConfig,
  service: ServiceRecord,
  input: CreateBookingInput,
  status: 'pending' | 'confirmed',
  origin: 'public' | 'admin',
) {
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
      status,
      origin,
      startsAt,
      endsAt,
      priceAmount: service.priceAmount,
      currency: service.currency,
      customerNotes: input.customerNotes,
      internalNotes: null,
      staffMemberPreference: input.staffMemberPreference ?? null,
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

async function listBookingRows(whereClause: ReturnType<typeof and>) {
  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      priceAmount: bookings.priceAmount,
      currency: bookings.currency,
      customerNotes: bookings.customerNotes,
      internalNotes: bookings.internalNotes,
      staffMemberPreference: bookings.staffMemberPreference,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      serviceId: services.id,
      serviceName: services.name,
      serviceDurationMinutes: services.durationMinutes,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(whereClause)
    .orderBy(asc(bookings.startsAt));
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

export async function getAvailabilityCalendarPreview(query: { salonSlug: string; serviceId: string; month: string }) {
  const salon = await getSalonBySlugOrThrow(query.salonSlug);
  const service = await getServiceForSalonOrThrow(query.serviceId, salon.id);
  const { today, latest } = getBookableWindow(salon.timezone);
  const requestedMonthStart = getMonthStartDate(query.month);
  const gridDates = buildCalendarGridDates(query.month);

  if (requestedMonthStart > latest || addDaysToIsoDate(requestedMonthStart, 41) < today) {
    throw new HttpError(400, `month must overlap the booking window between ${today} and ${latest}`);
  }

  const uniqueBookableDates = [...new Set(gridDates.filter((date) => date >= today && date <= latest))];
  const slotCounts = new Map<string, number>();

  await Promise.all(
    uniqueBookableDates.map(async (date) => {
      const slots = await buildAvailability(salon, service, date);
      slotCounts.set(
        date,
        slots.reduce((count, slot) => count + (slot.available ? 1 : 0), 0),
      );
    }),
  );

  const days: AvailabilityCalendarPreviewDay[] = gridDates.map((date) => {
    const availableSlotCount = slotCounts.get(date) ?? 0;
    const inBookingWindow = date >= today && date <= latest;

    return {
      date,
      dayOfMonth: Number(date.slice(8, 10)),
      inRequestedMonth: getMonthForIsoDate(date) === query.month,
      available: availableSlotCount > 0,
      selectable: inBookingWindow && availableSlotCount > 0,
      availableSlotCount,
    };
  });

  const totalAvailableDays = days.reduce((count, day) => count + (day.inRequestedMonth && day.available ? 1 : 0), 0);

  return {
    salon: {
      slug: salon.slug,
      name: salon.name,
      timezone: salon.timezone,
    },
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
    },
    month: query.month,
    today,
    latest,
    bookingHorizonDays: BOOKING_HORIZON_DAYS,
    slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
    minimumLeadTimeMinutes: MINIMUM_LEAD_TIME_MINUTES,
    totalAvailableDays,
    days,
  };
}

export async function createBooking(input: CreateBookingInput) {
  const salon = await getSalonBySlugOrThrow(input.salonSlug);
  const service = await getServiceForSalonOrThrow(input.serviceId, salon.id);
  return insertCustomerAndBooking(salon, service, input, 'pending', 'public');
}

export async function createAdminBookingForSalon(salonId: string, input: CreateAdminBookingInput) {
  const salon = await getSalonByIdOrThrow(salonId);
  const service = await getServiceForSalonOrThrow(input.serviceId, salon.id);

  const startsAt = new Date(input.startsAt);

  if (Number.isNaN(startsAt.getTime())) {
    throw new HttpError(400, 'startsAt must be a valid ISO datetime');
  }

  const endsAt = addMinutes(startsAt, service.durationMinutes);
  const occupiedUntil = addMinutes(endsAt, salon.bookingBufferMinutes);
  const bookingDate = getIsoDateInTimeZone(startsAt, salon.timezone);
  const { startsAt: dayStart, endsAt: dayEnd } = readDateWindow(bookingDate, salon.timezone);

  const existingBookings = await listExistingBookingsInRange(salon.id, dayStart, dayEnd);

  if (isSlotBlockedByBookings(startsAt, occupiedUntil, existingBookings, salon.bookingBufferMinutes)) {
    throw new HttpError(409, 'The selected time slot conflicts with an existing booking');
  }

  const [customer] = await db
    .insert(customers)
    .values({
      salonId: salon.id,
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      email: input.customer.email ?? null,
      phone: input.customer.phone ?? null,
      notes: null,
    })
    .returning({ id: customers.id });

  const [booking] = await db
    .insert(bookings)
    .values({
      salonId: salon.id,
      customerId: customer.id,
      serviceId: service.id,
      status: 'confirmed',
      origin: 'admin',
      startsAt,
      endsAt,
      priceAmount: service.priceAmount,
      currency: service.currency,
      customerNotes: input.customerNotes,
      internalNotes: null,
    })
    .returning({ id: bookings.id });

  return getBookingDetailForSalon(salonId, booking.id);
}

export async function listBookingsForSalon(salonId: string, query: AdminBookingsQueryInput) {
  const salon = await getSalonByIdOrThrow(salonId);
  const dayBounds = readDateWindow(query.date, salon.timezone);
  const filters = [
    eq(bookings.salonId, salonId),
    gte(bookings.startsAt, dayBounds.startsAt),
    lt(bookings.startsAt, dayBounds.endsAt),
  ];

  if (query.status) {
    filters.push(eq(bookings.status, query.status));
  }

  const rows = await listBookingRows(and(...filters)!);
  return rows.map(mapBookingRow);
}

export async function listCalendarBookingsForSalon(salonId: string, query: AdminBookingsCalendarQueryInput) {
  const salon = await getSalonByIdOrThrow(salonId);
  const startBounds = readDateWindow(query.startDate, salon.timezone);
  const endExclusive = readDateWindow(addDaysToIsoDate(query.endDate, 1), salon.timezone).startsAt;
  const rows = await listBookingRows(
    and(
      eq(bookings.salonId, salonId),
      gte(bookings.startsAt, startBounds.startsAt),
      lt(bookings.startsAt, endExclusive),
    )!,
  );

  return {
    startDate: query.startDate,
    endDate: query.endDate,
    bookings: rows.map(mapBookingRow),
  };
}

export async function getBookingDetailForSalon(salonId: string, bookingId: string) {
  const rows = await listBookingRows(and(eq(bookings.salonId, salonId), eq(bookings.id, bookingId))!);
  const booking = rows[0];

  if (!booking) {
    throw new HttpError(404, 'Booking not found');
  }

  return mapBookingRow(booking);
}

export async function updateBookingForSalon(salonId: string, bookingId: string, input: UpdateAdminBookingInput) {
  const [booking] = await db
    .update(bookings)
    .set({
      status: input.status,
      cancelledAt: input.status === 'cancelled' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, bookingId), eq(bookings.salonId, salonId)))
    .returning({ id: bookings.id });

  if (!booking) {
    throw new HttpError(404, 'Booking not found');
  }

  return getBookingDetailForSalon(salonId, bookingId);
}

export async function deleteBookingForSalon(salonId: string, bookingId: string) {
  const [booking] = await db
    .delete(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.salonId, salonId)))
    .returning({ id: bookings.id });

  if (!booking) {
    throw new HttpError(404, 'Booking not found');
  }
}

export async function listUpcomingBookingsForSalon(salonId: string) {
  const rows = await listBookingRows(and(eq(bookings.salonId, salonId), ne(bookings.status, 'cancelled'), gt(bookings.endsAt, new Date()))!);
  return rows.slice(0, 10).map(mapBookingRow);
}
