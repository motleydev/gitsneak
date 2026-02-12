---
phase: 04-output-reporting
plan: 01
subsystem: reporting
tags: [reporting, scoring, aggregation, cli-output]
dependency-graph:
  requires: [collectors/types, collectors/index, organization/types]
  provides: [reporting/types, reporting/scorer, reporting/aggregator, output/table, reporting/index]
  affects: [cli/index]
tech-stack:
  added: [cli-table3]
  patterns: [logarithmic-scoring, organization-aggregation, multi-repo-deduplication]
key-files:
  created:
    - src/reporting/types.ts
    - src/reporting/scorer.ts
    - src/reporting/aggregator.ts
    - src/output/table.ts
    - src/reporting/index.ts
  modified:
    - src/cli/index.ts
    - package.json
decisions:
  - Logarithmic scaling (log(raw+1)) for diminishing returns on high-activity contributors
  - Contribution weights: prAuthored=3, prReviewed=2, commit=1, issueAuthored=1, issueCommented=0.5
  - Top 15 organizations displayed by default
  - Unaffiliated contributors shown separately at table bottom
metrics:
  duration: 4 min
  completed: 2026-02-12
---

# Phase 4 Plan 1: Output & Reporting - Scoring and Table Display Summary

Weighted scoring algorithm and ASCII table output for organization rankings.

## One-liner

Terminal ASCII table displaying organization rankings with weighted contribution scoring and multi-repo aggregation support.

## What Was Built

### Reporting Types (src/reporting/types.ts)
- `ContributorScore`: Username, calculated score, activity breakdown
- `OrganizationReport`: Organization name, total score, contributor count, aggregated breakdown, top 3 contributors
- `ReportData`: Full report with organizations, unknown contributors, repos analyzed, timestamp

### Weighted Scorer (src/reporting/scorer.ts)
- `CONTRIBUTION_WEIGHTS` constant defining activity weights:
  - prAuthored: 3 (most effort - creating/maintaining PRs)
  - prReviewed: 2 (significant effort - code review)
  - commit: 1 (base unit)
  - issueAuthored: 1 (similar to commit)
  - issueCommented: 0.5 (lowest effort)
- `calculateScore()`: Computes weighted sum with logarithmic scaling (log(raw+1))
- `scoreContributor()`: Returns full ContributorScore with breakdown

### Organization Aggregator (src/reporting/aggregator.ts)
- `aggregateByOrganization()`: Transforms contributor Map to ranked OrganizationReport[]
  - Groups contributors by primaryOrg
  - Sums scores and breakdowns per organization
  - Tracks top 3 contributors by score
  - Returns unknown contributors separately
- `aggregateMultiRepo()`: Deduplicates contributors across repositories
  - Merges activity counts by username
  - Preserves affiliations from contributor with most data

### Table Renderer (src/output/table.ts)
- `renderOrganizationTable()`: Produces ASCII table using cli-table3
  - Columns: Rank, Organization, Score, Contributors, Commits, PRs (A/R), Issues (A/C)
  - Top 3 ranks color-coded (green, cyan, yellow)
  - Organization names truncated at 24 chars with ellipsis
  - Unaffiliated contributors shown in separate row at bottom

### CLI Integration (src/cli/index.ts)
- Stores CollectionResult from each successful repository
- Calls generateReport() after all repos processed
- Displays table via displayReport()

## Testing Performed

1. **Single repo analysis**: `./dist/index.js https://github.com/sindresorhus/p-retry --since 12m`
   - Table displays with 5 organizations ranked
   - avajs at #1 with highest score

2. **Multi-repo analysis**: `./dist/index.js https://github.com/sindresorhus/p-retry https://github.com/sindresorhus/ky --since 6m`
   - Both repos collected
   - Single combined table with aggregated results
   - Same contributor (sindresorhus) merged across repos
   - Unaffiliated contributors shown at bottom

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Logarithmic scaling | Prevents single high-volume contributor from dominating scores |
| PR authoring weighted 3x | Creating PRs requires most sustained effort |
| Unaffiliated shown separately | Don't compete with identified organizations |
| Top 15 limit default | Reasonable screen fit without overwhelming |

## Deviations from Plan

None - plan executed exactly as written.

## Artifacts Verified

- [x] src/reporting/types.ts exports OrganizationReport, ReportData, ContributorScore
- [x] src/reporting/scorer.ts exports calculateScore, CONTRIBUTION_WEIGHTS
- [x] src/reporting/aggregator.ts exports aggregateByOrganization, aggregateMultiRepo
- [x] src/output/table.ts exports renderOrganizationTable
- [x] src/reporting/index.ts exports generateReport

## Success Criteria Met

- [x] OUT-01: ASCII table displays organization rankings
- [x] OUT-03: Weighted scoring implemented
- [x] OUT-04: Multi-repo aggregation works
- [x] OUT-05: Breakdown by contribution type in table columns
- [x] Unknown affiliations handled separately

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 8e0376d | feat | add reporting types and weighted contribution scorer |
| 69b5b97 | feat | add organization aggregator and multi-repo support |
| 6145145 | feat | add terminal table renderer and CLI integration |

## Self-Check: PASSED

All created files exist and all commits verified.
