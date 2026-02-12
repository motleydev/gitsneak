import * as cheerio from 'cheerio';

const GITHUB_BASE = 'https://github.com';

/**
 * Extract cursor-based pagination URL (for commits)
 * GitHub commits use "Older" / "Newer" links with cursor parameters
 */
export function extractCursorPagination($: cheerio.CheerioAPI): string | null {
  // Look for "Older" link in pagination
  // GitHub uses various selectors, try multiple approaches
  const olderLink = $('a[rel="nofollow"]')
    .filter((_, el) => $(el).text().trim().toLowerCase().includes('older'))
    .attr('href');

  if (olderLink) {
    // Ensure full URL
    return olderLink.startsWith('http') ? olderLink : `${GITHUB_BASE}${olderLink}`;
  }

  // Alternative: look for pagination container with "Older" text
  const paginationOlder = $('a')
    .filter((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      return text === 'older' || text.includes('older commits');
    })
    .attr('href');

  if (paginationOlder) {
    return paginationOlder.startsWith('http') ? paginationOlder : `${GITHUB_BASE}${paginationOlder}`;
  }

  return null;
}

/**
 * Extract page-based pagination URL (for issues/PRs)
 * GitHub issues/PRs use traditional ?page=N pagination
 */
export function extractPagePagination($: cheerio.CheerioAPI): string | null {
  // Try next_page class first (common in older GitHub pages)
  let nextLink = $('a.next_page').attr('href');

  if (!nextLink) {
    // Try rel="next" attribute
    nextLink = $('a[rel="next"]').attr('href');
  }

  if (!nextLink) {
    // Try pagination container with "Next" text
    nextLink = $('a')
      .filter((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        const parent = $(el).parent();
        const inPagination = parent.hasClass('pagination') ||
                            parent.closest('.pagination').length > 0;
        return inPagination && (text === 'next' || text.includes('next'));
      })
      .attr('href');
  }

  if (nextLink) {
    return nextLink.startsWith('http') ? nextLink : `${GITHUB_BASE}${nextLink}`;
  }

  return null;
}

/**
 * Extract next page URL based on content type
 */
export function extractNextPage(
  $: cheerio.CheerioAPI,
  type: 'commits' | 'issues' | 'prs'
): string | null {
  if (type === 'commits') {
    return extractCursorPagination($);
  }

  // Issues and PRs use page-based pagination
  return extractPagePagination($);
}
