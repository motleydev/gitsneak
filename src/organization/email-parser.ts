/**
 * Email domain parser for organization detection
 *
 * Uses tldts to correctly handle subdomains and extract root domains:
 * - cloud.google.com -> google
 * - stripe.com -> stripe
 */

import { parse } from 'tldts';
import { isBlockedDomain } from './blocklist.js';

/**
 * Extract organization name from email address
 *
 * @param email - Email address to parse
 * @returns Organization name (capitalized) or null if blocked/invalid
 *
 * @example
 * extractOrgFromEmail('user@stripe.com')  // 'Stripe'
 * extractOrgFromEmail('user@cloud.google.com')  // 'Google'
 * extractOrgFromEmail('user@gmail.com')  // null (blocked)
 * extractOrgFromEmail('')  // null (invalid)
 */
export function extractOrgFromEmail(email: string): string | null {
  // Handle empty or invalid input
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Find the @ symbol - use last one in case of unusual formats
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return null;
  }

  // Extract and lowercase the domain
  const domain = email.slice(atIndex + 1).toLowerCase();

  // Check blocklist
  if (isBlockedDomain(domain)) {
    return null;
  }

  // Use tldts to parse the domain and get the root domain without suffix
  // This handles subdomains correctly: cloud.google.com -> google
  const parsed = parse(domain);

  // domainWithoutSuffix is the root domain (e.g., 'google' from 'google.com')
  if (!parsed.domainWithoutSuffix) {
    return null;
  }

  // Capitalize first letter: 'google' -> 'Google'
  const orgName = parsed.domainWithoutSuffix.charAt(0).toUpperCase() +
    parsed.domainWithoutSuffix.slice(1);

  return orgName;
}
