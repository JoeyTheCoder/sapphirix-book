import { and, desc, eq, gte, gt, sql } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { admins, bookings, customers, services } from '../../db/schema.js';
import { HttpError } from '../../errors/http-error.js';

const NOTIFICATION_RETENTION_DAYS = 30;
const NOTIFICATION_LIMIT = 12;

function getRetentionStart(): Date {
  return new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function getAdminNotificationsReadAt(adminId: string): Promise<Date> {
  const [admin] = await db
    .select({ notificationsReadAt: admins.notificationsReadAt })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!admin) {
    throw new HttpError(404, 'Admin not found');
  }

  return admin.notificationsReadAt;
}

export async function listNotificationsForAdmin(adminId: string, salonId: string) {
  const notificationsReadAt = await getAdminNotificationsReadAt(adminId);
  const retentionStart = getRetentionStart();

  const [unreadCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.salonId, salonId),
        eq(bookings.origin, 'public'),
        gt(bookings.createdAt, notificationsReadAt),
        gte(bookings.createdAt, retentionStart),
      ),
    );

  const rows = await db
    .select({
      bookingId: bookings.id,
      createdAt: bookings.createdAt,
      startsAt: bookings.startsAt,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.salonId, salonId),
        eq(bookings.origin, 'public'),
        gte(bookings.createdAt, retentionStart),
      ),
    )
    .orderBy(desc(bookings.createdAt))
    .limit(NOTIFICATION_LIMIT);

  return {
    unreadCount: unreadCountRow?.count ?? 0,
    notifications: rows.map((row) => ({
      id: `booking:${row.bookingId}`,
      type: 'new_booking_request' as const,
      title: 'Neue Buchungsanfrage',
      message: `${row.customerFirstName} ${row.customerLastName} hat ${row.serviceName} angefragt.`,
      createdAt: row.createdAt,
      read: row.createdAt <= notificationsReadAt,
      bookingId: row.bookingId,
      startsAt: row.startsAt,
      customerName: `${row.customerFirstName} ${row.customerLastName}`,
      serviceName: row.serviceName,
    })),
  };
}

export async function markNotificationsAsRead(adminId: string) {
  const [admin] = await db
    .update(admins)
    .set({
      notificationsReadAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(admins.id, adminId))
    .returning({ notificationsReadAt: admins.notificationsReadAt });

  if (!admin) {
    throw new HttpError(404, 'Admin not found');
  }

  return admin;
}