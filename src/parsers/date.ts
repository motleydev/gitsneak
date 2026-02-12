import { parseISO, isAfter, subMonths } from 'date-fns';

/**
 * Parse a GitHub date string into a Date object
 * GitHub typically uses ISO 8601 format: 2024-01-15T10:30:00Z
 */
export function parseGitHubDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date(0); // Return epoch if empty
  }

  try {
    return parseISO(dateStr);
  } catch {
    // Fallback for unexpected formats
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date(0) : date;
  }
}

/**
 * Check if a date is within the activity window (after the since date)
 */
export function isWithinWindow(date: Date, since: Date): boolean {
  return isAfter(date, since);
}

/**
 * Get the default "since" date (12 months ago)
 */
export function getDefaultSince(): Date {
  return subMonths(new Date(), 12);
}
