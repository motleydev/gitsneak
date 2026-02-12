# Phase 3: Organization Intelligence - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect and normalize organizational affiliations from contributor profiles using multiple detection methods. Each affiliation includes a confidence indicator. This phase handles detection and normalization logic — output formatting belongs to Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Normalization Rules
- Keep legal suffixes (Inc, LLC, Ltd, GmbH, Corp) — do not strip
- Strip @ prefix only (don't look up org) — '@google' becomes 'google'
- Case-insensitive matching — 'GOOGLE', 'Google', 'google' merge into one entry
- Ship built-in alias list for major company rebrandings (Meta/Facebook, Alphabet/Google, etc.)

### Confidence Scoring
- **HIGH:** Company field explicitly set OR verified org membership (any single strong signal)
- **MEDIUM:** Email domain match (corporate) OR unconfirmed org membership
- **LOW:** Weak inference only (bio mentions, repo ownership patterns)
- When signals conflict, company field wins — trust explicit profile over inferred

### Email Domain Handling
- Exclude free providers: gmail.com, outlook.com, yahoo.com, hotmail.com
- Exclude privacy domains: protonmail.com, tutanota.com, users.noreply.github.com
- Strip TLD and capitalize: 'user@stripe.com' → 'Stripe'
- Use root domain for subdomains: 'cloud.google.com' → 'Google'
- Detect and exclude likely personal domains (single-user vanity domains)

### Detection Priority
- Collect all signals first, then rank by confidence (not sequential short-circuit)
- Show all detected affiliations per contributor with their confidence levels
- For org-level rollup: count contributor fully toward each affiliated org
- 'Unknown' is a valid category — contributors with no detection grouped together

### Claude's Discretion
- Exact list of free/privacy email domains to exclude
- Personal domain detection heuristics
- Specific company alias mappings beyond major examples
- Implementation of confidence scoring logic

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-organization-intelligence*
*Context gathered: 2026-02-12*
