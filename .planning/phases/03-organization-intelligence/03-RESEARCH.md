# Phase 3: Organization Intelligence - Research

**Researched:** 2026-02-12
**Domain:** Organization detection and normalization from contributor profiles
**Confidence:** HIGH

## Summary

This phase implements organization detection from contributor profiles using multiple signal types: company field, GitHub organization memberships, and commit email domains. Each detection method requires different parsing and confidence scoring based on the user's locked decisions in CONTEXT.md.

The core technical challenges are:
1. **Email domain extraction**: Converting email addresses to organization names while handling subdomains correctly
2. **Organization normalization**: Case-insensitive deduplication with company alias mapping
3. **Confidence scoring**: Assigning HIGH/MEDIUM/LOW based on signal strength
4. **Personal domain detection**: Filtering out vanity domains that don't indicate corporate affiliation

The existing codebase already collects the raw data (company field, orgs array, emails Set) in Phase 2's ProfileFetcher and ContributorActivity types. This phase adds the intelligence layer that interprets that data.

**Primary recommendation:** Use tldts library for email domain parsing (handles subdomains correctly), implement case-insensitive Map wrapper for normalization, build confidence scoring as a pure function over detection results.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Normalization Rules:**
- Keep legal suffixes (Inc, LLC, Ltd, GmbH, Corp) - do not strip
- Strip @ prefix only (don't look up org) - '@google' becomes 'google'
- Case-insensitive matching - 'GOOGLE', 'Google', 'google' merge into one entry
- Ship built-in alias list for major company rebrandings (Meta/Facebook, Alphabet/Google, etc.)

**Confidence Scoring:**
- **HIGH:** Company field explicitly set OR verified org membership (any single strong signal)
- **MEDIUM:** Email domain match (corporate) OR unconfirmed org membership
- **LOW:** Weak inference only (bio mentions, repo ownership patterns)
- When signals conflict, company field wins - trust explicit profile over inferred

**Email Domain Handling:**
- Exclude free providers: gmail.com, outlook.com, yahoo.com, hotmail.com
- Exclude privacy domains: protonmail.com, tutanota.com, users.noreply.github.com
- Strip TLD and capitalize: 'user@stripe.com' -> 'Stripe'
- Use root domain for subdomains: 'cloud.google.com' -> 'Google'
- Detect and exclude likely personal domains (single-user vanity domains)

**Detection Priority:**
- Collect all signals first, then rank by confidence (not sequential short-circuit)
- Show all detected affiliations per contributor with their confidence levels
- For org-level rollup: count contributor fully toward each affiliated org
- 'Unknown' is a valid category - contributors with no detection grouped together

### Claude's Discretion
- Exact list of free/privacy email domains to exclude
- Personal domain detection heuristics
- Specific company alias mappings beyond major examples
- Implementation of confidence scoring logic

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tldts | ^7.0.23 | Parse email domains and extract root domain | Fastest JS library for domain parsing, handles subdomains correctly, TypeScript native, uses public suffix list |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All other functionality can be implemented with standard TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tldts | extract-domain | tldts is faster, has better TypeScript support, and handles edge cases like co.uk properly |
| tldts | regex parsing | Manual parsing fails on complex TLDs like .co.uk, .com.au; tldts uses maintained public suffix list |
| Custom fuzzy matching | fuzzyset.js or string-similarity | Not needed per CONTEXT.md - case-insensitive matching only, no fuzzy matching required |

**Installation:**
```bash
npm install tldts
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  organization/
    detector.ts       # Main OrganizationDetector class
    normalizer.ts     # CaseInsensitiveOrgMap and normalization logic
    email-parser.ts   # Email domain extraction using tldts
    confidence.ts     # Confidence level assignment
    aliases.ts        # Company alias mappings (Meta/Facebook, etc.)
    blocklist.ts      # Free/privacy email domain blocklist
    types.ts          # OrganizationAffiliation, ConfidenceLevel types
```

### Pattern 1: Signal Collection Before Scoring
**What:** Collect all organization signals from all sources, then score and deduplicate
**When to use:** Always - per CONTEXT.md "Collect all signals first, then rank by confidence"
**Example:**
```typescript
// Source: CONTEXT.md decision
interface OrganizationSignal {
  name: string;          // Raw organization name
  source: 'company' | 'org' | 'email';
  confidence: ConfidenceLevel;
}

function detectOrganizations(
  profile: UserProfile,
  emails: Set<string>
): OrganizationAffiliation[] {
  const signals: OrganizationSignal[] = [];

  // Collect from company field (HIGH confidence)
  if (profile.company) {
    signals.push({
      name: normalizeCompanyField(profile.company),
      source: 'company',
      confidence: 'HIGH'
    });
  }

  // Collect from org memberships (HIGH confidence for verified)
  for (const org of profile.orgs) {
    signals.push({
      name: org,
      source: 'org',
      confidence: 'HIGH'  // Public membership = verified
    });
  }

  // Collect from email domains (MEDIUM confidence)
  for (const email of emails) {
    const orgName = extractOrgFromEmail(email);
    if (orgName) {
      signals.push({
        name: orgName,
        source: 'email',
        confidence: 'MEDIUM'
      });
    }
  }

  // Normalize and deduplicate, keeping highest confidence
  return normalizeSignals(signals);
}
```

### Pattern 2: Case-Insensitive Organization Map
**What:** Custom Map that normalizes keys to lowercase for deduplication
**When to use:** Merging organizations across contributors for rollup
**Example:**
```typescript
// Source: TypeScript pattern for case-insensitive maps
class CaseInsensitiveOrgMap<V> extends Map<string, V> {
  private normalizeKey(key: string): string {
    return key.toLowerCase().trim();
  }

  set(key: string, value: V): this {
    return super.set(this.normalizeKey(key), value);
  }

  get(key: string): V | undefined {
    return super.get(this.normalizeKey(key));
  }

  has(key: string): boolean {
    return super.has(this.normalizeKey(key));
  }
}
```

### Pattern 3: Domain Extraction with tldts
**What:** Extract organization name from email using public suffix list
**When to use:** Processing commit emails for organization detection
**Example:**
```typescript
// Source: tldts GitHub README
import { parse } from 'tldts';

function extractOrgFromEmail(email: string): string | null {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return null;

  const domain = email.slice(atIndex + 1);

  // Check blocklist first
  if (isBlockedDomain(domain)) return null;

  // Parse to get domain without suffix
  const parsed = parse(domain);
  if (!parsed.domainWithoutSuffix) return null;

  // Capitalize first letter
  const org = parsed.domainWithoutSuffix;
  return org.charAt(0).toUpperCase() + org.slice(1);
}

// Example: 'user@cloud.google.com'
// parsed.domainWithoutSuffix = 'google'
// Returns: 'Google'
```

### Anti-Patterns to Avoid
- **Stripping legal suffixes:** CONTEXT.md explicitly says keep Inc, LLC, Ltd, etc.
- **Sequential short-circuit:** Don't stop at first detection; collect ALL signals
- **Fuzzy matching:** Not required per CONTEXT.md; case-insensitive only
- **Regex-based TLD parsing:** Will fail on complex TLDs like .co.uk; use tldts

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email domain extraction | Regex splitting on @ | tldts library | Public suffix list handles .co.uk, .com.au correctly |
| Subdomain handling | Manual subdomain parsing | tldts.parse().domainWithoutSuffix | Correctly extracts root domain from any subdomain depth |
| TLD removal | Regex to strip .com | tldts.parse().domainWithoutSuffix | Handles 1500+ public suffixes including private domains |

**Key insight:** Domain parsing seems simple but has edge cases (co.uk, com.au, private suffixes like s3.amazonaws.com). The tldts library maintains the public suffix list and handles all cases correctly.

## Common Pitfalls

### Pitfall 1: Incorrect Subdomain Handling
**What goes wrong:** Parsing 'user@cloud.google.com' extracts 'cloud' instead of 'google'
**Why it happens:** Naive splitting on dots without understanding TLD structure
**How to avoid:** Use tldts which knows 'cloud.google.com' has root domain 'google.com'
**Warning signs:** Organizations like 'Mail', 'Cloud', 'Api' appearing in results

### Pitfall 2: Case Sensitivity in Deduplication
**What goes wrong:** 'Google', 'GOOGLE', 'google' appear as separate organizations
**Why it happens:** Using plain Map/Set for organization storage
**How to avoid:** Normalize to lowercase before any storage/lookup operations
**Warning signs:** Same company appearing multiple times in output with different casing

### Pitfall 3: Not Handling @ Prefix
**What goes wrong:** '@microsoft' stored as organization name instead of 'Microsoft'
**Why it happens:** GitHub company field often prefixed with @ for org links
**How to avoid:** Strip leading @ in company field normalization
**Warning signs:** Organizations starting with '@' in output

### Pitfall 4: Mixing Confidence Levels Incorrectly
**What goes wrong:** Email-derived org overwrites company-field org for same company
**Why it happens:** Not preserving highest confidence level during deduplication
**How to avoid:** When merging signals, always keep the highest confidence level
**Warning signs:** Contributors with explicit company field showing MEDIUM confidence

### Pitfall 5: Personal Domain False Positives
**What goes wrong:** 'johndoe.com' appears as organization 'Johndoe'
**Why it happens:** No heuristics for personal/vanity domains
**How to avoid:** Implement personal domain detection (see Open Questions)
**Warning signs:** Many single-person "organizations" in results

## Code Examples

### Email Domain Extraction (Complete)
```typescript
// Source: tldts documentation + CONTEXT.md requirements
import { parse } from 'tldts';
import { BLOCKED_DOMAINS } from './blocklist.js';

export function extractOrgFromEmail(email: string): string | null {
  if (!email) return null;

  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return null;

  const domain = email.slice(atIndex + 1).toLowerCase();

  // Check blocklist (free providers, privacy domains)
  if (BLOCKED_DOMAINS.has(domain)) return null;

  // Parse domain
  const parsed = parse(domain);

  // domainWithoutSuffix extracts 'google' from 'cloud.google.com'
  if (!parsed.domainWithoutSuffix) return null;

  // Capitalize: 'google' -> 'Google'
  const org = parsed.domainWithoutSuffix;
  return org.charAt(0).toUpperCase() + org.slice(1).toLowerCase();
}
```

### Company Field Normalization
```typescript
// Source: CONTEXT.md requirements
export function normalizeCompanyField(company: string): string {
  if (!company) return '';

  let normalized = company.trim();

  // Strip @ prefix only (CONTEXT.md: '@google' -> 'google')
  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1);
  }

  // Keep legal suffixes per CONTEXT.md decision
  // Just clean up whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}
```

### Company Alias Mapping
```typescript
// Source: CONTEXT.md requirement for major rebrandings
export const COMPANY_ALIASES: Map<string, string> = new Map([
  // Meta/Facebook family
  ['facebook', 'Meta'],
  ['instagram', 'Meta'],
  ['whatsapp', 'Meta'],
  ['oculus', 'Meta'],

  // Alphabet/Google family
  ['google', 'Alphabet'],
  ['youtube', 'Alphabet'],
  ['deepmind', 'Alphabet'],
  ['waymo', 'Alphabet'],

  // Other notable rebrandings
  ['twitter', 'X'],
  ['square', 'Block'],
]);

export function resolveAlias(orgName: string): string {
  const lowered = orgName.toLowerCase();
  return COMPANY_ALIASES.get(lowered) || orgName;
}
```

### Blocked Domains List
```typescript
// Source: CONTEXT.md + comprehensive free provider list
export const BLOCKED_DOMAINS = new Set<string>([
  // Free providers
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'mail.com',
  'email.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'fastmail.com',
  'fastmail.fm',
  'gmx.com',
  'gmx.net',

  // Privacy providers
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'tutamail.com',
  'pm.me',

  // GitHub noreply
  'users.noreply.github.com',
]);
```

### Confidence Assignment
```typescript
// Source: CONTEXT.md confidence scoring rules
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OrganizationAffiliation {
  name: string;
  confidence: ConfidenceLevel;
  sources: Array<'company' | 'org' | 'email'>;
}

export function assignConfidence(
  source: 'company' | 'org' | 'email'
): ConfidenceLevel {
  // CONTEXT.md: Company field explicitly set OR verified org membership = HIGH
  if (source === 'company') return 'HIGH';
  if (source === 'org') return 'HIGH';  // Public org membership = verified

  // CONTEXT.md: Email domain match = MEDIUM
  if (source === 'email') return 'MEDIUM';

  return 'LOW';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex TLD stripping | Public suffix list via tldts | 2020+ | Correct handling of .co.uk, .com.au, etc. |
| Strip all legal suffixes | Keep legal suffixes per context | This project | "Google Inc" stays as-is, not "Google" |
| First-match wins | Collect all signals | This project | Shows all affiliations with confidence |

**Deprecated/outdated:**
- tldjs: Predecessor to tldts, less actively maintained
- Manual TLD lists: Cannot keep up with new TLDs

## Open Questions

1. **Personal Domain Detection**
   - What we know: Need to filter vanity domains like 'johndoe.com'
   - What's unclear: Exact heuristics (single-user detection not possible without API calls)
   - Recommendation: Use domain age/popularity heuristics OR accept false positives and let output consumer filter. Simple approach: domains matching common name patterns (firstname-lastname.com) could be flagged.

2. **Alias Mapping Completeness**
   - What we know: Must include Meta/Facebook, Alphabet/Google per CONTEXT.md
   - What's unclear: How comprehensive to make the built-in list
   - Recommendation: Start with ~10-20 major tech company rebrandings, document that users can extend

3. **Unconfirmed Org Membership**
   - What we know: CONTEXT.md mentions "unconfirmed org membership" as MEDIUM confidence
   - What's unclear: How to distinguish confirmed vs unconfirmed from HTML scraping
   - Recommendation: Treat all public org memberships as confirmed/HIGH (they are publicly visible by user choice); MEDIUM would only apply if we detected org names from bio text, which is deferred to LOW confidence category

## Sources

### Primary (HIGH confidence)
- tldts GitHub Repository - API usage, version info, email parsing
- CONTEXT.md - User decisions constraining implementation
- Existing codebase (profiles.ts, emails.ts) - Data structures available

### Secondary (MEDIUM confidence)
- Slack Engineering Blog - Email classification pipeline pattern
- GitHub Docs - Organization membership visibility API

### Tertiary (LOW confidence)
- WebSearch results on company name normalization - General patterns, not verified with authoritative source
- GitHub Gist on email provider list - Comprehensive but age unknown

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - tldts well-documented, version verified
- Architecture: HIGH - Patterns derived from CONTEXT.md decisions
- Pitfalls: MEDIUM - Based on domain knowledge and common issues

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days - stable domain, tldts actively maintained)
