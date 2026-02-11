# Requirements: GitSneak

**Defined:** 2026-02-11
**Core Value:** Surface which organizations have the most skin in the game for any given GitHub repository

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### CLI Interface

- [ ] **CLI-01**: Accept one or more GitHub repository URLs as input
- [ ] **CLI-02**: Display progress indication during scraping operations
- [ ] **CLI-03**: Graceful error handling with clear messages

### Data Acquisition

- [ ] **DATA-01**: Extract repository contributors (commit authors)
- [ ] **DATA-02**: Extract pull request authors (merged/active PRs)
- [ ] **DATA-03**: Extract pull request reviewers
- [ ] **DATA-04**: Extract issue authors
- [ ] **DATA-05**: Extract issue commenters
- [ ] **DATA-06**: Handle pagination for repositories with many contributors/issues
- [ ] **DATA-07**: Filter results by time period (e.g., last 12 months)
- [ ] **DATA-08**: Cache user profile lookups locally (SQLite)
- [ ] **DATA-09**: Implement rate limiting with delays and exponential backoff

### Organization Detection

- [ ] **ORG-01**: Extract company field from user profiles
- [ ] **ORG-02**: Detect public GitHub organization memberships
- [ ] **ORG-03**: Extract organization from commit email domain
- [ ] **ORG-04**: Apply priority weighting (company > orgs > email)
- [ ] **ORG-05**: Normalize organization names (handle variations)
- [ ] **ORG-06**: Assign confidence score to each affiliation detection

### Output & Reporting

- [ ] **OUT-01**: Display Rich ASCII tables ranking organizations by involvement
- [ ] **OUT-02**: Generate HTML report with interactive visualizations
- [ ] **OUT-03**: Weight contributions by activity level (not just presence)
- [ ] **OUT-04**: Aggregate results across multiple repositories
- [ ] **OUT-05**: Show breakdown by contribution type (commits, PRs, issues)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Resilience

- **RES-01**: Resume capability for interrupted runs
- **RES-02**: GraphQL batching for bulk user lookups (performance)

### Extended Analysis

- **EXT-01**: Historical trend analysis (contribution over time)
- **EXT-02**: Contributor relationship mapping

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Direct email extraction/output | Violates GitHub Terms of Service |
| LinkedIn profile matching | Legal risk, massive implementation complexity |
| Private repository analysis | Elevated authentication requirements |
| Real-time dashboard | Overkill for CLI tool; GrimoireLab already serves this niche |
| GitLab/Bitbucket support | GitHub-only for v1; different APIs and scraping patterns |
| OAuth/token requirement | User preference for token-free operation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 1 | Pending |
| CLI-02 | Phase 1 | Pending |
| CLI-03 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| DATA-06 | Phase 2 | Pending |
| DATA-07 | Phase 2 | Pending |
| DATA-08 | Phase 1 | Pending |
| DATA-09 | Phase 1 | Pending |
| ORG-01 | Phase 3 | Pending |
| ORG-02 | Phase 3 | Pending |
| ORG-03 | Phase 3 | Pending |
| ORG-04 | Phase 3 | Pending |
| ORG-05 | Phase 3 | Pending |
| ORG-06 | Phase 3 | Pending |
| OUT-01 | Phase 4 | Pending |
| OUT-02 | Phase 4 | Pending |
| OUT-03 | Phase 4 | Pending |
| OUT-04 | Phase 4 | Pending |
| OUT-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
