---
phase: 02-data-collection
plan: 02
subsystem: api
tags: [cheerio, date-fns, scraping, pagination, github, pull-requests, issues]

# Dependency graph
requires:
  - phase: 02-01
    provides: Collector interface, bot filtering, pagination extraction, date parsing
provides:
  - PullRequestCollector for PR author and reviewer extraction
  - IssueCollector for issue author and commenter extraction
affects: [02-data-collection, 03-org-detection]

# Tech tracking
tech-stack:
  added: []
  patterns: [detail page fetching for nested data, multiple selector strategies]

key-files:
  created:
    - src/collectors/pull-requests.ts
    - src/collectors/issues.ts
  modified: []

key-decisions:
  - "Fetch PR detail pages to extract reviewers (not visible in list view)"
  - "Fetch issue detail pages to extract commenters (not visible in list view)"
  - "Multiple selector strategies for robust HTML parsing against GitHub layout changes"
  - "Comment pagination acknowledged but not fully implemented (most comments visible on initial load)"

patterns-established:
  - "Detail page fetching: Collectors fetch item detail pages for nested data"
  - "Graceful failure: Continue processing if individual detail page fails"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 2 Plan 2: PR and Issue Collectors Summary

**PullRequestCollector and IssueCollector with detail page fetching for reviewers and commenters**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T10:58:28Z
- **Completed:** 2026-02-12T11:00:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- PullRequestCollector extracts PR authors from merged and active PRs
- PullRequestCollector fetches detail pages to extract reviewers
- IssueCollector extracts issue authors from issue listings
- IssueCollector fetches detail pages to extract commenters
- Both collectors use page-based pagination
- Both collectors filter bot accounts and respect time windows

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pull request collector** - `c7c783b` (feat)
2. **Task 2: Create issue collector** - `0855704` (feat)

## Files Created/Modified
- `src/collectors/pull-requests.ts` - PullRequestCollector class with reviewer extraction via detail pages
- `src/collectors/issues.ts` - IssueCollector class with commenter extraction via detail pages

## Decisions Made
- Fetch PR detail pages to extract reviewers since reviewer info is not visible in PR list view
- Fetch issue detail pages to extract commenters since comment content is not in list view
- Use multiple selector strategies (5-6 per element type) for robustness against GitHub HTML changes
- Comment pagination is acknowledged but not fully implemented since most comments are visible on initial page load and GitHub uses AJAX loading

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three collectors complete (commits, PRs, issues)
- Ready for profile enrichment in 02-03 to add organizational info
- Collectors use consistent ContributorActivity interface

## Self-Check: PASSED

All files exist:
- src/collectors/pull-requests.ts
- src/collectors/issues.ts

All commits exist:
- c7c783b (Task 1)
- 0855704 (Task 2)

---
*Phase: 02-data-collection*
*Completed: 2026-02-12*
