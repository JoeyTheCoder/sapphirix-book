import { and, asc, eq } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { salons, services, openingHours, timeOffBlocks } from '../../db/schema.js';
import { HttpError } from '../../errors/http-error.js';
import type {
  CreateServiceInput,
  CreateTimeOffBlockInput,
  ReplaceOpeningHoursInput,
  UpdateSalonProfileInput,
} from './admin-setup.schemas.js';

const salonProfileSelection = {
  id: salons.id,
  name: salons.name,
  slug: salons.slug,
  email: salons.email,
  phone: salons.phone,
  description: salons.description,
  logoUrl: salons.logoUrl,
  timezone: salons.timezone,
  addressLine1: salons.addressLine1,
  addressLine2: salons.addressLine2,
  postalCode: salons.postalCode,
  city: salons.city,
  countryCode: salons.countryCode,
  bookingBufferMinutes: salons.bookingBufferMinutes,
  updatedAt: salons.updatedAt,
} as const;

async function requireSalonProfile(salonId: string) {
  const [salon] = await db.select(salonProfileSelection).from(salons).where(eq(salons.id, salonId)).limit(1);

  if (!salon) {
    throw new HttpError(404, 'Salon not found');
  }

  return salon;
}

async function requireServiceRecord(salonId: string, serviceId: string) {
  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.salonId, salonId), eq(services.active, true)))
    .limit(1);

  if (!service) {
    throw new HttpError(404, 'Service not found');
  }
}

export async function getSalonProfile(salonId: string) {
  return requireSalonProfile(salonId);
}

export async function updateSalonProfile(salonId: string, input: UpdateSalonProfileInput) {
  const [salon] = await db
    .update(salons)
    .set({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      description: input.description ?? null,
      timezone: input.timezone,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      postalCode: input.postalCode ?? null,
      city: input.city ?? null,
      countryCode: input.countryCode,
      bookingBufferMinutes: input.bookingBufferMinutes,
      updatedAt: new Date(),
    })
    .where(eq(salons.id, salonId))
    .returning(salonProfileSelection);

  if (!salon) {
    throw new HttpError(404, 'Salon not found');
  }

  return salon;
}

export async function setSalonLogo(salonId: string, logoUrl: string) {
  const [salon] = await db
    .update(salons)
    .set({
      logoUrl,
      updatedAt: new Date(),
    })
    .where(eq(salons.id, salonId))
    .returning(salonProfileSelection);

  if (!salon) {
    throw new HttpError(404, 'Salon not found');
  }

  return salon;
}

export async function listServices(salonId: string) {
  return db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMinutes: services.durationMinutes,
      priceAmount: services.priceAmount,
      currency: services.currency,
      sortOrder: services.sortOrder,
      active: services.active,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .where(and(eq(services.salonId, salonId), eq(services.active, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export async function createService(salonId: string, input: CreateServiceInput) {
  const [service] = await db
    .insert(services)
    .values({
      salonId,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      priceAmount: input.priceAmount,
      currency: input.currency,
      sortOrder: input.sortOrder,
    })
    .returning({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMinutes: services.durationMinutes,
      priceAmount: services.priceAmount,
      currency: services.currency,
      sortOrder: services.sortOrder,
      active: services.active,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
    });

  return service;
}

export async function updateService(salonId: string, serviceId: string, input: CreateServiceInput) {
  await requireServiceRecord(salonId, serviceId);

  const [service] = await db
    .update(services)
    .set({
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      priceAmount: input.priceAmount,
      currency: input.currency,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)))
    .returning({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMinutes: services.durationMinutes,
      priceAmount: services.priceAmount,
      currency: services.currency,
      sortOrder: services.sortOrder,
      active: services.active,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
    });

  if (!service) {
    throw new HttpError(404, 'Service not found');
  }

  return service;
}

export async function archiveService(salonId: string, serviceId: string) {
  await requireServiceRecord(salonId, serviceId);

  await db
    .update(services)
    .set({
      active: false,
      updatedAt: new Date(),
    })
    .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)));
}

export async function getOpeningHours(salonId: string) {
  return db
    .select({
      id: openingHours.id,
      weekday: openingHours.weekday,
      startTime: openingHours.startTime,
      endTime: openingHours.endTime,
    })
    .from(openingHours)
    .where(eq(openingHours.salonId, salonId))
    .orderBy(asc(openingHours.weekday), asc(openingHours.startTime));
}

export async function replaceOpeningHours(salonId: string, input: ReplaceOpeningHoursInput) {
  await requireSalonProfile(salonId);

  await db.transaction(async (tx) => {
    await tx.delete(openingHours).where(eq(openingHours.salonId, salonId));

    const rows = input.days.flatMap((day) =>
      day.slots.map((slot) => ({
        salonId,
        weekday: day.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isClosed: false,
      })),
    );

    if (rows.length > 0) {
      await tx.insert(openingHours).values(rows);
    }
  });

  return getOpeningHours(salonId);
}

export async function listTimeOffBlocks(salonId: string) {
  return db
    .select({
      id: timeOffBlocks.id,
      startsAt: timeOffBlocks.startsAt,
      endsAt: timeOffBlocks.endsAt,
      reason: timeOffBlocks.reason,
      createdAt: timeOffBlocks.createdAt,
    })
    .from(timeOffBlocks)
    .where(eq(timeOffBlocks.salonId, salonId))
    .orderBy(asc(timeOffBlocks.startsAt));
}

export async function createTimeOffBlock(salonId: string, input: CreateTimeOffBlockInput) {
  const [timeOffBlock] = await db
    .insert(timeOffBlocks)
    .values({
      salonId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      reason: input.reason ?? null,
    })
    .returning({
      id: timeOffBlocks.id,
      startsAt: timeOffBlocks.startsAt,
      endsAt: timeOffBlocks.endsAt,
      reason: timeOffBlocks.reason,
      createdAt: timeOffBlocks.createdAt,
    });

  return timeOffBlock;
}

export async function deleteTimeOffBlock(salonId: string, blockId: string) {
  const [deletedBlock] = await db
    .delete(timeOffBlocks)
    .where(and(eq(timeOffBlocks.id, blockId), eq(timeOffBlocks.salonId, salonId)))
    .returning({ id: timeOffBlocks.id });

  if (!deletedBlock) {
    throw new HttpError(404, 'Time-off block not found');
  }
}