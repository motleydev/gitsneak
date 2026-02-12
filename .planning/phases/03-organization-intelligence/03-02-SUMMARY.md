---
phase: 03-organization-intelligence
plan: 02
subsystem: organization-detection
tags: [organization, confidence, deduplication, detection]
dependency-graph:
  requires:
    - 03-01 (email-parser, normalizer, aliases, blocklist, types)
  provides:
    - OrganizationDetector class for multi-signal affiliation detection
    - Confidence scoring (HIGH/MEDIUM/LOW)
    - Case-insensitive organization deduplication
    - Integration with collection pipeline
  affects:
    - ContributorActivity now includes affiliations and primaryOrg
    - CollectionResult now includes orgStats
tech-stack:
  added: []
  patterns:
    - CaseInsensitiveOrgMap extends Map for normalized key lookups
    - Signal collection -> deduplication -> sorting pattern
key-files:
  created:
    - src/organization/confidence.ts
    - src/organization/case-insensitive-map.ts
    - src/organization/detector.ts
    - src/organization/index.ts
  modified:
    - src/collectors/types.ts
    - src/collectors/index.ts
decisions:
  - "Company field prioritized as primary org when available"
  - "All signals collected first, then deduplicated (not short-circuit)"
  - "CaseInsensitiveOrgMap stores canonical casing for display"
metrics:
  duration: 4 min
  completed: 2026-02-12
---

# Phase 03 Plan 02: Organization Detection Assembly Summary

Confidence scoring with case-insensitive deduplication, combining company/org/email signals into ranked OrganizationAffiliation results.

## Changes Made

### Task 1: Confidence Scoring and Case-Insensitive Map

**Files created:**
- `src/organization/confidence.ts` - Confidence level assignment and comparison
- `src/organization/case-insensitive-map.ts` - Deduplicated Map for org names

**Key implementations:**
- `assignConfidence(source)`: company/org -> HIGH, email -> MEDIUM
- `compareConfidence(a, b)`: numeric comparison for sorting
- `higherConfidence(a, b)`: returns higher of two levels
- `CaseInsensitiveOrgMap<V>`: extends Map with normalized key lookups
  - Stores canonical casing separately for display purposes
  - Merges 'Google', 'GOOGLE', 'google' into single entry

**Commit:** `fd8ba94`

### Task 2: OrganizationDetector Class

**Files created:**
- `src/organization/detector.ts` - Main detection logic
- `src/organization/index.ts` - Module barrel export

**Key implementations:**
- `OrganizationDetector.detectForContributor(profile, emails)`:
  1. Collects all signals (company, orgs, emails)
  2. Applies alias resolution to each
  3. Deduplicates via CaseInsensitiveOrgMap
  4. Merges sources and keeps highest confidence
  5. Sorts by confidence (HIGH first), then alphabetically
  6. Returns DetectionResult with affiliations and primaryOrg
- `detectOrganizations()`: convenience function for single contributor

**Detection flow per CONTEXT.md:**
- Collect ALL signals first (not sequential short-circuit)
- Show all detected affiliations with confidence levels
- Company field preferred as primaryOrg when available

**Commit:** `aa80c4d`

### Task 3: Pipeline Integration

**Files modified:**
- `src/collectors/types.ts` - Added affiliations and primaryOrg to ContributorActivity
- `src/collectors/index.ts` - Organization detection step after profile fetching

**Key changes:**
- ContributorActivity interface extended with:
  - `affiliations?: OrganizationAffiliation[]`
  - `primaryOrg?: string | null`
- CollectionResult extended with:
  - `orgStats?: { withAffiliation: number; unknown: number }`
- Organization detection runs as step 6 in collectContributors()
- Progress callback fires for 'organizations' stage

**Commit:** `b644d07`

## Verification Results

All success criteria verified:

| Criteria | Status |
|----------|--------|
| ORG-01: Company field -> HIGH confidence | PASS |
| ORG-02: Org membership -> HIGH confidence | PASS |
| ORG-03: Email domain -> MEDIUM confidence | PASS |
| ORG-04: Priority weighting (HIGH before MEDIUM) | PASS |
| ORG-05: Case-insensitive deduplication | PASS |
| ORG-06: Confidence scores on all affiliations | PASS |
| Unknown category (empty affiliations) | PASS |

**Live test on sindresorhus/p-retry:**
- 5 contributors detected
- 5 with affiliations, 0 unknown
- Proper alias resolution (facebook -> Meta, google -> Alphabet)
- Multiple org memberships correctly detected

## Deviations from Plan

None - plan executed exactly as written.

## Output Artifacts

```
src/organization/
  confidence.ts      - Confidence level assignment
  case-insensitive-map.ts - Deduplication Map
  detector.ts        - Main OrganizationDetector class
  index.ts           - Module barrel export (all organization/)

src/collectors/
  types.ts           - ContributorActivity with affiliations
  index.ts           - Organization detection integrated
```

## Self-Check: PASSED

**Files exist:**
- FOUND: src/organization/confidence.ts
- FOUND: src/organization/case-insensitive-map.ts
- FOUND: src/organization/detector.ts
- FOUND: src/organization/index.ts

**Commits exist:**
- FOUND: fd8ba94
- FOUND: aa80c4d
- FOUND: b644d07
