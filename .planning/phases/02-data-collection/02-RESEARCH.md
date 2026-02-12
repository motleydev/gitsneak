# Phase 2: Data Collection - Research

**Researched:** 2026-02-12
**Domain:** GitHub HTML scraping, pagination, data extraction
**Confidence:** HIGH

## Summary

This phase implements the core data collection for gitsneak: extracting contributors from commits, PRs, and issues by scraping GitHub's HTML pages. The existing Phase 1 infrastructure provides an HTTP client with rate limiting, retry logic, and SQLite caching. This phase adds HTML parsing with cheerio, pagination handling, progress reporting, and time-based filtering.

GitHub's web pages use cursor-based pagination (not page numbers) for commits, while issues and PRs still use `?page=N` style pagination. The scraper must handle both patterns. Bot accounts (dependabot, renovate, etc.) should be filtered, and generic email domains (gmail, outlook) should be excluded from email capture.

**Primary recommendation:** Use cheerio for HTML parsing, implement separate collectors for each data source (commits, PRs, issues), aggregate contributors with activity counts, and cache profile data during collection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PRs: Capture both authors AND reviewers (reviewers show organizational investment in code quality)
- Issues: Capture authors AND commenters (commenters show ongoing engagement)
- PR status: Include merged PRs + open PRs with activity in last 30 days
- Closed unmerged PRs: Include but flag for lower weight in output phase
- Default window: Last 12 months if --since not specified
- Boundary behavior: Only count in-window activity (strict cutoff)
- Filter scope: Same cutoff applies to commits, PRs, and issues equally
- PR date: Use most recent of opened or merged date
- Activity counts: Track totals per type (commits: 15, prs: 3, issues: 2)
- Commit emails: Capture non-generic emails only (skip gmail, outlook, etc.)
- Profile fetching: Fetch each contributor's full GitHub profile during collection (one pass, cache immediately)
- Bot filtering: Exclude bot accounts (dependabot, renovate, etc.)
- Progress style: Progress bar with counts (e.g., "Collecting commits... [=====>    ] 523/1200")
- Verbosity: Add -v flag for verbose mode (shows API calls, cache hits, pagination)
- Interruption handling: Save partial data to cache on Ctrl+C (resume next time)
- Completion summary: Show totals ("Found 234 contributors from 1,523 commits, 89 PRs, 156 issues")

### Claude's Discretion
- Exact progress bar library/implementation
- Bot detection heuristics (username patterns, [bot] suffix, etc.)
- Generic email provider list for filtering
- How to determine "recently active" for open PRs (likely: any PR activity timestamp in last 30 days)

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cheerio | 1.2.0 | HTML parsing | Industry standard for Node.js HTML parsing, jQuery-like API, pure TypeScript, no browser overhead |
| date-fns | 4.1.0 | Date manipulation | Modular tree-shakeable functions, 100% TypeScript, parseISO for GitHub timestamps |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cli-progress | (existing) | Progress bars | MultiBar for parallel collectors, already used in Phase 1 |
| better-sqlite3 | (existing) | Caching | Store scraped data and profiles |
| p-retry | (existing) | Retry logic | Already configured in client.ts |

### Not Needed
| Library | Why Not |
|---------|---------|
| puppeteer/playwright | GitHub serves static HTML, no JS rendering needed |
| axios | Native fetch works, already integrated |
| moment.js | date-fns is smaller and modular |

**Installation:**
```bash
npm install cheerio date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── collectors/
│   ├── types.ts           # Contributor, Activity, CollectorResult types
│   ├── commits.ts         # Commit author extraction
│   ├── pull-requests.ts   # PR authors and reviewers
│   ├── issues.ts          # Issue authors and commenters
│   ├── profiles.ts        # User profile fetching
│   └── index.ts           # Orchestrator that runs all collectors
├── parsers/
│   ├── pagination.ts      # Extract next page URLs from HTML
│   ├── contributor.ts     # Parse contributor usernames from various pages
│   └── date.ts            # Parse GitHub date formats
├── filters/
│   ├── bots.ts            # Bot account detection
│   └── emails.ts          # Generic email filtering
└── scraper/               # (existing)
    ├── client.ts          # HTTP client with caching
    └── rate-limiter.ts    # Rate limiting
```

