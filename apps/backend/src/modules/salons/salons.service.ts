import { and, asc, eq } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { salons, services } from '../../db/schema.js';

export async function getSalonBySlug(slug: string) {
  const [salon] = await db
    .select({
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
    })
    .from(salons)
    .where(eq(salons.slug, slug))
    .limit(1);

  return salon ?? null;
}

export async function listServicesBySalonSlug(slug: string) {
  const salon = await getSalonBySlug(slug);

  if (!salon) {
    return null;
  }

  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMinutes: services.durationMinutes,
      priceAmount: services.priceAmount,
      currency: services.currency,
    })
    .from(services)
    .where(and(eq(services.salonId, salon.id), eq(services.active, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));

  return {
    salon,
    services: serviceRows,
  };
}