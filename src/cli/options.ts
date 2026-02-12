import { subMonths, subYears, subDays, subWeeks } from 'date-fns';
import type { RepoInfo } from '../types/index.js';

/**
 * Parse a --since value into a Date
 * Accepts:
 * - ISO date: 2025-01-01
 * - Relative formats: 12m, 6mo, 1y, 2w, 30d
 *
 * @param value - The --since string value
 * @returns Date object
 * @throws Error if format is invalid
 */
export function parseSince(value: string): Date {
  // Check for ISO date format (YYYY-MM-DD)
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date: ${value}. Expected format: YYYY-MM-DD`);
    }
    return date;
  }

  // Check for relative format (number + unit)
  const relativeMatch = value.match(/^(\d+)(d|w|m|mo|y)$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();

    switch (unit) {
      case 'd':
        return subDays(now, amount);
      case 'w':
        return subWeeks(now, amount);
      case 'm':
      case 'mo':
        return subMonths(now, amount);
      case 'y':
        return subYears(now, amount);
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  throw new Error(
    `Invalid --since format: ${value}. ` +
    `Expected ISO date (2025-01-01) or relative (12m, 6mo, 1y, 2w, 30d)`
  );
}

export function parseDelay(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid delay value: ${value}. Must be a non-negative integer.`);
  }
  return parsed;
}

export function parseGitHubUrl(url: string): RepoInfo {
  // Must be full URL: https://github.com/owner/repo
  const pattern = /^https?:\/\/github\.com\/([^\/]+)\/([^\/\s#?]+)\/?$/;
  const match = url.match(pattern);

  if (!match) {
    // Check if user provided shorthand like owner/repo
    if (/^[^\/]+\/[^\/]+$/.test(url) && !url.includes(':')) {
      throw new Error(
        `Invalid GitHub URL format. Please use full URLs like https://github.com/${url}`
      );
    }
    throw new Error(
      'Invalid GitHub URL format. Expected: https://github.com/owner/repo'
    );
  }

  const [, owner, repo] = match;
  // Remove any .git suffix
  const cleanRepo = repo.replace(/\.git$/, '');

  return {
    owner,
    repo: cleanRepo,
    url: `https://github.com/${owner}/${cleanRepo}`,
  };
}
