import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const salons = pgTable('salons', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});