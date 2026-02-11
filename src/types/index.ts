export interface GitSneakOptions {
  verbose: boolean;
  quiet: boolean;
  delay: number;      // milliseconds between requests
  cache: boolean;     // true by default, --no-cache sets false
  failFast: boolean;  // false by default, --fail-fast sets true
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
