export interface GitSneakOptions {
  verbose: boolean;
  quiet: boolean;
  delay: number;      // milliseconds between requests
  cache: boolean;     // true by default, --no-cache sets false
  failFast: boolean;  // false by default, --fail-fast sets true
  since?: Date;       // filter to activity after this date
  html?: boolean | string;  // --html flag: true for temp file, string for custom path
}

export interface RepoInfo {
  owner: string;
  repo: string;
  url: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
}

export interface FetchResult {
  html: string;
  fromCache: boolean;
}

export interface CacheEntry {
  key: string;
  value: string;
  expiresAt: number;  // Unix timestamp ms
}

export interface CacheConfig {
  dbPath?: string;     // Override default path
  ttlMs?: number;      // Override default TTL (7 days)
}
