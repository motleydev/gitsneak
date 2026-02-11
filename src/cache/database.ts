import Database from 'better-sqlite3';
import envPaths from 'env-paths';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const paths = envPaths('gitsneak');
const DEFAULT_DB_PATH = `${paths.cache}/cache.db`;

export function createDatabase(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  // Ensure cache directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Create cache table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  // Create index for expiration queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)
  `);

  return db;
}

export function closeDatabase(db: Database.Database): void {
  db.close();
}

export function getDefaultDbPath(): string {
  return DEFAULT_DB_PATH;
}
