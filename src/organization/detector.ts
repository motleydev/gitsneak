/**
 * Organization Detector
 *
 * Combines all detection methods (company field, org membership, email domain)
 * to build deduplicated organization affiliations with confidence scores.
 *
 * Per CONTEXT.md:
 * - Collect ALL signals first (not sequential short-circuit)
 * - Show all detected affiliations per contributor with confidence levels
 * - When signals conflict, keep highest confidence
 * - Duplicate orgs normalized via case-insensitive matching
 */

import { extractOrgFromEmail } from './email-parser.js';
import { normalizeCompanyField } from './normalizer.js';
import { resolveAlias } from './aliases.js';
import { assignConfidence, higherConfidence, compareConfidence } from './confidence.js';
import { CaseInsensitiveOrgMap } from './case-insensitive-map.js';
import type { UserProfile } from '../collectors/profiles.js';
import type {
  OrganizationSignal,
  OrganizationAffiliation,
  DetectionResult,
  SignalSource,
  ConfidenceLevel,
} from './types.js';

/**
 * Internal structure for tracking merged signals during deduplication
 */
interface MergedSignal {
  name: string;
  confidence: ConfidenceLevel;
  sources: Set<SignalSource>;
}

/**
 * Main organization detector
 *
 * Detects organization affiliations from multiple sources:
 * - Company field in GitHub profile (HIGH confidence)
 * - Public org memberships (HIGH confidence)
 * - Commit email domains (MEDIUM confidence)
 *
 * @example
 * const detector = new OrganizationDetector();
 * const result = detector.detectForContributor(profile, emails);
 * // result.affiliations = [{ name: 'Microsoft', confidence: 'HIGH', sources: ['company'] }]
 */
export class OrganizationDetector {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[OrganizationDetector] ${message}`);
    }
  }

  /**
   * Detect organization affiliations for a single contributor
   *
   * @param profile - User profile with company and org fields
   * @param emails - Set of commit emails for this contributor
   * @returns DetectionResult with affiliations and primary org
   */
  detectForContributor(profile: UserProfile, emails: Set<string>): DetectionResult {
    this.log(`Detecting for ${profile.username}...`);

    // Step 1: Collect all signals
    const signals: OrganizationSignal[] = [];

    // Company field signal (HIGH confidence)
    if (profile.company) {
      const normalized = normalizeCompanyField(profile.company);
      if (normalized) {
        const resolved = resolveAlias(normalized);
        signals.push({
          name: resolved,
          source: 'company',
          confidence: assignConfidence('company'),
        });
        this.log(`  Company signal: ${resolved} (HIGH)`);
      }
    }

    // Org membership signals (HIGH confidence)
    for (const org of profile.orgs) {
      const resolved = resolveAlias(org);
      signals.push({
        name: resolved,
        source: 'org',
        confidence: assignConfidence('org'),
      });
      this.log(`  Org signal: ${resolved} (HIGH)`);
    }

    // Email domain signals (MEDIUM confidence)
    for (const email of emails) {
      const orgFromEmail = extractOrgFromEmail(email);
      if (orgFromEmail) {
        const resolved = resolveAlias(orgFromEmail);
        signals.push({
          name: resolved,
          source: 'email',
          confidence: assignConfidence('email'),
        });
        this.log(`  Email signal: ${resolved} from ${email} (MEDIUM)`);
      }
    }

    // Step 2: Deduplicate using case-insensitive map
    const deduped = new CaseInsensitiveOrgMap<MergedSignal>();

    for (const signal of signals) {
      const existing = deduped.get(signal.name);

      if (existing) {
        // Merge: keep highest confidence, combine sources
        existing.confidence = higherConfidence(existing.confidence, signal.confidence);
        existing.sources.add(signal.source);
        // Prefer 'company' canonical name if it provided signal
        if (signal.source === 'company') {
          existing.name = signal.name;
        }
      } else {
        // New entry
        deduped.set(signal.name, {
          name: signal.name,
          confidence: signal.confidence,
          sources: new Set([signal.source]),
        });
      }
    }

    // Step 3: Build affiliations array
    const affiliations: OrganizationAffiliation[] = [];

    for (const [, merged] of deduped.entriesWithCanonicalKeys()) {
      affiliations.push({
        name: merged.name,
        confidence: merged.confidence,
        sources: Array.from(merged.sources),
      });
    }

    // Step 4: Sort by confidence (HIGH first), then alphabetically
    affiliations.sort((a, b) => {
      const confDiff = compareConfidence(b.confidence, a.confidence);
      if (confDiff !== 0) return confDiff;
      return a.name.localeCompare(b.name);
    });

    // Step 5: Determine primary org
    // Prefer company field signal as primary, otherwise first HIGH, otherwise first
    let primaryOrg: string | null = null;

    // Look for company source first
    const companyAffiliation = affiliations.find((a) => a.sources.includes('company'));
    if (companyAffiliation) {
      primaryOrg = companyAffiliation.name;
    } else if (affiliations.length > 0) {
      // First HIGH confidence or just first
      const highConfidence = affiliations.find((a) => a.confidence === 'HIGH');
      primaryOrg = highConfidence?.name ?? affiliations[0].name;
    }

    this.log(`  Found ${affiliations.length} affiliations, primary: ${primaryOrg ?? 'none'}`);

    return {
      affiliations,
      primaryOrg,
    };
  }

  /**
   * Detect organization affiliations for multiple contributors
   *
   * @param profiles - Map of username to UserProfile
   * @param activityMap - Map of username to ContributorActivity (for emails)
   * @returns Map of username to DetectionResult
   */
  detectForContributors(
    profiles: Map<string, UserProfile>,
    activityMap: Map<string, { emails: Set<string> }>
  ): Map<string, DetectionResult> {
    const results = new Map<string, DetectionResult>();

    for (const [username, profile] of profiles) {
      const activity = activityMap.get(username);
      const emails = activity?.emails ?? new Set<string>();
      const result = this.detectForContributor(profile, emails);
      results.set(username, result);
    }

    return results;
  }
}

/**
 * Convenience function for single-contributor detection
 *
 * @param profile - User profile to detect affiliations for
 * @param emails - Set of commit emails
 * @returns DetectionResult with affiliations and primary org
 *
 * @example
 * const result = detectOrganizations(profile, new Set(['user@stripe.com']));
 */
export function detectOrganizations(
  profile: UserProfile,
  emails: Set<string>
): DetectionResult {
  const detector = new OrganizationDetector();
  return detector.detectForContributor(profile, emails);
}