### Pattern 1: Collector Interface
**What:** Uniform interface for each data source
**When to use:** Each collector (commits, PRs, issues) follows same pattern
**Example:**
```typescript
// Source: Project architecture pattern
interface CollectorResult {
  contributors: Map<string, ContributorActivity>;
  nextPage: string | null;
  itemsProcessed: number;
}

interface Collector {
  collectPage(url: string): Promise<CollectorResult>;
  getStartUrl(owner: string, repo: string, since?: Date): string;
}

// Each collector implements this interface
class CommitCollector implements Collector {
  constructor(private client: GitHubClient, private parser: CheerioParser) {}

  async collectPage(url: string): Promise<CollectorResult> {
    const { html } = await this.client.fetch(url);
    const $ = cheerio.load(html);
    // Parse commits, extract authors, find next page
    return { contributors, nextPage, itemsProcessed };
  }
}
```

### Pattern 2: Contributor Aggregation
**What:** Merge contributors across sources with activity counts
**When to use:** After collecting from all sources
**Example:**
```typescript
// Source: Project architecture pattern
interface ContributorActivity {
  username: string;
  commits: number;
  prsAuthored: number;
  prsReviewed: number;
  issuesAuthored: number;
  issuesCommented: number;
  emails: Set<string>;  // Non-generic only
  lastActivityDate: Date;
  profileFetched: boolean;
}

function mergeContributors(
  existing: Map<string, ContributorActivity>,
  incoming: Map<string, ContributorActivity>
): Map<string, ContributorActivity> {
  for (const [username, activity] of incoming) {
    const current = existing.get(username) || createEmptyActivity(username);
    current.commits += activity.commits;
    current.prsAuthored += activity.prsAuthored;
    // ... merge other fields
    existing.set(username, current);
  }
  return existing;
}
```

### Pattern 3: Graceful Shutdown with Partial Save
**What:** Save collected data to cache on SIGINT
**When to use:** Long-running collection that should be resumable
**Example:**
```typescript
// Source: Node.js graceful shutdown patterns
let isShuttingDown = false;
let collectionState: CollectionState | null = null;

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\nInterrupted. Saving progress...');
  if (collectionState && cache) {
    await savePartialState(cache, collectionState);
    console.log('Progress saved. Run again to resume.');
  }
  process.exit(130);
});
```

### Anti-Patterns to Avoid
- **Fetching profiles inline:** Don't fetch profile for each contributor as found. Collect all usernames first, dedupe, then batch fetch profiles.
- **Parsing HTML without caching:** Always check cache before fetching; the client already handles this.
- **Ignoring pagination:** GitHub limits results per page. Always look for next page link.
- **Hardcoded selectors scattered:** Keep all CSS selectors in one place for easy updates when GitHub changes UI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing | Regex on HTML | cheerio | Edge cases, encoding, malformed HTML |
| Date parsing | Manual parsing | date-fns parseISO | ISO 8601 edge cases, timezones |
| Date comparison | Manual math | date-fns isAfter/isBefore | Month lengths, leap years |
| Progress bars | console.log tricks | cli-progress MultiBar | Terminal control, ETA calculation |
| Email validation | Simple regex | Known provider list | Too many edge cases |

**Key insight:** GitHub's HTML structure will change over time. Isolate selectors in dedicated modules so updates are localized.

## Common Pitfalls

### Pitfall 1: Cursor-Based Pagination on Commits
**What goes wrong:** Looking for `?page=2` links on commit pages
**Why it happens:** GitHub switched commits to cursor-based pagination (commit SHA in URL)
**How to avoid:** Parse the "Older" link which contains `?after=<commit_sha>` parameter
**Warning signs:** No next page found when repo clearly has more commits

### Pitfall 2: Dynamic Content Not in Initial HTML
**What goes wrong:** Contributor counts, some statistics not found
**Why it happens:** GitHub loads some data via XHR after page load
**How to avoid:** Only rely on data present in initial HTML; use alternative pages/endpoints
**Warning signs:** Data visible in browser but missing in scraped HTML

### Pitfall 3: Bot Account False Positives
**What goes wrong:** Filtering real users with "bot" in username
**Why it happens:** Overly aggressive pattern matching
**How to avoid:** Match specific patterns: `[bot]` suffix, known bot names (dependabot, renovate)
**Warning signs:** Low contributor counts on repos with known human contributors

