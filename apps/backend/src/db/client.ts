import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getEnv } from '../config/env.js';
import * as schema from './schema.js';

const env = getEnv();

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function checkDatabaseHealth(): Promise<void> {
  await db.execute(sql`select 1`);
}