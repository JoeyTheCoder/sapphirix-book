import { eq } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { admins, salons } from '../../db/schema.js';

export type AdminContext = {
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  salon: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
};

export async function getAdminContextByFirebaseUid(firebaseUid: string): Promise<AdminContext | null> {
  const [result] = await db
    .select({
      adminId: admins.id,
      adminEmail: admins.email,
      adminFirstName: admins.firstName,
      adminLastName: admins.lastName,
      salonId: salons.id,
      salonName: salons.name,
      salonSlug: salons.slug,
      salonTimezone: salons.timezone,
    })
    .from(admins)
    .innerJoin(salons, eq(admins.salonId, salons.id))
    .where(eq(admins.firebaseUid, firebaseUid))
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    admin: {
      id: result.adminId,
      email: result.adminEmail,
      firstName: result.adminFirstName,
      lastName: result.adminLastName,
    },
    salon: {
      id: result.salonId,
      name: result.salonName,
      slug: result.salonSlug,
      timezone: result.salonTimezone,
    },
  };
}