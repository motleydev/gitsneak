# Roadmap: GitSneak

## Overview

GitSneak transforms GitHub repository URLs into organizational intelligence reports. The roadmap progresses from reliable API infrastructure through data collection and affiliation detection to polished output generation. Each phase builds on the previous, delivering a complete CLI tool that surfaces which companies have the most investment in any open-source project.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - CLI skeleton, GitHub client, rate limiting, and caching infrastructure
- [x] **Phase 2: Data Collection** - Extract contributors, PRs, issues, and reviewers with pagination
- [x] **Phase 3: Organization Intelligence** - Detect and normalize organizational affiliations from user profiles
- [ ] **Phase 4: Output & Reporting** - Generate ASCII tables and HTML reports with weighted analysis

## Phase Details

### Phase 1: Foundation
**Goal**: Users can invoke the CLI with repository URLs and the tool can reliably fetch data from GitHub without being rate-limited or blocked
**Depends on**: Nothing (first phase)
**Requirements**: CLI-01, CLI-02, CLI-03, DATA-08, DATA-09
**Success Criteria** (what must be TRUE):
  1. User can run `gitsneak <repo-url>` and see the command is accepted
  2. User sees progress indication during network operations
  3. User receives clear error messages when something fails (invalid URL, network error)
  4. Repeated runs for the same users hit local cache instead of GitHub
  5. Tool respects rate limits with automatic backoff (no IP blocks)
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Project setup, TypeScript config, CLI skeleton with all flags
- [x] 01-02-PLAN.md — HTTP client with retry logic, SQLite caching, end-to-end wiring

### Phase 2: Data Collection
**Goal**: Tool extracts all relevant contributors from a repository including commit authors, PR participants, and issue participants
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07
**Success Criteria** (what must be TRUE):
  1. User sees contributors from commits, merged/active PRs, and issues
  2. PR reviewers are captured alongside PR authors
  3. Issue commenters are captured alongside issue authors
  4. Large repositories with 100+ contributors show all results (pagination works)
  5. User can filter to recent activity (e.g., last 12 months)
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Types, utilities (bots, emails, dates), and commit collector with cursor pagination
- [x] 02-02-PLAN.md — PR collector (authors + reviewers) and issue collector (authors + commenters)
- [x] 02-03-PLAN.md — Orchestrator, profile fetching, CLI integration with --since and progress

### Phase 3: Organization Intelligence
**Goal**: Tool identifies organizational affiliations for contributors using multiple detection methods
**Depends on**: Phase 2
**Requirements**: ORG-01, ORG-02, ORG-03, ORG-04, ORG-05, ORG-06
**Success Criteria** (what must be TRUE):
  1. User sees company affiliations extracted from GitHub profile company field
  2. Public GitHub organization memberships are detected when company field is empty
  3. Commit email domains provide fallback affiliation (excluding generic providers)
  4. Duplicate organizations are normalized (e.g., "Google" and "Google LLC" merge)
  5. Each affiliation shows a confidence indicator (high/medium/low)
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Organization types, email parser with tldts, blocklist, normalizer, and alias mappings
- [x] 03-02-PLAN.md — Confidence scoring, case-insensitive deduplication, OrganizationDetector, and collector integration

### Phase 4: Output & Reporting
**Goal**: Tool produces actionable business development reports ranking organizations by their investment in the repository
**Depends on**: Phase 3
**Requirements**: OUT-01, OUT-02, OUT-03, OUT-04, OUT-05
**Success Criteria** (what must be TRUE):
  1. User sees a Rich ASCII table in terminal ranking organizations by involvement
  2. User can generate an HTML report that opens in browser with interactive visualization
  3. Rankings reflect weighted activity (heavy contributors rank higher than drive-by participants)
  4. User can analyze multiple repositories and see aggregated cross-repo results
  5. Report shows breakdown by contribution type (commits, PRs, issues)
**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — Weighted scoring, organization aggregation, and ASCII table output
- [ ] 04-02-PLAN.md — HTML report generation with Chart.js visualization and --html flag

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-02-11 |
| 2. Data Collection | 3/3 | Complete | 2026-02-12 |
| 3. Organization Intelligence | 2/2 | Complete | 2026-02-12 |
| 4. Output & Reporting | 0/2 | Not started | - |
