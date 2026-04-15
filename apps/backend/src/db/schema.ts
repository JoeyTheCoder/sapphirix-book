import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed']);

export const salons = pgTable(
  'salons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    email: text('email'),
    phone: text('phone'),
    description: text('description'),
    logoUrl: text('logo_url'),
    timezone: text('timezone').notNull().default('Europe/Zurich'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    postalCode: text('postal_code'),
    city: text('city'),
    countryCode: text('country_code').notNull().default('CH'),
    bookingBufferMinutes: integer('booking_buffer_minutes').notNull().default(10),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('salons_slug_unique').on(table.slug)],
);

export const admins = pgTable(
  'admins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salons.id, { onDelete: 'cascade' }),
    firebaseUid: text('firebase_uid').notNull(),
    email: text('email').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('admins_firebase_uid_unique').on(table.firebaseUid),
    index('admins_salon_id_idx').on(table.salonId),
  ],
);

export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salons.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(),
    priceAmount: integer('price_amount').notNull(),
    currency: text('currency').notNull().default('CHF'),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('services_salon_id_idx').on(table.salonId)],
);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salons.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('customers_salon_id_idx').on(table.salonId)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salons.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    status: bookingStatusEnum('status').notNull().default('pending'),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }).notNull(),
    priceAmount: integer('price_amount').notNull(),
    currency: text('currency').notNull().default('CHF'),
    customerNotes: text('customer_notes'),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [index('bookings_salon_id_idx').on(table.salonId), index('bookings_starts_at_idx').on(table.startsAt)],
);

export const openingHours = pgTable(
  'opening_hours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salons.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(),
    startTime: time('start_time'),
    endTime: time('end_time'),
    isClosed: boolean('is_closed').notNull().default(false),
  },
  (table) => [index('opening_hours_salon_id_idx').on(table.salonId)],
);

export const timeOffBlocks = pgTable(
  'time_off_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salonId: uuid('salon_id')
      .notNull()
      .references(() => salons.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'date' }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'date' }).notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('time_off_blocks_salon_id_idx').on(table.salonId)],
);