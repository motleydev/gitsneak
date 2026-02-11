import pRetry, { AbortError } from 'p-retry';
import { RateLimiter } from './rate-limiter.js';
import type { CacheRepository } from '../cache/repository.js';
import type { FetchResult, GitSneakOptions } from '../types/index.js';

// Realistic browser headers to avoid detection
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

export interface ClientConfig {
  cache: CacheRepository | null;  // null if --no-cache
  delayMs: number;
  maxRetries: number;
  verbose: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export class GitHubClient {
  private rateLimiter: RateLimiter;
  private cache: CacheRepository | null;
  private maxRetries: number;
  private verbose: boolean;
  private onRetry?: (attempt: number, error: Error) => void;

  constructor(config: ClientConfig) {
    this.rateLimiter = new RateLimiter(config.delayMs);
    this.cache = config.cache;
    this.maxRetries = config.maxRetries;
    this.verbose = config.verbose;
    this.onRetry = config.onRetry;
  }

  /**
   * Fetch a URL with caching, rate limiting, and retry logic
   */
  async fetch(url: string, cacheKey?: string): Promise<FetchResult> {
    const key = cacheKey ?? `url:${url}`;

    // Check cache first (if enabled)
    if (this.cache) {
      const cached = this.cache.get(key);
      if (cached !== null) {
        return { html: cached, fromCache: true };
      }
    }

    // Rate limit before making request
    await this.rateLimiter.waitForNext();

    // Fetch with retry logic
    const html = await this.fetchWithRetry(url);

    // Store in cache (if enabled)
    if (this.cache) {
      this.cache.set(key, html);
    }

    return { html, fromCache: false };
  }

  private async fetchWithRetry(url: string): Promise<string> {
    const run = async () => {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
      });

      // Retriable errors - rate limiting or server issues
      if (response.status === 429 || response.status === 503) {
        throw new Error(`Rate limited (${response.status}): ${url}`);
      }

      // Non-retriable errors - client errors
      if (response.status === 404) {
        throw new AbortError(`Not found (404): ${url}`);
      }

      if (response.status === 403) {
        throw new AbortError(`Forbidden (403): ${url} - may be blocked or private`);
      }

      if (!response.ok) {
        throw new AbortError(`HTTP ${response.status}: ${url}`);
      }

      return response.text();
    };

    return pRetry(run, {
      retries: this.maxRetries,
      factor: 2,           // Double delay each retry
      minTimeout: 2000,    // Start at 2 seconds
      maxTimeout: 60000,   // Max 60 seconds
      randomize: true,     // Add jitter
      onFailedAttempt: (context) => {
        if (this.onRetry) {
          this.onRetry(context.attemptNumber, context.error);
        }
      },
    });
  }
}

/**
 * Factory function to create a configured client from CLI options
 */
export function createClient(
  options: GitSneakOptions,
  cache: CacheRepository | null,
  onRetry?: (attempt: number, error: Error) => void
): GitHubClient {
  return new GitHubClient({
    cache: options.cache ? cache : null,
    delayMs: options.delay,
    maxRetries: 5,
    verbose: options.verbose,
    onRetry,
  });
}
