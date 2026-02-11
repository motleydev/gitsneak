import type Database from 'better-sqlite3';
import type { CacheStats } from '../types/index.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class CacheRepository {
  private db: Database.Database;
  private getStmt: Database.Statement;
  private setStmt: Database.Statement;
  private deleteExpiredStmt: Database.Statement;
  private ttlMs: number;

  // Track stats for this session
  private stats: CacheStats = { hits: 0, misses: 0 };

  constructor(db: Database.Database, ttlMs: number = SEVEN_DAYS_MS) {
    this.db = db;
    this.ttlMs = ttlMs;

    // Prepare statements for performance
    this.getStmt = db.prepare('SELECT value FROM cache WHERE key = ? AND expires_at > ?');
    this.setStmt = db.prepare('INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)');
    this.deleteExpiredStmt = db.prepare('DELETE FROM cache WHERE expires_at <= ?');

    // Clean up expired entries on initialization
    this.cleanExpired();
  }

  get(key: string): string | null {
    const now = Date.now();
    const row = this.getStmt.get(key, now) as { value: string } | undefined;

    if (row) {
      this.stats.hits++;
      return row.value;
    }

    this.stats.misses++;
    return null;
  }

  set(key: string, value: string): void {
    const expiresAt = Date.now() + this.ttlMs;
    this.setStmt.run(key, value, expiresAt);
  }

  cleanExpired(): number {
    const now = Date.now();
    const result = this.deleteExpiredStmt.run(now);
    return result.changes;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }
}
