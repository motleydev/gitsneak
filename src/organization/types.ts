/**
 * Confidence level for organization affiliation detection
 *
 * HIGH: Company field explicitly set OR verified org membership
 * MEDIUM: Email domain match (corporate)
 * LOW: Weak inference only (bio mentions, repo ownership patterns)
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Source of organization signal
 */
export type SignalSource = 'company' | 'org' | 'email';

/**
 * A single signal indicating organization affiliation
 */
export interface OrganizationSignal {
  name: string;
  source: SignalSource;
  confidence: ConfidenceLevel;
}

/**
 * Aggregated organization affiliation with combined sources
 */
export interface OrganizationAffiliation {
  name: string;
  confidence: ConfidenceLevel;
  sources: SignalSource[];
}

/**
 * Result of organization detection for a contributor
 */
export interface DetectionResult {
  affiliations: OrganizationAffiliation[];
  primaryOrg: string | null;
}