### Pitfall 4: Email Domain False Negatives
**What goes wrong:** Filtering valid corporate emails
**Why it happens:** Some companies use common domains (e.g., company.gmail.com)
**How to avoid:** Only filter exact matches on known generic domains, not substrings
**Warning signs:** Missing expected corporate contributors

### Pitfall 5: Date Boundary Off-by-One
**What goes wrong:** Missing or including commits at boundary
**Why it happens:** Inconsistent date comparison (< vs <=, timezone issues)
**How to avoid:** Use date-fns consistently with explicit comparison functions
**Warning signs:** Different results on same repo with same date range

### Pitfall 6: Memory Growth on Large Repos
**What goes wrong:** OOM on repos with 10k+ contributors
**Why it happens:** Keeping all HTML in memory, not streaming
**How to avoid:** Process each page, extract data, discard HTML immediately
**Warning signs:** Slow performance, increasing memory usage

## Code Examples

### Loading and Parsing HTML with Cheerio
```typescript
// Source: cheerio.js.org official docs
import * as cheerio from 'cheerio';

async function parseCommitsPage(html: string): Promise<CommitInfo[]> {
  const $ = cheerio.load(html);
  const commits: CommitInfo[] = [];

  // Each commit is in a timeline item (selector may need updating)
  $('div[data-testid="commit-row"]').each((_, element) => {
    const $el = $(element);
    const username = $el.find('a[data-hovercard-type="user"]').attr('href')?.replace('/', '');
    const dateStr = $el.find('relative-time').attr('datetime');

    if (username && dateStr) {
      commits.push({
        username,
        date: parseISO(dateStr),
        // Extract email if visible in commit details
      });
    }
  });

  return commits;
}
```

### Date Filtering with date-fns
```typescript
// Source: date-fns.org official docs
import { parseISO, isAfter, subMonths } from 'date-fns';

function isWithinWindow(dateStr: string, since: Date): boolean {
  const date = parseISO(dateStr);
  return isAfter(date, since);
}

function getDefaultSince(): Date {
  return subMonths(new Date(), 12); // 12 months ago
}
```

### Pagination Extraction
```typescript
// Source: GitHub HTML structure observation
function extractNextPage($: cheerio.CheerioAPI): string | null {
  // Commits use cursor pagination
  const olderLink = $('a[rel="nofollow"]:contains("Older")').attr('href');
  if (olderLink) {
    return new URL(olderLink, 'https://github.com').href;
  }

  // Issues/PRs use page numbers
  const nextLink = $('a.next_page').attr('href');
  if (nextLink) {
    return new URL(nextLink, 'https://github.com').href;
  }

  return null;
}
```

### Bot Detection
```typescript
// Source: GitHub bot naming conventions
const BOT_PATTERNS = [
  /\[bot\]$/i,                    // GitHub Apps: dependabot[bot]
  /^dependabot$/i,
  /^renovate$/i,
  /^renovate-bot$/i,
  /^greenkeeper$/i,
  /^snyk-bot$/i,
  /^semantic-release-bot$/i,
  /^github-actions$/i,
  /^mergify$/i,
  /^codecov$/i,
  /^allcontributors$/i,
  /^imgbot$/i,
  /^stale$/i,
];

function isBot(username: string): boolean {
  return BOT_PATTERNS.some(pattern => pattern.test(username));
}
```

### Generic Email Filtering
```typescript
// Source: Common email provider domains research
const GENERIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
  'aol.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'mail.com', 'email.com',
  'zoho.com',
  'yandex.com', 'yandex.ru',
  'mail.ru',
  'fastmail.com', 'fastmail.fm',
  'tutanota.com', 'tutamail.com',
  'users.noreply.github.com', // GitHub noreply emails
]);

function isGenericEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return !domain || GENERIC_DOMAINS.has(domain);
}
```

