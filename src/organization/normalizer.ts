/**
 * Company field normalizer
 *
 * Handles common formatting issues in GitHub company field:
 * - Strips leading @ prefix (GitHub's convention for linking)
 * - Preserves legal suffixes (Inc, LLC, Ltd, GmbH, Corp)
 * - Collapses multiple spaces
 */

/**
 * Normalize a company field value
 *
 * @param company - Raw company field from GitHub profile
 * @returns Normalized company name, or empty string if falsy
 *
 * @example
 * normalizeCompanyField('@google')        // 'google'
 * normalizeCompanyField('Google Inc')     // 'Google Inc' (suffix preserved)
 * normalizeCompanyField('  Some Company LLC  ')  // 'Some Company LLC'
 * normalizeCompanyField('')               // ''
 */
export function normalizeCompanyField(company: string): string {
  // Handle falsy input
  if (!company) {
    return '';
  }

  // Trim whitespace
  let normalized = company.trim();

  // Strip leading @ only (per CONTEXT.md: '@google' -> 'google')
  if (normalized.startsWith('@')) {
    normalized = normalized.slice(1);
  }

  // Collapse multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Note: Legal suffixes (Inc, LLC, Ltd, GmbH, Corp) are preserved
  // per CONTEXT.md decision - they provide useful disambiguation

  return normalized;
}
