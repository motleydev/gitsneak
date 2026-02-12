/**
 * Blocklist of email domains to exclude from organization detection
 *
 * These domains belong to free/privacy email providers or GitHub's own
 * noreply addresses - they don't indicate organizational affiliation.
 */

/**
 * Set of blocked email domains (lowercase)
 */
export const BLOCKED_DOMAINS: Set<string> = new Set([
  // Free providers - Google
  'gmail.com',
  'googlemail.com',

  // Free providers - Yahoo
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',

  // Free providers - Microsoft
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',

  // Free providers - Apple
  'icloud.com',
  'me.com',
  'mac.com',

  // Free providers - Other
  'aol.com',
  'mail.com',
  'email.com',
  'zoho.com',
  'gmx.com',
  'gmx.net',

  // Free providers - International
  'yandex.com',
  'yandex.ru',
  'mail.ru',

  // Free providers - Fastmail
  'fastmail.com',
  'fastmail.fm',

  // Privacy providers
  'protonmail.com',
  'proton.me',
  'pm.me',
  'tutanota.com',
  'tutamail.com',

  // GitHub noreply (masks real email)
  'users.noreply.github.com',
]);

/**
 * Check if an email domain is blocked
 *
 * @param domain - Email domain to check (lowercased)
 * @returns true if domain should be excluded from org detection
 */
export function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.has(domain.toLowerCase());
}