### Progress Bar for Multi-Stage Collection
```typescript
// Source: cli-progress npm documentation
import cliProgress from 'cli-progress';

function createCollectionProgress(options: GitSneakOptions) {
  if (options.quiet) return null;

  const multibar = new cliProgress.MultiBar({
    format: '{stage} [{bar}] {percentage}% | {value}/{total} | {status}',
    clearOnComplete: false,
    hideCursor: true,
  });

  return {
    commits: multibar.create(0, 0, { stage: 'Commits', status: 'starting' }),
    prs: multibar.create(0, 0, { stage: 'PRs    ', status: 'waiting' }),
    issues: multibar.create(0, 0, { stage: 'Issues ', status: 'waiting' }),
    profiles: multibar.create(0, 0, { stage: 'Profiles', status: 'waiting' }),
    stop: () => multibar.stop(),
  };
}
```

## GitHub URL Patterns

### Data Source URLs
| Data | URL Pattern | Pagination |
|------|-------------|------------|
| Commits | `/{owner}/{repo}/commits` | Cursor: `?after=<sha>` |
| PRs (merged) | `/{owner}/{repo}/pulls?q=is:pr+is:merged` | Page: `?page=N` |
| PRs (open) | `/{owner}/{repo}/pulls?q=is:pr+is:open` | Page: `?page=N` |
| Issues | `/{owner}/{repo}/issues?q=is:issue` | Page: `?page=N` |
| PR detail | `/{owner}/{repo}/pull/{number}` | N/A (single page) |
| Issue detail | `/{owner}/{repo}/issues/{number}` | Comments paginate |
| User profile | `/{username}` | N/A |
| Contributors | `/{owner}/{repo}/graphs/contributors` | Limited to top 100 |

### Time Filtering in URLs
```
# Issues/PRs support date filtering in search
/{owner}/{repo}/issues?q=is:issue+created:>2025-01-01
/{owner}/{repo}/pulls?q=is:pr+merged:>2025-01-01
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Page-number pagination | Cursor-based pagination (commits) | ~2020 | Must parse commit SHA from URL |
| Contributors API | HTML scraping | N/A | API limited to 500 linked emails |
| GraphQL API | HTML scraping | N/A | For no-auth/anonymous access |

**Deprecated/outdated:**
- GitHub API contributors endpoint: Limited to 500 linked emails, requires auth for higher limits
- `?page=N` on commits: No longer works, must use `?after=<sha>` cursor

## Open Questions

1. **Exact HTML selectors for current GitHub UI**
   - What we know: General patterns (data-testid, data-hovercard-type)
   - What's unclear: Exact selectors for 2026 GitHub UI
   - Recommendation: Inspect live GitHub pages during implementation, keep selectors in config

2. **PR reviewer extraction from list page vs detail page**
   - What we know: PR list shows author; reviewers may require detail page
   - What's unclear: Whether reviewer info is in list HTML
   - Recommendation: Check list page first; fall back to detail page fetch if needed

3. **Issue commenter extraction**
   - What we know: Issue list shows authors; commenters require detail page
   - What's unclear: Comment pagination on detail pages
   - Recommendation: Fetch detail page for each issue, parse comment authors

## Sources

### Primary (HIGH confidence)
- [cheerio.js.org](https://cheerio.js.org/docs/basics/selecting/) - Element selection API
- [cheerio.js.org](https://cheerio.js.org/docs/basics/loading/) - HTML loading API
- [GitHub cheerio releases](https://github.com/cheeriojs/cheerio/releases) - Version 1.2.0 confirmed
- [date-fns](https://date-fns.org/) - Version 4.1.0, date manipulation

### Secondary (MEDIUM confidence)
- [HN discussion](https://news.ycombinator.com/item?id=25550765) - GitHub cursor-based pagination change
- [Renovate docs](https://docs.renovatebot.com/bot-comparison/) - Bot username patterns
- [Generic email domains gist](https://gist.github.com/ammarshah/f5c2624d767f91a7cbdc4e54db8dd0bf) - Email filtering list

### Tertiary (LOW confidence)
- GitHub HTML selectors - Will need validation against live pages
- PR reviewer extraction method - Needs verification during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - cheerio and date-fns are well-documented, verified versions
- Architecture: HIGH - Patterns based on project structure and scraping best practices
- Pitfalls: MEDIUM - Based on GitHub behavior research, some selectors need validation
- URL patterns: MEDIUM - May need updates based on current GitHub UI

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (GitHub UI may change; selectors need periodic validation)
