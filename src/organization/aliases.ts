/**
 * Company alias mappings for major rebrandings
 *
 * Maps subsidiary names and old company names to canonical parent names.
 * Used to consolidate organization signals across different naming conventions.
 */

/**
 * Map of lowercase company names to canonical organization names
 *
 * Keys are lowercase for case-insensitive lookup.
 * Values are canonical names (proper capitalization).
 */
export const COMPANY_ALIASES: Map<string, string> = new Map([
  // Meta family (Facebook rebranding 2021)
  ['facebook', 'Meta'],
  ['fb', 'Meta'],
  ['instagram', 'Meta'],
  ['whatsapp', 'Meta'],
  ['oculus', 'Meta'],
  ['meta', 'Meta'],

  // Alphabet family (Google reorg 2015)
  ['google', 'Alphabet'],
  ['googl', 'Alphabet'],  // Stock ticker used in some contexts
  ['youtube', 'Alphabet'],
  ['deepmind', 'Alphabet'],
  ['waymo', 'Alphabet'],
  ['verily', 'Alphabet'],
  ['alphabet', 'Alphabet'],

  // X Corp (Twitter rebranding 2023)
  ['twitter', 'X'],
  ['x', 'X'],

  // Block Inc (Square rebranding 2021)
  ['square', 'Block'],
  ['block', 'Block'],
  ['cashapp', 'Block'],
  ['cash app', 'Block'],
]);

/**
 * Resolve a company name to its canonical alias
 *
 * @param orgName - Organization name to look up
 * @returns Canonical name if alias exists, otherwise original name unchanged
 *
 * @example
 * resolveAlias('facebook')  // 'Meta'
 * resolveAlias('GOOGLE')    // 'Alphabet'
 * resolveAlias('Microsoft') // 'Microsoft' (no alias, returned unchanged)
 * resolveAlias('stripe')    // 'stripe' (no alias, returned unchanged)
 */
export function resolveAlias(orgName: string): string {
  const lowered = orgName.toLowerCase();
  return COMPANY_ALIASES.get(lowered) ?? orgName;
}
