# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Surface which organizations have the most skin in the game for any given GitHub repository
**Current focus:** Phase 5: Packaging & Distribution

## Current Position

Phase: 5 of 5 (Packaging & Distribution)
Plan: 1 of 3 in current phase
Status: Executing
Last activity: 2026-02-13 - Completed 05-01 justfile automation

Progress: [########--] 83% (10/12 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 4 min
- Total execution time: 0.62 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | 8 min | 4 min |
| 02-data-collection | 3 | 9 min | 3 min |
| 03-organization-intelligence | 2 | 8 min | 4 min |
| 04-output-reporting | 2 | 9 min | 4.5 min |
| 05-packaging-distribution | 1 | 1 min | 1 min |

**Recent Trend:**
- Last 5 plans: 03-01 (4 min), 03-02 (4 min), 04-01 (4 min), 04-02 (5 min), 05-01 (1 min)
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
- Used just instead of make for cross-platform build automation

### Pending Todos

- **UX: Progress estimation phase** — Before scanning, show initial estimates (PR count, contributor count, estimated time). Add `--top N` flag to limit results (e.g., top 100 PRs). Let user decide to continue or adjust limits. Current progress bar scales during PR list fetch which isn't informative.
- **HTML report enrichment** — Add: top contributors table (individuals, not just orgs), unaffiliated contributor details (names not just count), confidence badges on affiliations, contribution type pie/donut chart. Consider expandable org sections showing who's in each org.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-13
Stopped at: Completed 05-01-PLAN.md
Resume file: None
