# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Surface which organizations have the most skin in the game for any given GitHub repository
**Current focus:** Phase 4: Output & Reporting

## Current Position

Phase: 4 of 4 (Output & Reporting)
Plan: 1 of 2 in current phase
Status: Executing
Last activity: 2026-02-12 - Completed 04-01-PLAN.md

Progress: [#########-] 93.75%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 4 min
- Total execution time: 0.52 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | 8 min | 4 min |
| 02-data-collection | 3 | 9 min | 3 min |
| 03-organization-intelligence | 2 | 8 min | 4 min |
| 04-output-reporting | 1 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 02-02 (2 min), 02-03 (5 min), 03-01 (4 min), 03-02 (4 min), 04-01 (4 min)
- Trend: stable

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
- Profile fetching sequential to avoid rate limiting
- Default 12 months for --since per CONTEXT.md
- AbortController per repository for clean shutdown
- tldts for domain parsing - handles subdomains correctly (cloud.google.com -> google)
- Preserve legal suffixes (Inc, LLC) per CONTEXT.md
- 18 company alias entries covering Meta/Alphabet/X/Block family rebrandings
- Company field prioritized as primary org when available
- All signals collected first, then deduplicated (not short-circuit)
- CaseInsensitiveOrgMap stores canonical casing for display
- Logarithmic scaling (log(raw+1)) for diminishing returns on scoring
- Contribution weights: prAuthored=3, prReviewed=2, commit=1, issueAuthored=1, issueCommented=0.5
- Top 15 organizations displayed by default, unaffiliated shown separately

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 04-01-PLAN.md - Ready for 04-02-PLAN.md
Resume file: None
