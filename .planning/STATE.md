# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Surface which organizations have the most skin in the game for any given GitHub repository
**Current focus:** Phase 2: Data Collection

## Current Position

Phase: 2 of 4 (Data Collection)
Plan: 2 of 3 in current phase
Status: Executing
Last activity: 2026-02-12 - Completed 02-02-PLAN.md

Progress: [#####-----] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 3 min
- Total execution time: 0.23 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | 8 min | 4 min |
| 02-data-collection | 2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (3 min), 01-02 (5 min), 02-01 (2 min), 02-02 (2 min)
- Trend: improving

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Used tsup bundler instead of tsc for ESM CLI with shebang injection
- Bundled output to single dist/index.js rather than preserving src structure
- URL validation happens at CLI entry, before any processing
- p-retry v7 uses RetryContext instead of FailedAttemptError - adapted callback signature
- Cache location follows XDG standard via env-paths
- Non-retriable errors (404, 403) use AbortError to stop retry loop
- Multiple selector strategies for GitHub HTML - defensive against layout changes
- Time filtering client-side - GitHub commits URL doesn't support date params
- Bot pattern includes -bot suffix catch-all for comprehensive filtering
- Fetch PR detail pages for reviewers (not visible in list view)
- Fetch issue detail pages for commenters (not visible in list view)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 02-02-PLAN.md (PR and Issue Collectors)
Resume file: None
