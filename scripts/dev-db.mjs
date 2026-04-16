import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const envPath = path.join(repoRoot, '.env');
const defaultContainerName = 'sapphirix-postgres';
const backupsDir = path.join(repoRoot, '.backups');

function parseEnvFile(fileContent) {
  const values = {};

  for (const rawLine of fileContent.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadDatabaseConfig() {
  if (!fs.existsSync(envPath)) {
    throw new Error('Root .env file not found.');
  }

  const parsedEnv = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  const databaseUrl = parsedEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing from the root .env file.');
  }

  const url = new URL(databaseUrl);

  return {
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//u, ''),
    containerName: parsedEnv.POSTGRES_CONTAINER_NAME || defaultContainerName,
  };
}

function runDockerCommand(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Docker command failed.');
  }

  return result;
}

function createTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function dumpDatabase(outputFileArg) {
  const config = loadDatabaseConfig();
  fs.mkdirSync(backupsDir, { recursive: true });

  const outputFile = outputFileArg
    ? path.resolve(process.cwd(), outputFileArg)
    : path.join(backupsDir, `${config.database}-${createTimestamp()}.sql`);

  const result = runDockerCommand([
    'exec',
    '-e',
    `PGPASSWORD=${config.password}`,
    config.containerName,
    'pg_dump',
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '-U',
    config.user,
    '-d',
    config.database,
  ]);

  fs.writeFileSync(outputFile, result.stdout, 'utf8');
  console.log(`Database dump written to ${outputFile}`);
}

function restoreDatabase(inputFileArg) {
  if (!inputFileArg) {
    throw new Error('Provide the SQL dump file path: pnpm db:restore -- .\\.backups\\your-file.sql');
  }

  const inputFile = path.resolve(process.cwd(), inputFileArg);

  if (!fs.existsSync(inputFile)) {
    throw new Error(`Dump file not found: ${inputFile}`);
  }

  const config = loadDatabaseConfig();
  const sql = fs.readFileSync(inputFile, 'utf8');

  runDockerCommand(
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${config.password}`,
      config.containerName,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      config.user,
      '-d',
      config.database,
    ],
    { input: sql },
  );

  console.log(`Database restored from ${inputFile}`);
}

const [, , command, fileArg] = process.argv;

if (command === 'dump') {
  dumpDatabase(fileArg);
} else if (command === 'restore') {
  restoreDatabase(fileArg);
} else {
  console.log('Usage: node scripts/dev-db.mjs dump [output.sql]');
  console.log('   or: node scripts/dev-db.mjs restore <input.sql>');
  process.exitCode = 1;
}