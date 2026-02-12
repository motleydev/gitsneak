/**
 * Organization Intelligence Module
 *
 * Detects organizational affiliations from multiple signals:
 * - GitHub profile company field (HIGH confidence)
 * - Public organization memberships (HIGH confidence)
 * - Commit email domains (MEDIUM confidence)
 *
 * Key features:
 * - Case-insensitive deduplication (Google, GOOGLE, google -> one entry)
 * - Confidence scoring per source
 * - Company alias resolution (Facebook -> Meta, Google -> Alphabet)
 * - Email domain blocklist (gmail.com, etc. excluded)
 */

// Types
export type {
  ConfidenceLevel,
  SignalSource,
  OrganizationSignal,
  OrganizationAffiliation,
  DetectionResult,
} from './types.js';

// Email parsing
export { extractOrgFromEmail } from './email-parser.js';

// Company normalization
export { normalizeCompanyField } from './normalizer.js';

// Alias resolution
export { resolveAlias, COMPANY_ALIASES } from './aliases.js';

// Domain blocklist
export { isBlockedDomain, BLOCKED_DOMAINS } from './blocklist.js';

// Confidence scoring
export {
  assignConfidence,
  compareConfidence,
  higherConfidence,
} from './confidence.js';

// Case-insensitive map
export { CaseInsensitiveOrgMap } from './case-insensitive-map.js';

// Main detector
export { OrganizationDetector, detectOrganizations } from './detector.js';
