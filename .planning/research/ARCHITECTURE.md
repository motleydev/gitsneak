# Architecture Patterns

**Domain:** GitHub Repository Intelligence CLI Tool
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

GitSneak requires a layered pipeline architecture that cleanly separates data acquisition from analysis and presentation. The system must handle GitHub API rate limits gracefully, cache aggressively to avoid redundant API calls, and extract organizational affiliation from multiple sources (user profile company field, public organization memberships, email domains).

## Recommended Architecture

```
+------------------+     +------------------+     +------------------+
|   CLI Interface  | --> |  Orchestrator    | --> |  Report Generator|
|  (Command Parser)|     |  (Coordinator)   |     |  (ASCII + HTML)  |
+------------------+     +------------------+     +------------------+
                                  |
                    +-------------+-------------+
                    |             |             |
                    v             v             v
          +-------------+  +-------------+  +-------------+
          | Contribution|  | User Profile|  | Affiliation |
          | Collector   |  | Resolver    |  | Extractor   |
          +-------------+  +-------------+  +-------------+
                    |             |             |
                    +-------------+-------------+
                                  |
                                  v
                         +------------------+
                         |  GitHub Client   |
                         |  (Rate Limited)  |
                         +------------------+
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
           +------------------+       +------------------+
           |  Local Cache     |       |  GitHub API      |
           |  (SQLite)        |       |  (REST/GraphQL)  |
           +------------------+       +------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **CLI Interface** | Parse commands, validate arguments, display output | Orchestrator, Report Generator |
| **Orchestrator** | Coordinate workflow, manage progress, aggregate results | All collectors, Cache, Reporter |
| **Contribution Collector** | Fetch commits, PRs, reviews, issues for target repo | GitHub Client |
| **User Profile Resolver** | Look up user details given a username | GitHub Client, Cache |
| **Affiliation Extractor** | Determine organization from profile/orgs/email | User Profile Resolver |
| **GitHub Client** | Single point of GitHub API access with rate limiting | GitHub API, Cache |
| **Local Cache** | Persist user profiles, avoid redundant lookups | SQLite database |
| **Report Generator** | Transform aggregated data into ASCII tables and HTML | CLI Interface (output) |

### Data Flow

**Phase 1: Contribution Discovery**
```
Target Repository URL
       |
       v
[Contribution Collector] --> GitHub API: GET /repos/{owner}/{repo}/contributors
                        --> GitHub API: GET /repos/{owner}/{repo}/commits
                        --> GitHub API: GET /repos/{owner}/{repo}/pulls
                        --> GitHub API: GET /repos/{owner}/{repo}/issues
       |
       v
List of unique usernames with activity counts
```

**Phase 2: User Resolution**
```
List of usernames
       |
       v
For each username:
  [Cache] --> Check if user profile exists and is fresh
       |
       v (cache miss)
  [User Profile Resolver] --> GitHub API: GET /users/{username}
                         --> GitHub API: GET /users/{username}/orgs
       |
       v
  [Cache] --> Store user profile with TTL
       |
       v
User profile with company, orgs, email
```

**Phase 3: Affiliation Extraction**
```
User profile
       |
       v
[Affiliation Extractor]
       |
       +-- Priority 1: profile.company field (e.g., "@google")
       |
       +-- Priority 2: Public organization memberships
       |
       +-- Priority 3: Email domain (exclude gmail.com, etc.)
       |
       v
Normalized organization name
```

**Phase 4: Aggregation and Reporting**
```
All user affiliations + activity counts
       |
       v
[Orchestrator] --> Group by organization
              --> Calculate totals (commits, PRs, issues)
              --> Sort by contribution weight
       |
       v
[Report Generator] --> ASCII table to stdout
                  --> HTML file to disk
