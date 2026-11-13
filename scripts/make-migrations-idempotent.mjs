// Makes drizzle-kit's generated migrations idempotent: `CREATE TABLE IF NOT
// EXISTS` and `CREATE INDEX IF NOT EXISTS`. Run through `pnpm db:generate`.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDirectory = 'src/features/database/migrations';

const migrationFiles = readdirSync(migrationsDirectory, { recursive: true })
  .map((entry) => String(entry))
  .filter((entry) => entry.endsWith('migration.sql'));

for (const file of migrationFiles) {
  const path = join(migrationsDirectory, file);
  const generated = readFileSync(path, 'utf8');
  const idempotent = generated
    .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)/g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ');

  if (idempotent !== generated) {
    writeFileSync(path, idempotent);
  }
}
