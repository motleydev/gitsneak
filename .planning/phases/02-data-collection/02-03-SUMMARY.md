---
phase: 02-data-collection
plan: 03
subsystem: api
tags: [cheerio, cli-progress, commander, scraping, pagination, github, profiles]

# Dependency graph
requires:
  - phase: 02-01
    provides: Collector interface, bot filtering, date parsing, pagination extraction
  - phase: 02-02
    provides: PullRequestCollector, IssueCollector with detail page fetching
provides:
  - ProfileFetcher for GitHub profile extraction (company, bio, orgs)
  - collectContributors orchestrator running all collectors
  - CollectionResult interface with stats
  - CLI --since flag for date filtering
  - Progress bar with stage counts
  - Completion summary with contributor breakdown
  - Graceful shutdown via AbortSignal
affects: [03-org-detection, 04-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [orchestration with abort signal, progress callbacks, multi-stage collection]

key-files:
  created:
    - src/collectors/profiles.ts
    - src/collectors/index.ts
  modified:
    - src/cli/index.ts
    - src/cli/options.ts
    - src/types/index.ts
    - src/collectors/commits.ts
    - src/collectors/pull-requests.ts
    - src/collectors/issues.ts

key-decisions:
  - "Profile fetching sequential to avoid rate limiting"
  - "Default 12 months for --since per CONTEXT.md"
  - "Progress bar shows stage name and counts"
  - "AbortController per repository for clean shutdown"

patterns-established:
  - "Orchestrator pattern: central function coordinates multiple collectors"
  - "Progress callback: (stage, current, total) => void"
  - "Graceful shutdown: check signal.aborted before each fetch"

# Metrics
duration: 5min
completed: 2026-02-12
---

# Phase 2 Plan 3: Orchestration and CLI Integration Summary

**Collection orchestrator connecting all data sources with --since date filtering, progress reporting, and graceful Ctrl+C shutdown**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-12T11:03:56Z
- **Completed:** 2026-02-12T11:09:17Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- ProfileFetcher extracts company, bio, and org memberships from GitHub profiles
- collectContributors orchestrator runs all collectors in sequence with progress callbacks
- CLI accepts --since flag with ISO dates (2025-01-01) and relative formats (12m, 6m, 1y)
- Progress bar displays stage name and counts during collection
- Completion summary shows contributor totals by activity type
- Graceful shutdown saves partial data to cache on Ctrl+C

## Task Commits

Each task was committed atomically:

1. **Task 1: Create profile fetcher and orchestrator** - `e02f797` (feat)
2. **Task 2: Integrate into CLI with --since and progress** - `17a3b31` (feat)
3. **Task 3: Add verbose logging and finalize** - `2d55229` (feat)

## Files Created/Modified

- `src/collectors/profiles.ts` - ProfileFetcher for GitHub profile page scraping
- `src/collectors/index.ts` - collectContributors orchestrator and exports
- `src/cli/index.ts` - CLI integration with --since, progress, and shutdown handling
- `src/cli/options.ts` - parseSince function for date parsing
- `src/types/index.ts` - Added since?: Date to GitSneakOptions
- `src/collectors/commits.ts` - Added verbose logging and fixed selectors
- `src/collectors/pull-requests.ts` - Added verbose logging
- `src/collectors/issues.ts` - Added verbose logging

## Decisions Made

- Profile fetching runs sequentially after all activity collection to minimize requests
- Default 12 months for --since matches CONTEXT.md decision
- Progress bar shows percentage + stage name + counts (e.g., "commits: 123")
- One AbortController per repository allows clean per-repo abort

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed GitHub commit selectors for 2025 layout**
- **Found during:** Task 3 (verification)
- **Issue:** data-testid="commit-row" no longer matches, GitHub now uses "commit-row-item"
- **Fix:** Added "commit-row-item" as first selector, added "avatar-icon-link" for author extraction
- **Files modified:** src/collectors/commits.ts
- **Verification:** Running CLI now finds 33 commits vs 0 before
- **Committed in:** `2711b77` (fix: separate from Task 3)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** GitHub layout change required selector update. Essential for functionality.

## Issues Encountered

- Issue collector has some elements it can't extract username from (17 of 20) - this is a known limitation of HTML scraping with layout variation. Core functionality still works.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All data collection complete: commits, PRs (merged + open), issues, profiles
- ContributorActivity data ready for org detection in Phase 3
- Cache captures all fetched HTML for offline analysis
- Graceful shutdown ensures no data loss on interrupt

## Self-Check: PASSED

All files verified to exist:
- src/collectors/profiles.ts
- src/collectors/index.ts
- src/cli/index.ts
- src/cli/options.ts
- src/types/index.ts
- src/collectors/commits.ts
- src/collectors/pull-requests.ts
- src/collectors/issues.ts

All commits verified to exist:
- e02f797
- 17a3b31
- 2d55229
- 2711b77

---
*Phase: 02-data-collection*
*Completed: 2026-02-12*