```

## Component Detail

### 1. CLI Interface

**Responsibility:** Entry point, argument parsing, output formatting.

**Inputs:**
- Repository URL or owner/repo format
- Authentication token (optional, from env or flag)
- Output format options (--html, --json)
- Cache control (--no-cache, --refresh)

**Pattern:** Command pattern with subcommands if needed.

```
gitsneak analyze <repo-url> [options]
gitsneak cache clear
gitsneak cache stats
```

### 2. GitHub Client (Rate-Limited Singleton)

**Responsibility:** All GitHub API access flows through here. Handles authentication, rate limiting, retries, and conditional requests.

**Key behaviors:**
- Track `X-RateLimit-Remaining` header on every response
- Pause when approaching limit (e.g., < 100 remaining)
- Use `If-None-Match` (ETag) for conditional requests
- Exponential backoff on 403/429 responses
- Support both REST and GraphQL endpoints

**Rate Limit Strategy:**
- Unauthenticated: 60 requests/hour (insufficient for real use)
- Authenticated: 5,000 requests/hour
- GraphQL: 2,000 points/minute (preferred for bulk queries)

**Recommendation:** Use GraphQL for bulk user lookups (can fetch multiple users in one query), REST for repository-level data.

```typescript
interface GitHubClient {
  // REST endpoints
  getContributors(owner: string, repo: string): Promise<Contributor[]>;
  getUser(username: string): Promise<UserProfile>;
  getUserOrgs(username: string): Promise<Organization[]>;

  // GraphQL for bulk operations
  getUsers(usernames: string[]): Promise<UserProfile[]>;

  // Rate limit info
  getRateLimitStatus(): RateLimitInfo;
}
```

### 3. Local Cache (SQLite)

**Responsibility:** Persist user profile lookups to avoid redundant API calls across runs.

**Schema:**
```sql
CREATE TABLE user_profiles (
  username TEXT PRIMARY KEY,
  company TEXT,
  email TEXT,
  public_orgs TEXT,  -- JSON array
  fetched_at INTEGER,
  etag TEXT          -- For conditional requests
);

CREATE TABLE affiliation_cache (
  username TEXT PRIMARY KEY,
  organization TEXT,
  confidence TEXT,   -- HIGH/MEDIUM/LOW
  source TEXT,       -- company_field, org_membership, email_domain
  resolved_at INTEGER
);

CREATE INDEX idx_fetched_at ON user_profiles(fetched_at);
```

**Cache Policy:**
- User profiles: 7-day TTL (profiles rarely change)
- Use ETag for conditional refresh
- Affiliation cache: Same as profile (derived data)

**Why SQLite:**
- Zero configuration, single file
- Excellent for read-heavy CLI workloads
- Portable across machines (can share cache)
- Built-in to most languages

### 4. Contribution Collector

**Responsibility:** Extract all contribution activity for a repository.

**Data sources:**
| Source | Endpoint | What it captures |
|--------|----------|------------------|
| Commits | `GET /repos/{owner}/{repo}/commits` | Code contributions |
| PRs | `GET /repos/{owner}/{repo}/pulls?state=all` | PR authors |
| Reviews | `GET /repos/{owner}/{repo}/pulls/{n}/reviews` | Reviewers |
| Issues | `GET /repos/{owner}/{repo}/issues?state=all` | Issue reporters, commenters |

**Pagination:** Follow `Link` headers, don't construct URLs manually.

**Output:** Map of `username -> ActivityCounts`
```typescript
interface ActivityCounts {
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
  comments: number;
}
```

### 5. Affiliation Extractor

**Responsibility:** Determine organization from user profile using multiple signals.

**Priority order:**
1. **Company field** (highest confidence)
   - Parse `@company` format (GitHub convention)
   - Handle variations: "Google", "@google", "Google Inc."
   - Normalize to canonical name

2. **Public organization memberships**
   - Check if user belongs to known corporate orgs
   - Weight by org verification status

3. **Email domain** (lowest confidence)
   - Extract domain from public email
   - Exclude generic domains (gmail, hotmail, yahoo, icloud, proton, etc.)
   - Map domain to company name

**Normalization:** Maintain mapping of variations to canonical names
```
"@google" -> "Google"
"Google Inc." -> "Google"
"google.com" -> "Google"
```

### 6. Report Generator

**Responsibility:** Transform aggregated data into human-readable output.

**Output formats:**

**ASCII Table (stdout):**
```
Organization Analysis: facebook/react
=====================================

| Organization     | Commits | PRs  | Reviews | Issues | Score |
|------------------|---------|------|---------|--------|-------|
| Meta             |   1,234 |  456 |     789 |    123 | 45.2% |
| Vercel           |     567 |  234 |     345 |     67 | 18.7% |
| Independent      |     234 |  123 |     167 |     45 |  8.3% |
| ...              |     ... |  ... |     ... |    ... |   ... |
```

**HTML Report:**
- Self-contained single file
- Sortable tables
- Contributor drill-down
- Charts (optional, via inline SVG or canvas)

**Libraries:** Use established table libraries (cli-table3 for Node.js, tablewriter for Go, prettytable for Python).

## Patterns to Follow

### Pattern 1: Cache-Aside with Conditional Refresh

**What:** Check cache first, fetch from API only on miss, use ETags for conditional refresh.

**When:** All user profile lookups.

**Example:**
```typescript
async function getUser(username: string): Promise<UserProfile> {
  const cached = await cache.get(username);

  if (cached && !isExpired(cached)) {
    return cached.profile;
  }

  const response = await github.getUser(username, {
    headers: cached?.etag ? { 'If-None-Match': cached.etag } : {}
  });

  if (response.status === 304) {
    // Not modified, refresh TTL
    await cache.touch(username);
    return cached.profile;
  }

  await cache.set(username, response.data, response.headers.etag);
  return response.data;
}
```

### Pattern 2: Rate Limit Aware Queue

**What:** Queue all API requests through a rate-limit-aware dispatcher that pauses when limits approach.

**When:** All GitHub API calls.

**Example:**
```typescript
class RateLimitedQueue {
  private remaining: number = 5000;
  private resetAt: Date;

  async execute<T>(request: () => Promise<Response<T>>): Promise<T> {
    if (this.remaining < 100) {
      const waitMs = this.resetAt.getTime() - Date.now();
      console.log(`Rate limit low, waiting ${waitMs}ms`);
      await sleep(waitMs);
    }

    const response = await request();
    this.remaining = parseInt(response.headers['x-ratelimit-remaining']);
    this.resetAt = new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000);

    return response.data;
  }
}
```

### Pattern 3: Progressive Output

**What:** Show results as they become available rather than waiting for completion.

**When:** Processing large repositories with many contributors.

**Why:** Gives user feedback, allows early termination (Ctrl+C).

```typescript
async function* analyzeProgressively(repo: string): AsyncGenerator<OrgStats> {
  const contributors = await collector.getContributors(repo);

  const orgStats = new Map<string, OrgStats>();

  for (const contributor of contributors) {
    const profile = await resolver.getProfile(contributor.username);
    const org = extractor.getAffiliation(profile);

    // Update running stats
    updateStats(orgStats, org, contributor.activity);

    // Yield current state
    yield Array.from(orgStats.values());
  }
}

// Usage
for await (const stats of analyzeProgressively('facebook/react')) {
  clearScreen();
  renderTable(stats);
}
```

### Pattern 4: GraphQL Batching for User Lookups

**What:** Batch multiple user lookups into single GraphQL query.

**When:** Resolving many contributors.

**Why:** 2,000 points/minute for GraphQL vs 900 for REST. One GraphQL query can fetch ~50 users.

```graphql
query BatchUsers($logins: [String!]!) {
  users: nodes(ids: $logins) {
    ... on User {
      login
      company
      email
      organizations(first: 10) {
        nodes {
          login
          name
        }
      }
    }
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Unbounded Parallel Requests

**What:** Firing all API requests concurrently without throttling.

**Why bad:** Triggers secondary rate limits (100 concurrent requests max), results in 403 errors and potential account suspension.

**Instead:** Use a bounded concurrency pool (e.g., 10 concurrent requests max) with rate-limit awareness.

### Anti-Pattern 2: Ignoring Conditional Requests

**What:** Always fetching fresh data without using ETags or If-Modified-Since.

**Why bad:** Wastes rate limit budget, slower responses.

**Instead:** Store ETags, use conditional requests. 304 responses don't count against primary rate limit.

### Anti-Pattern 3: Parsing Link Headers Manually

**What:** Constructing pagination URLs based on patterns observed in API responses.

**Why bad:** URLs can change, fragile implementation.

**Instead:** Parse `Link` header and follow `rel="next"` URLs exactly as provided.

### Anti-Pattern 4: Storing Derived Data Without Source

**What:** Caching only the final "organization" without preserving how it was derived.

**Why bad:** Can't debug affiliation issues, can't adjust algorithm without re-fetching.

**Instead:** Store source data (company field, orgs, email) separately from derived affiliation. Include confidence level and source indicator.

### Anti-Pattern 5: Synchronous API Calls in Loop

**What:** `for (user of users) { await getProfile(user); }`

**Why bad:** Serializes all requests, extremely slow for 100+ contributors.

**Instead:** Batch with GraphQL, or use bounded parallel execution with `Promise.all` and chunking.

## Scalability Considerations

| Concern | Small Repo (<50 contributors) | Medium Repo (50-500) | Large Repo (500+) |
|---------|------------------------------|----------------------|-------------------|
| API Calls | ~100 calls, fits in 1 run | ~1,000 calls, may hit limits | 5,000+ calls, multi-run needed |
| Cache Value | Low (fast enough without) | Medium (saves retries) | Critical (required for completion) |
| Approach | Single pass, no batching | GraphQL batching, progress display | Chunked execution, resume support |
| Time | < 1 minute | 5-15 minutes | 30+ minutes, background processing |

**Recommendation:** Implement resume support early. Store progress checkpoints so interrupted analysis can continue where it left off.

## Build Order (Dependency Graph)

```
Phase 1: Foundation
├── 1.1 Project setup, CLI skeleton
├── 1.2 GitHub Client (REST, auth, rate limiting)
└── 1.3 SQLite cache layer

Phase 2: Data Collection
├── 2.1 Contribution Collector (commits)
├── 2.2 Contribution Collector (PRs, issues)
└── 2.3 User Profile Resolver

Phase 3: Intelligence
├── 3.1 Affiliation Extractor
├── 3.2 Organization normalizer
└── 3.3 Aggregation logic

Phase 4: Output
├── 4.1 ASCII table output
├── 4.2 HTML report generation
└── 4.3 Progress display

Phase 5: Optimization
├── 5.1 GraphQL batching
├── 5.2 Resume/checkpoint support
└── 5.3 Advanced caching (ETags)
```

**Critical path:** 1.2 (GitHub Client) blocks all data collection. Start here after project setup.

**Parallelizable:** 2.1/2.2 can be developed in parallel. 4.1/4.2 can be developed in parallel.

## Sources

**Official Documentation (HIGH confidence):**
- [GitHub REST API Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub REST API Best Practices](https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api)
- [GitHub Users API](https://docs.github.com/en/rest/users/users)

**Architecture References (MEDIUM confidence):**
- [RepoSense Contributor Analysis Tool](https://github.com/reposense/RepoSense)
- [git-fame Contributor Statistics](https://github.com/casperdcl/git-fame)
- [Livable Software: Tools for GitHub Data Mining](https://livablesoftware.com/tools-mine-analyze-github-git-software-data/)

**Patterns (MEDIUM confidence):**
- [Data Pipeline Architecture Patterns](https://www.alation.com/blog/data-pipeline-architecture-patterns/)
- [Offline-First SQLite Caching](https://www.thecodingdev.com/2025/04/offline-first-using-sqlite-and-caching.html)
- [tablewriter Go Library](https://github.com/olekukonko/tablewriter)
- [cli-table3 Node.js](https://npm-compare.com/ascii-table,blessed,cli-table,cli-table3,table)
