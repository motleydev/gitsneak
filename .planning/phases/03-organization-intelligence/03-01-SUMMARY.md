---
phase: 03-organization-intelligence
plan: 01
subsystem: organization
tags: [tldts, email-parsing, domain-extraction, company-normalization]

# Dependency graph
requires:
  - phase: 02-data-collection
    provides: ContributorActivity type with emails Set
provides:
  - Organization type definitions (ConfidenceLevel, OrganizationSignal, OrganizationAffiliation)
  - Email domain extraction via tldts
  - Free/privacy email domain blocklist
  - Company field normalization
  - Company alias mappings for rebrandings
affects: [03-02-aggregation]

# Tech tracking
tech-stack:
  added: [tldts ^7.0.23]
  patterns: [domain extraction with subdomain handling, blocklist filtering, alias resolution]

key-files:
  created:
    - src/organization/types.ts
    - src/organization/blocklist.ts
    - src/organization/email-parser.ts
    - src/organization/normalizer.ts
    - src/organization/aliases.ts
  modified:
    - package.json
    - package-lock.json
    - src/collectors/commits.ts
    - src/collectors/issues.ts
    - src/collectors/pull-requests.ts

key-decisions:
  - "tldts for domain parsing - handles subdomains correctly (cloud.google.com -> google)"
  - "Preserve legal suffixes (Inc, LLC) per CONTEXT.md"
  - "18 company alias entries covering Meta/Alphabet/X/Block family rebrandings"

patterns-established:
  - "Email extraction: domain -> blocklist check -> tldts parse -> capitalize"
  - "Normalization: trim -> strip @ -> collapse spaces"
  - "Alias resolution: lowercase lookup, return original if no match"

# Metrics
duration: 4min
completed: 2026-02-12
---

# Phase 3 Plan 1: Organization Detection Foundation Summary

**Email domain extraction with tldts subdomain handling, 25+ provider blocklist, company normalizer preserving legal suffixes, and alias mappings for major tech rebrandings**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-12T14:49:43Z
- **Completed:** 2026-02-12T14:53:42Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Organization type system with confidence levels (HIGH/MEDIUM/LOW) per CONTEXT.md
- Email parser extracts org from domains, handling subdomains via tldts (cloud.google.com -> Google)
- Blocklist covers 25+ free/privacy email providers including GitHub noreply
- Company normalizer strips @ prefix while preserving legal suffixes (Inc, LLC, Ltd)
- Alias mappings resolve Meta/Alphabet/X/Block family names and subsidiaries

## Task Commits

Each task was committed atomically:

1. **Task 1: Install tldts and create organization types** - `408f2dc` (feat)
2. **Task 2: Create blocklist and email parser** - `540d951` (feat)
3. **Task 3: Create normalizer and alias mappings** - `8c71091` (feat)

## Files Created/Modified

**Created:**
- `src/organization/types.ts` - ConfidenceLevel, OrganizationSignal, OrganizationAffiliation, DetectionResult types
- `src/organization/blocklist.ts` - BLOCKED_DOMAINS Set and isBlockedDomain function
- `src/organization/email-parser.ts` - extractOrgFromEmail using tldts
- `src/organization/normalizer.ts` - normalizeCompanyField function
- `src/organization/aliases.ts` - COMPANY_ALIASES Map and resolveAlias function

**Modified:**
- `package.json` - Added tldts dependency
- `package-lock.json` - Lock file update
- `src/collectors/commits.ts` - Fixed Element type import from domhandler
- `src/collectors/issues.ts` - Fixed Element type import from domhandler
- `src/collectors/pull-requests.ts` - Fixed Element type import from domhandler

## Decisions Made
- Used tldts library for domain parsing - correctly handles subdomains (cloud.google.com extracts to 'google')
- Preserved legal suffixes (Inc, LLC, Ltd, GmbH, Corp) per CONTEXT.md decision
- 18 alias entries covering major rebrandings: Meta (Facebook/Instagram/WhatsApp), Alphabet (Google/YouTube/DeepMind), X (Twitter), Block (Square/CashApp)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cheerio Element type imports**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** Pre-existing TypeScript errors - cheerio.Element type doesn't exist in cheerio v1.2.0
- **Fix:** Import Element type from domhandler package (cheerio's dependency)
- **Files modified:** src/collectors/commits.ts, src/collectors/issues.ts, src/collectors/pull-requests.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 408f2dc (Task 1 commit)

**2. [Rule 1 - Bug] Fixed CommitCollector.getStartUrl signature**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** getStartUrl didn't accept since parameter per Collector interface
- **Fix:** Added optional _since parameter to match interface (unused per design - client-side filtering)
- **Files modified:** src/collectors/commits.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 408f2dc (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 pre-existing bugs)
**Impact on plan:** Both fixes resolved pre-existing issues in codebase. No scope creep.

## Issues Encountered
None - plan executed smoothly after fixing pre-existing type issues.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Organization detection primitives ready for aggregation
- Plan 03-02 can build organization detector using these modules
- All exports ready: types, blocklist, email-parser, normalizer, aliases

---
*Phase: 03-organization-intelligence*
*Completed: 2026-02-12*

## Self-Check: PASSED

All files verified:
- src/organization/types.ts - FOUND
- src/organization/blocklist.ts - FOUND
- src/organization/email-parser.ts - FOUND
- src/organization/normalizer.ts - FOUND
- src/organization/aliases.ts - FOUND

All commits verified:
- 408f2dc - FOUND
- 540d951 - FOUND
- 8c71091 - FOUND
