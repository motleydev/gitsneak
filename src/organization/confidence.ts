/**
 * Confidence scoring for organization affiliation detection
 *
 * Per CONTEXT.md:
 * - HIGH: Company field explicitly set OR verified org membership
 * - MEDIUM: Email domain match (corporate)
 * - LOW: Weak inference only (bio mentions, repo ownership patterns)
 */

import type { ConfidenceLevel, SignalSource } from './types.js';

/**
 * Confidence level numeric values for comparison
 */
const CONFIDENCE_ORDER: Record<ConfidenceLevel, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Assign confidence level based on signal source
 *
 * @param source - Source of the organization signal
 * @returns Confidence level for that source
 *
 * @example
 * assignConfidence('company')  // 'HIGH'
 * assignConfidence('org')      // 'HIGH'
 * assignConfidence('email')    // 'MEDIUM'
 */
export function assignConfidence(source: SignalSource): ConfidenceLevel {
  switch (source) {
    case 'company':
      // Company field explicitly set by user
      return 'HIGH';
    case 'org':
      // Public org membership = verified affiliation
      return 'HIGH';
    case 'email':
      // Email domain match = likely but not verified
      return 'MEDIUM';
    default:
      // Unknown source defaults to LOW
      return 'LOW';
  }
}

/**
 * Compare two confidence levels
 *
 * @param a - First confidence level
 * @param b - Second confidence level
 * @returns Positive if a > b, negative if a < b, 0 if equal
 *
 * @example
 * compareConfidence('HIGH', 'MEDIUM')  // 1 (positive)
 * compareConfidence('MEDIUM', 'HIGH')  // -1 (negative)
 * compareConfidence('HIGH', 'HIGH')    // 0
 */
export function compareConfidence(a: ConfidenceLevel, b: ConfidenceLevel): number {
  return CONFIDENCE_ORDER[a] - CONFIDENCE_ORDER[b];
}

/**
 * Return the higher of two confidence levels
 *
 * Per CONTEXT.md: "When signals conflict, keep highest confidence"
 *
 * @param a - First confidence level
 * @param b - Second confidence level
 * @returns The higher confidence level
 *
 * @example
 * higherConfidence('HIGH', 'MEDIUM')  // 'HIGH'
 * higherConfidence('LOW', 'MEDIUM')   // 'MEDIUM'
 * higherConfidence('HIGH', 'HIGH')    // 'HIGH'
 */
export function higherConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_ORDER[a] >= CONFIDENCE_ORDER[b] ? a : b;
}
