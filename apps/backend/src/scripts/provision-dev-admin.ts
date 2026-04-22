import { parseArgs } from 'node:util';

import { and, eq } from 'drizzle-orm';

import { db, pool } from '../db/client.js';
import { admins, salons } from '../db/schema.js';
import { getFirebaseAdminAuth } from '../firebase/firebase-admin.js';

type RequiredOptionName = 'salon-name' | 'salon-slug' | 'admin-email' | 'admin-password' | 'admin-first-name' | 'admin-last-name';

function readStringOption(
  values: Record<string, string | boolean | undefined>,
  optionName: RequiredOptionName,
): string {
  const value = values[optionName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required option --${optionName}`);
  }

  return value.trim();
}

function readOptionalStringOption(values: Record<string, string | boolean | undefined>, optionName: string): string | undefined {
  const value = values[optionName];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

async function ensureSalon(values: Record<string, string | boolean | undefined>) {
  const salonName = readStringOption(values, 'salon-name');
  const salonSlug = readStringOption(values, 'salon-slug');
  const salonEmail = readOptionalStringOption(values, 'salon-email');
  const salonPhone = readOptionalStringOption(values, 'salon-phone');
  const salonDescription = readOptionalStringOption(values, 'salon-description');
  const timezone = readOptionalStringOption(values, 'timezone') ?? 'Europe/Zurich';
  const addressLine1 = readOptionalStringOption(values, 'address-line-1');
  const addressLine2 = readOptionalStringOption(values, 'address-line-2');
  const postalCode = readOptionalStringOption(values, 'postal-code');
  const city = readOptionalStringOption(values, 'city');
  const countryCode = (readOptionalStringOption(values, 'country-code') ?? 'CH').toUpperCase();

  const [existingSalon] = await db
    .select({
      id: salons.id,
      name: salons.name,
      slug: salons.slug,
    })
    .from(salons)
    .where(eq(salons.slug, salonSlug))
    .limit(1);

  if (existingSalon) {
    return {
      salon: existingSalon,
      created: false,
    };
  }

  const [salon] = await db
    .insert(salons)
    .values({
      name: salonName,
      slug: salonSlug,
      email: salonEmail,
      phone: salonPhone,
      description: salonDescription,
      timezone,
      addressLine1,
      addressLine2,
      postalCode,
      city,
      countryCode,
    })
    .returning({
      id: salons.id,
      name: salons.name,
      slug: salons.slug,
    });

  return {
    salon,
    created: true,
  };
}

async function ensureFirebaseUser(values: Record<string, string | boolean | undefined>) {
  const auth = getFirebaseAdminAuth();
  const email = readStringOption(values, 'admin-email');
  const password = readStringOption(values, 'admin-password');
  const firstName = readStringOption(values, 'admin-first-name');
  const lastName = readStringOption(values, 'admin-last-name');

  try {
    const user = await auth.getUserByEmail(email);

    return {
      user,
      created: false,
    };
  } catch (error) {
    const maybeFirebaseError = error as { code?: string };

    if (maybeFirebaseError.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  const user = await auth.createUser({
    email,
    password,
    displayName: `${firstName} ${lastName}`,
  });

  return {
    user,
    created: true,
  };
}

async function ensureAdminRecord(
  salonId: string,
  values: Record<string, string | boolean | undefined>,
  firebaseUid: string,
) {
  const email = readStringOption(values, 'admin-email');
  const firstName = readStringOption(values, 'admin-first-name');
  const lastName = readStringOption(values, 'admin-last-name');

  const [existingAdminByUid] = await db
    .select({
      id: admins.id,
      salonId: admins.salonId,
      email: admins.email,
      firebaseUid: admins.firebaseUid,
    })
    .from(admins)
    .where(eq(admins.firebaseUid, firebaseUid))
    .limit(1);

  if (existingAdminByUid) {
    if (existingAdminByUid.salonId !== salonId) {
      throw new Error('The Firebase user already belongs to a different salon in the admins table.');
    }

    return {
      admin: existingAdminByUid,
      created: false,
    };
  }

  const [existingAdminByEmail] = await db
    .select({
      id: admins.id,
      firebaseUid: admins.firebaseUid,
    })
    .from(admins)
    .where(and(eq(admins.email, email), eq(admins.salonId, salonId)))
    .limit(1);

  if (existingAdminByEmail) {
    throw new Error('An admin record with this email already exists for the salon but is linked to a different Firebase UID.');
  }

  const [admin] = await db
    .insert(admins)
    .values({
      salonId,
      firebaseUid,
      email,
      firstName,
      lastName,
    })
    .returning({
      id: admins.id,
      salonId: admins.salonId,
      email: admins.email,
      firebaseUid: admins.firebaseUid,
    });

  return {
    admin,
    created: true,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      'salon-name': { type: 'string' },
      'salon-slug': { type: 'string' },
      'salon-email': { type: 'string' },
      'salon-phone': { type: 'string' },
      'salon-description': { type: 'string' },
      timezone: { type: 'string' },
      'address-line-1': { type: 'string' },
      'address-line-2': { type: 'string' },
      'postal-code': { type: 'string' },
      city: { type: 'string' },
      'country-code': { type: 'string' },
      'admin-email': { type: 'string' },
      'admin-password': { type: 'string' },
      'admin-first-name': { type: 'string' },
      'admin-last-name': { type: 'string' },
    },
    allowPositionals: false,
  });

  const { salon, created: salonCreated } = await ensureSalon(values);
  const { user, created: firebaseCreated } = await ensureFirebaseUser(values);
  const { admin, created: adminCreated } = await ensureAdminRecord(salon.id, values, user.uid);

  console.log(`Salon: ${salonCreated ? 'created' : 'reused'} (${salon.slug})`);
  console.log(`Firebase user: ${firebaseCreated ? 'created' : 'reused'} (${user.email})`);
  console.log(`Admin record: ${adminCreated ? 'created' : 'reused'} (${admin.email})`);
  console.log(`Admin login URL: http://localhost:4200/admin/login`);
  console.log(`Public booking URL: http://localhost:4200/s/${salon.slug}/book`);
  console.log(`Firebase UID: ${user.uid}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });