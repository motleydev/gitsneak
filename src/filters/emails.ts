/**
 * Generic email domains that don't reveal organizational affiliation
 * These should be excluded from email capture for org detection
 */
export const GENERIC_DOMAINS = new Set<string>([
  // Google
  'gmail.com',
  'googlemail.com',

  // Yahoo
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',

  // Microsoft
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',

  // Other major providers
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',

  // Privacy-focused
  'protonmail.com',
  'proton.me',
  'tutanota.com',
  'tutamail.com',

  // Generic/misc
  'mail.com',
  'email.com',
  'zoho.com',

  // Russian providers
  'yandex.com',
  'yandex.ru',
  'mail.ru',

  // Premium providers
  'fastmail.com',
  'fastmail.fm',

  // GitHub noreply addresses
  'users.noreply.github.com',
]);

/**
 * Check if an email is from a generic domain
 * Generic emails don't reveal organizational affiliation
 */
export function isGenericEmail(email: string): boolean {
  if (!email) {
    return true; // Treat empty/null as generic (not useful)
  }

  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return true; // Invalid email format, treat as generic
  }

  const domain = email.slice(atIndex + 1).toLowerCase();
  return GENERIC_DOMAINS.has(domain);
}
