import { config as loadDotEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const currentDir = dirname(fileURLToPath(import.meta.url));
loadDotEnv({ path: resolve(currentDir, '../../../../.env') });

const booleanFlag = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PUBLIC_APP_ORIGIN: z.string().url().default('http://localhost:4200'),
  UPLOADS_DIR: z.string().min(1).optional(),
  BOT_PROTECTION_ENABLED: booleanFlag.default(false),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_AVAILABILITY_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_BOOKING_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    const parsedEnv = envSchema.parse(process.env);

    if (parsedEnv.BOT_PROTECTION_ENABLED && !parsedEnv.TURNSTILE_SECRET_KEY) {
      throw new Error('TURNSTILE_SECRET_KEY is required when BOT_PROTECTION_ENABLED=true');
    }

    cachedEnv = parsedEnv;
  }

  return cachedEnv;
}