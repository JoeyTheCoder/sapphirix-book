import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../db/client.js';

type MigrationFile = {
  tag: string;
  filePath: string;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, '../../drizzle');
const migrationTableName = 'schema_migrations';

async function ensureMigrationTable() {
  await pool.query(`
    create table if not exists ${migrationTableName} (
      tag text primary key,
      applied_at timestamp with time zone not null default now()
    )
  `);
}

async function listMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => ({
      tag: entry.name.replace(/\.sql$/u, ''),
      filePath: path.join(migrationsDir, entry.name),
    }))
    .sort((left, right) => left.tag.localeCompare(right.tag));
}

async function getAppliedMigrationTags(): Promise<Set<string>> {
  const result = await pool.query<{ tag: string }>(`select tag from ${migrationTableName} order by tag asc`);
  return new Set(result.rows.map((row) => row.tag));
}

function splitStatements(fileContent: string): string[] {
  return fileContent
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function applyMigrationFile(migration: MigrationFile) {
  const fileContent = await fs.readFile(migration.filePath, 'utf8');
  const statements = splitStatements(fileContent);

  for (const statement of statements) {
    await pool.query(statement);
  }

  await pool.query(`insert into ${migrationTableName} (tag) values ($1)`, [migration.tag]);
  console.log(`Applied ${migration.tag}`);
}

async function main() {
  await ensureMigrationTable();

  const migrations = await listMigrationFiles();
  const appliedMigrationTags = await getAppliedMigrationTags();

  for (const migration of migrations) {
    if (appliedMigrationTags.has(migration.tag)) {
      continue;
    }

    await applyMigrationFile(migration);
  }

  console.log('Database migrations are up to date.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });