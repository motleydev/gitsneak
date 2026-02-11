# Phase 1: Foundation - Research

**Researched:** 2026-02-11
**Domain:** Node.js CLI, HTML Scraping, Rate Limiting, SQLite Caching
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational infrastructure for GitSneak: a CLI skeleton that accepts GitHub URLs, an HTTP client that scrapes GitHub HTML pages politely, SQLite caching to avoid redundant requests, and exponential backoff to handle rate limiting gracefully. This is a scraping tool (no GitHub API), so the stack prioritizes lightweight HTTP requests with Cheerio for HTML parsing rather than browser automation.

The standard Node.js CLI stack in 2026 centers on Commander.js for argument parsing, picocolors for terminal styling, and cli-progress for progress bars. For scraping, native fetch (powered by undici) handles HTTP requests while Cheerio parses the returned HTML. better-sqlite3 provides synchronous SQLite access for caching, and p-retry implements exponential backoff with jitter. env-paths handles cross-platform cache directory resolution.

**Primary recommendation:** Use Commander.js + picocolors + cli-progress for CLI, native fetch + Cheerio for scraping, better-sqlite3 for caching, p-retry for retry logic, and env-paths for cache location.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full GitHub URLs only (no shorthand like `owner/repo`)
- Support multiple repos in one command: `gitsneak <url1> <url2> ...`
- No authentication required - scraping public HTML pages
- Configurable request delay via `--delay` flag for scraping politeness
- Progress bar showing items processed (X/Y)
- `-v` flag for verbose mode (shows each URL fetched, timing info)
- `-q` flag for quiet mode (suppresses progress, only final output)
- Per-repo progress when analyzing multiple repos
- Friendly, actionable error messages by default
- Colored output: red for errors, yellow for warnings
- Auto retry with exponential backoff when rate limited/blocked
- `--fail-fast` flag for partial failures (default: continue and summarize failures at end)
- `--no-cache` flag to force fresh fetch
- Show cache stats at end: "Used X cached entries, fetched Y new"

### Claude's Discretion
- Cache location (XDG standard vs project local)
- What to cache and TTL strategy (user profiles vs everything)
- Default delay between requests
- Exact backoff timing for rate limit retries

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^13.x | CLI argument parsing | De-facto standard, lightweight, excellent TypeScript support |
| picocolors | ^1.1.x | Terminal colors | Smallest/fastest color library, zero deps, used by PostCSS/SVGO |
| cli-progress | ^3.12.x | Progress bars | Full-featured with multi-bar support, customizable formats |
| cheerio | ^1.2.x | HTML parsing | jQuery-like syntax, fast, doesn't need browser, industry standard |
| better-sqlite3 | ^12.x | SQLite database | Fastest Node.js SQLite, synchronous API, excellent for caching |
| p-retry | ^6.x | Exponential backoff | Promise-based retry with jitter, configurable, well-maintained |
| env-paths | ^4.0.x | Cross-platform paths | Handles XDG on Linux, proper paths on macOS/Windows |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| undici | (built-in) | HTTP client | Powers native fetch, already in Node.js 18+ |
| typescript | ^5.x | Type safety | Required for robust CLI tooling |
| tsup | ^8.x | Build tool | Fast bundler for TypeScript CLIs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | yargs | Yargs has more features but larger; commander is simpler |
| commander | oclif | Oclif is enterprise-grade but overkill for single-command CLI |
| picocolors | chalk | Chalk is more popular but 3x larger, slower |
| cheerio | puppeteer | Puppeteer needs browser; overkill for static HTML |
| better-sqlite3 | sql.js | sql.js is pure JS (no native) but slower |
| p-retry | exponential-backoff | p-retry has better TypeScript and more options |

**Installation:**
```bash
npm install commander picocolors cli-progress cheerio better-sqlite3 p-retry env-paths
npm install -D typescript tsup @types/node @types/better-sqlite3 @types/cli-progress
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/               # CLI entry point and command definitions
│   ├── index.ts       # Main CLI entry, commander setup
│   └── options.ts     # Flag/option definitions and types
├── scraper/           # HTTP fetching and HTML parsing
│   ├── client.ts      # HTTP client with retry logic
│   ├── parser.ts      # Cheerio-based HTML extractors
│   └── rate-limiter.ts # Delay and backoff logic
├── cache/             # SQLite caching layer
│   ├── database.ts    # Database connection and schema
│   └── repository.ts  # Cache read/write operations
├── output/            # User-facing output
│   ├── progress.ts    # Progress bar management
│   └── logger.ts      # Colored logging utilities
└── types/             # Shared TypeScript types
    └── index.ts       # Domain types
```

### Pattern 1: Layered HTTP Client with Retry
**What:** Wrap fetch in a client that handles delays, retries, and logging
**When to use:** Every HTTP request to GitHub
**Example:**
```typescript
// Source: p-retry GitHub README + native fetch
import pRetry, { AbortError } from 'p-retry';

interface FetchOptions {
  delay?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

async function fetchWithRetry(url: string, opts: FetchOptions = {}): Promise<string> {
  const { delay = 1000, maxRetries = 5, signal } = opts;

  // Polite delay before request
  await sleep(delay);

  const run = async () => {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GitSneak/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal,
    });

    if (response.status === 429 || response.status === 503) {
      // Retriable - let p-retry handle it
      throw new Error(`Rate limited: ${response.status}`);
    }

    if (response.status === 404) {
      // Non-retriable
      throw new AbortError(`Not found: ${url}`);
    }

    if (!response.ok) {
      throw new AbortError(`HTTP ${response.status}: ${url}`);
    }

    return response.text();
  };

  return pRetry(run, {
    retries: maxRetries,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 30000,
    randomize: true, // Jitter prevents thundering herd
    onFailedAttempt: (error) => {
      console.log(`Retry ${error.attemptNumber}/${maxRetries}: ${error.message}`);
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Pattern 2: Cache-Aside with TTL
**What:** Check cache before fetching, store results with expiration
**When to use:** User profile lookups (DATA-08 requirement)
**Example:**
```typescript
// Source: better-sqlite3 API docs
import Database from 'better-sqlite3';

interface CachedItem {
  key: string;
  value: string;
  expires_at: number;
}

class CacheRepository {
  private db: Database.Database;
  private getStmt: Database.Statement;
  private setStmt: Database.Statement;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);
    this.getStmt = this.db.prepare('SELECT value FROM cache WHERE key = ? AND expires_at > ?');
    this.setStmt = this.db.prepare('INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)');
  }

  get(key: string): string | null {
    const now = Date.now();
    const row = this.getStmt.get(key, now) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.setStmt.run(key, value, expiresAt);
  }

  close(): void {
    this.db.close();
  }
}
```

### Pattern 3: Multi-Progress Bar for Repos
**What:** Show per-repo progress when processing multiple repositories
**When to use:** `gitsneak <url1> <url2> ...` with multiple repos
**Example:**
```typescript
// Source: cli-progress GitHub README
import cliProgress from 'cli-progress';
import pc from 'picocolors';

const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: `${pc.cyan('{repo}')} [{bar}] {percentage}% | {value}/{total} | {status}`,
}, cliProgress.Presets.shades_grey);

// For each repo
const bar1 = multibar.create(100, 0, { repo: 'owner/repo1', status: 'fetching' });
const bar2 = multibar.create(100, 0, { repo: 'owner/repo2', status: 'waiting' });

// Update as work progresses
bar1.update(50, { status: 'parsing' });

// When complete
multibar.stop();
```

### Anti-Patterns to Avoid
- **Hardcoded delays:** Use configurable `--delay` flag; different environments need different rates
- **Missing User-Agent:** GitHub will block requests without realistic headers
- **Synchronous file I/O in request path:** Use sync only for SQLite (it's optimized for it)
- **Global database connection:** Pass database instance; enables testing and graceful shutdown
- **Swallowing errors:** Log with context, re-throw or handle explicitly
- **process.exit() after output:** Set process.exitCode instead; allows stdout to flush

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exponential backoff | Custom retry loops | p-retry | Jitter, max attempts, abort conditions are tricky |
| Cache paths | Manual path joining | env-paths | Cross-platform (XDG, macOS Library, Windows AppData) |
| HTML parsing | Regex on HTML | Cheerio | HTML is not regular; Cheerio handles edge cases |
| Progress bars | Console.log updates | cli-progress | Terminal clearing, multi-bar, format tokens |
| Argument parsing | process.argv slicing | Commander.js | Help generation, validation, subcommands |
| Terminal colors | ANSI escape codes | picocolors | Color support detection, proper reset |

**Key insight:** CLI infrastructure seems simple but has countless edge cases (terminal width, color support, signal handling, Windows compatibility). Use established libraries.

## Common Pitfalls

### Pitfall 1: Getting Blocked by GitHub
**What goes wrong:** IP gets rate-limited or blocked after too many requests
**Why it happens:** No delay between requests, suspicious User-Agent, inconsistent headers
**How to avoid:**
1. Always include realistic `User-Agent` header
2. Add `Accept` and `Accept-Language` headers
3. Default delay of 1-2 seconds between requests
4. Exponential backoff with jitter on 429/503
5. Consider randomizing delay slightly (not perfectly consistent)
**Warning signs:** HTTP 429 responses, "Rate limit exceeded" messages

### Pitfall 2: Header Order Detection
**What goes wrong:** Requests get blocked despite correct headers
**Why it happens:** Header order differs from real browsers; anti-bot systems detect this
**How to avoid:** Use native fetch which sends headers in browser-like order; avoid http libraries that alphabetize headers
**Warning signs:** Blocks that happen intermittently or only on certain pages

### Pitfall 3: Premature process.exit()
**What goes wrong:** Output gets truncated; users see incomplete data
**Why it happens:** stdout writes are asynchronous; exit() doesn't wait
**How to avoid:** Set `process.exitCode = 1` instead of `process.exit(1)`; let event loop drain naturally
**Warning signs:** Missing final lines of output, especially when piped

### Pitfall 4: Stale Cache Without TTL
**What goes wrong:** Users see outdated data; cache grows indefinitely
**Why it happens:** Cache stores data forever without expiration
**How to avoid:** Always store `expires_at` timestamp; clean up expired entries periodically
**Warning signs:** Cache database grows large; data doesn't match website

### Pitfall 5: Verbose Mode Noise
**What goes wrong:** Verbose output (-v) breaks progress bars or floods terminal
**Why it happens:** Progress bar and log lines conflict; too much detail
**How to avoid:** In verbose mode, use single-line logs without progress bar; batch verbose output
**Warning signs:** Garbled terminal output, progress bar redraws incorrectly

### Pitfall 6: SQLite "database is locked" Errors
**What goes wrong:** Concurrent writes fail with SQLITE_BUSY
**Why it happens:** Multiple processes or async operations trying to write simultaneously
**How to avoid:** Use single connection per process; better-sqlite3 is sync so no async races; set timeout option
**Warning signs:** Intermittent errors under load

## Code Examples

Verified patterns from official sources:

### Commander.js Basic CLI Setup
```typescript
// Source: Commander.js GitHub README
import { Command } from 'commander';
import pc from 'picocolors';

const program = new Command();

program
  .name('gitsneak')
  .description('Analyze organizational involvement in GitHub repositories')
  .version('1.0.0')
  .argument('<urls...>', 'GitHub repository URLs to analyze')
  .option('-v, --verbose', 'show detailed output')
  .option('-q, --quiet', 'suppress progress, show only final output')
  .option('--delay <ms>', 'delay between requests in milliseconds', '1000')
  .option('--no-cache', 'bypass cache and fetch fresh data')
  .option('--fail-fast', 'stop on first error instead of continuing')
  .action(async (urls: string[], options) => {
    // Validate URLs
    for (const url of urls) {
      if (!url.startsWith('https://github.com/')) {
        console.error(pc.red(`Error: Invalid GitHub URL: ${url}`));
        console.error(pc.yellow('URLs must be full GitHub URLs (https://github.com/owner/repo)'));
        process.exitCode = 1;
        return;
      }
    }
    // ... main logic
  });

program.parse();
```

### Cheerio HTML Extraction
```typescript
// Source: Cheerio v1.2.0 README
import * as cheerio from 'cheerio';

function extractUserProfile(html: string): UserProfile | null {
  const $ = cheerio.load(html);

  const name = $('[itemprop="name"]').text().trim() || null;
  const company = $('[itemprop="worksFor"]').text().trim() || null;
  const location = $('[itemprop="homeLocation"]').text().trim() || null;
  const bio = $('.user-profile-bio').text().trim() || null;

  return { name, company, location, bio };
}
```

### Colored Error Messages
```typescript
// Source: picocolors GitHub README
import pc from 'picocolors';

function logError(message: string, suggestion?: string): void {
  console.error(pc.red(`Error: ${message}`));
  if (suggestion) {
    console.error(pc.yellow(`Suggestion: ${suggestion}`));
  }
}

function logWarning(message: string): void {
  console.error(pc.yellow(`Warning: ${message}`));
}

function logSuccess(message: string): void {
  console.log(pc.green(message));
}

function logVerbose(message: string, verbose: boolean): void {
  if (verbose) {
    console.log(pc.dim(message));
  }
}
```

### Cache Stats Output
```typescript
// Show cache statistics at end of run
interface CacheStats {
  hits: number;
  misses: number;
}

function printCacheStats(stats: CacheStats): void {
  console.log(pc.dim(`Cache: Used ${stats.hits} cached entries, fetched ${stats.misses} new`));
}
```

## Claude's Discretion Recommendations

### Cache Location
**Recommendation:** Use XDG standard via `env-paths`
**Rationale:** env-paths handles all platforms correctly:
- Linux: `~/.cache/gitsneak-nodejs`
- macOS: `~/Library/Caches/gitsneak-nodejs`
- Windows: `%LOCALAPPDATA%\gitsneak-nodejs\Cache`

```typescript
import envPaths from 'env-paths';
const paths = envPaths('gitsneak');
const cacheDbPath = `${paths.cache}/cache.db`;
```

### What to Cache and TTL
**Recommendation:** Cache user profile HTML with 7-day TTL
**Rationale:**
- User profiles change infrequently (company, bio)
- 7 days balances freshness vs. request reduction
- Don't cache repo pages (contributor lists change frequently)
- Cache key: `profile:${username}` with value as raw HTML

### Default Delay Between Requests
**Recommendation:** 1500ms default
**Rationale:**
- Conservative enough to avoid blocking
- Fast enough for reasonable UX (40 requests/minute)
- User can override with `--delay` for faster/slower
- Add random jitter (+/- 200ms) to appear more human

### Backoff Timing
**Recommendation:**
- Initial retry: 2 seconds
- Factor: 2 (doubles each retry)
- Max delay: 60 seconds
- Max retries: 5
- Jitter: enabled (randomize: true)

**Rationale:** p-retry defaults with jitter; 5 retries gives ~2 minutes of total retry time before giving up.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| axios/node-fetch | Native fetch (undici) | Node.js 18+ (2022) | No external HTTP dependency |
| chalk | picocolors | 2021-2022 | 3x smaller, faster |
| node-sqlite3 | better-sqlite3 | Ongoing | Sync API, faster, simpler |
| Manual retries | p-retry | Standard for years | Proper backoff, jitter, abort |

**Deprecated/outdated:**
- **request:** Deprecated since 2020, use native fetch
- **colors.js:** Supply chain incident; use picocolors or chalk
- **yargs** for simple CLIs: Overkill; commander is sufficient

## Open Questions

1. **GitHub HTML structure stability**
   - What we know: Cheerio selectors depend on GitHub's HTML classes/structure
   - What's unclear: How often GitHub changes their HTML; no official schema
   - Recommendation: Build selectors defensively; log warnings on parse failures; make selectors configurable

2. **Rate limit specifics**
   - What we know: GitHub rate-limits aggressive scrapers with 429/503
   - What's unclear: Exact thresholds; whether they vary by endpoint
   - Recommendation: Start conservative (1.5s delay); add telemetry to detect limits; adjust based on real-world usage

## Sources

### Primary (HIGH confidence)
- [Commander.js GitHub README](https://github.com/tj/commander.js) - CLI setup, options, commands
- [Cheerio GitHub + v1.2.0 release](https://github.com/cheeriojs/cheerio) - HTML parsing API
- [better-sqlite3 API docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) - Database operations
- [p-retry GitHub README](https://github.com/sindresorhus/p-retry) - Retry configuration options
- [env-paths GitHub](https://github.com/sindresorhus/env-paths) - Cross-platform paths, v4.0.0

### Secondary (MEDIUM confidence)
- [Node.js fetch documentation](https://nodejs.org/en/learn/getting-started/fetch) - Native fetch usage
- [picocolors GitHub](https://github.com/alexeyraspopov/picocolors) - Color API
- [cli-progress GitHub](https://github.com/npkgz/cli-progress) - Multi-bar examples

### Tertiary (LOW confidence - needs validation)
- Web scraping anti-detection guides - Header ordering, fingerprinting (varies by target)
- GitHub-specific rate limits - No official documentation for scraping

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Well-established libraries with official docs
- Architecture: HIGH - Common patterns verified across multiple sources
- Pitfalls: MEDIUM - Based on general web scraping knowledge, not GitHub-specific testing

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable ecosystem)
