import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { format } from 'date-fns';
import type { GitHubClient } from '../scraper/client.js';
import type { Collector, CollectorResult, ContributorActivity } from './types.js';
import { createEmptyActivity } from './types.js';
import { isBot } from '../filters/bots.js';
import { parseGitHubDate, isWithinWindow } from '../parsers/date.js';
import { extractNextPage } from '../parsers/pagination.js';

/**
 * Format a date for GitHub search query
 * GitHub expects YYYY-MM-DD format
 */
function formatDateForQuery(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Collector for pull request data from GitHub repository
 * Extracts PR authors and reviewers with page-based pagination
 */
export class PullRequestCollector implements Collector {
  private client: GitHubClient;
  private verbose: boolean;

  constructor(client: GitHubClient, verbose = false) {
    this.client = client;
    this.verbose = verbose;
  }

  /**
   * Get the starting URL for merged PR collection
   * This is the primary collection target - merged PRs show real contributions
   */
  getStartUrl(owner: string, repo: string, since?: Date): string {
    let query = 'is:pr is:merged';

    if (since) {
      query += ` merged:>${formatDateForQuery(since)}`;
    }

    // URL encode the query
    const encodedQuery = encodeURIComponent(query);
    return `https://github.com/${owner}/${repo}/pulls?q=${encodedQuery}`;
  }

  /**
   * Get URL for open PRs with recent activity
   */
  getOpenPRsUrl(owner: string, repo: string, since?: Date): string {
    let query = 'is:pr is:open';

    if (since) {
      query += ` updated:>${formatDateForQuery(since)}`;
    }

    const encodedQuery = encodeURIComponent(query);
    return `https://github.com/${owner}/${repo}/pulls?q=${encodedQuery}`;
  }

  /**
   * Get URL for closed but unmerged PRs (lower weight)
   */
  getClosedUnmergedUrl(owner: string, repo: string, since?: Date): string {
    let query = 'is:pr is:closed is:unmerged';

    if (since) {
      query += ` closed:>${formatDateForQuery(since)}`;
    }

    const encodedQuery = encodeURIComponent(query);
    return `https://github.com/${owner}/${repo}/pulls?q=${encodedQuery}`;
  }

  /**
   * Collect a single page of pull requests
   * @param url - The page URL to collect
   * @param since - Optional date cutoff for activity window
   * @returns CollectorResult with contributors, next page, and count
   */
  async collectPage(url: string, since?: Date): Promise<CollectorResult> {
    const contributors = new Map<string, ContributorActivity>();
    let itemsProcessed = 0;

    if (this.verbose) {
      console.log(`[PullRequestCollector] Fetching: ${url}`);
    }

    const { html, fromCache } = await this.client.fetch(url);

    if (this.verbose) {
      console.log(`[PullRequestCollector] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
    }

    const $ = cheerio.load(html);

    // Find PR list items
    const prElements = this.findPRElements($);

    if (this.verbose) {
      console.log(`[PullRequestCollector] Found ${prElements.length} PR elements on page`);
    }

    // Collect PR URLs for detail page fetching (needed for reviewers)
    const prUrls: string[] = [];

    for (const el of prElements) {
      const prData = this.parsePRElement($, el);

      if (!prData) {
        continue;
      }

      const { username, date, prUrl } = prData;
      itemsProcessed++;

      // Check time window if since is provided
      if (since && date && !isWithinWindow(date, since)) {
        if (this.verbose) {
          console.log(`[PullRequestCollector] Skipping old PR from ${date.toISOString()}`);
        }
        continue;
      }

      // Skip bot accounts
      if (isBot(username)) {
        if (this.verbose) {
          console.log(`[PullRequestCollector] Skipping bot: ${username}`);
        }
        continue;
      }

      // Track PR URL for reviewer extraction
      if (prUrl) {
        prUrls.push(prUrl);
      }

      // Get or create contributor activity
      let activity = contributors.get(username);
      if (!activity) {
        activity = createEmptyActivity(username);
        contributors.set(username, activity);
      }

      // Update activity - PR authored
      activity.prsAuthored++;

      // Update last activity date
      if (date && date > activity.lastActivityDate) {
        activity.lastActivityDate = date;
      }
    }

    // Fetch detail pages to extract reviewers
    // This is expensive but necessary - reviewers aren't visible in list view
    for (const prUrl of prUrls) {
      await this.collectReviewersFromDetailPage(prUrl, contributors, since);
    }

    // Get next page URL
    const nextPage = extractNextPage($, 'prs');

    if (nextPage && this.verbose) {
      console.log(`[PullRequestCollector] Found next page`);
    }

    if (this.verbose) {
      console.log(`[PullRequestCollector] Page complete: ${itemsProcessed} PRs, ${contributors.size} unique contributors`);
    }

    return {
      contributors,
      nextPage,
      itemsProcessed,
    };
  }

  /**
   * Fetch PR detail page and extract reviewers
   */
  private async collectReviewersFromDetailPage(
    prUrl: string,
    contributors: Map<string, ContributorActivity>,
    since?: Date
  ): Promise<void> {
    try {
      if (this.verbose) {
        console.log(`[PullRequestCollector] Fetching PR detail: ${prUrl}`);
      }

      const { html, fromCache } = await this.client.fetch(prUrl);

      if (this.verbose) {
        console.log(`[PullRequestCollector] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
      }

      const $ = cheerio.load(html);

      // Extract reviewers from the sidebar or review timeline
      const reviewers = this.extractReviewers($);

      for (const reviewer of reviewers) {
        if (isBot(reviewer)) {
          if (this.verbose) {
            console.log(`[PullRequestCollector] Skipping bot reviewer: ${reviewer}`);
          }
          continue;
        }

        // Get or create contributor activity
        let activity = contributors.get(reviewer);
        if (!activity) {
          activity = createEmptyActivity(reviewer);
          contributors.set(reviewer, activity);
        }

        // Update activity - PR reviewed
        activity.prsReviewed++;
      }
    } catch (error) {
      if (this.verbose) {
        console.log(`[PullRequestCollector] Failed to fetch PR detail page: ${prUrl}`);
      }
      // Continue processing other PRs even if one fails
    }
  }

  /**
   * Find PR elements in the page using multiple selector strategies
   */
  private findPRElements($: cheerio.CheerioAPI): Element[] {
    // Strategy 1: Issue/PR list items with data attribute
    let items = $('[data-id]').filter((_, el) => {
      const $el = $(el);
      return $el.find('a[data-hovercard-type="pull_request"]').length > 0 ||
             $el.find('.opened-by').length > 0;
    }).toArray();

    if (items.length > 0) {
      return items;
    }

    // Strategy 2: Box-row elements (common in GitHub lists)
    items = $('.Box-row').toArray();
    if (items.length > 0) {
      return items;
    }

    // Strategy 3: Issue-row class
    items = $('.issue-row, .js-issue-row').toArray();
    if (items.length > 0) {
      return items;
    }

    // Strategy 4: Look for list items containing PR links
    items = $('div:has(a[href*="/pull/"])').filter((_, el) => {
      // Only keep top-level containers, not nested children
      const $el = $(el);
      return $el.find('.opened-by, .text-small, relative-time').length > 0;
    }).toArray();

    if (this.verbose && items.length === 0) {
      console.log('[PullRequestCollector] Warning: Could not find PR elements on page');
    }

    return items;
  }

  /**
   * Parse a PR element to extract author info and PR URL
   */
  private parsePRElement(
    $: cheerio.CheerioAPI,
    el: Element
  ): { username: string; date: Date | null; prUrl: string | null } | null {
    const $el = $(el);

    // Extract username from author link
    let username: string | null = null;

    // Strategy 1: opened-by link (common pattern)
    const openedByLink = $el.find('.opened-by a').first();
    if (openedByLink.length > 0) {
      username = openedByLink.text().trim();
    }

    // Strategy 2: User hovercard link
    if (!username) {
      const userLink = $el.find('a[data-hovercard-type="user"]').first();
      if (userLink.length > 0) {
        const href = userLink.attr('href');
        if (href) {
          const match = href.match(/^\/([^/]+)$/);
          if (match) {
            username = match[1];
          }
        }
      }
    }

    // Strategy 3: Text pattern "opened by username"
    if (!username) {
      const textContent = $el.text();
      const openedByMatch = textContent.match(/opened\s+(?:by\s+)?([a-zA-Z0-9][-a-zA-Z0-9]*)/i);
      if (openedByMatch) {
        username = openedByMatch[1];
      }
    }

    if (!username) {
      if (this.verbose) {
        console.log('[PullRequestCollector] Could not extract username from PR element');
      }
      return null;
    }

    // Extract date from relative-time element
    let date: Date | null = null;
    const timeEl = $el.find('relative-time').first();
    if (timeEl.length > 0) {
      const datetime = timeEl.attr('datetime');
      if (datetime) {
        date = parseGitHubDate(datetime);
      }
    }

    // Extract PR URL for detail page fetching
    let prUrl: string | null = null;
    const prLink = $el.find('a[href*="/pull/"]').first();
    if (prLink.length > 0) {
      const href = prLink.attr('href');
      if (href) {
        prUrl = href.startsWith('http') ? href : `https://github.com${href}`;
      }
    }

    return { username, date, prUrl };
  }

  /**
   * Collect a single PR's author and reviewers from its detail page
   * Used for PR-scoped analysis
   */
  async collectSinglePR(
    owner: string,
    repo: string,
    prNumber: number,
    options: { signal?: AbortSignal } = {}
  ): Promise<{ contributors: Map<string, ContributorActivity>; author: string | null }> {
    const contributors = new Map<string, ContributorActivity>();
    const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;

    if (this.verbose) {
      console.log(`[PullRequestCollector] Fetching single PR: ${prUrl}`);
    }

    const { html, fromCache } = await this.client.fetch(prUrl);

    if (this.verbose) {
      console.log(`[PullRequestCollector] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
    }

    const $ = cheerio.load(html);

    // Extract PR author from the detail page
    let author: string | null = null;

    // Strategy 1: Author link in header
    const authorLink = $('a[data-hovercard-type="user"].author').first();
    if (authorLink.length > 0) {
      author = authorLink.text().trim();
    }

    // Strategy 2: Look for "opened this pull request" pattern
    if (!author) {
      const openedBy = $('.gh-header-meta a[data-hovercard-type="user"]').first();
      if (openedBy.length > 0) {
        const href = openedBy.attr('href');
        if (href) {
          const match = href.match(/^\/([^/]+)$/);
          if (match) {
            author = match[1];
          }
        }
      }
    }

    // Add author to contributors
    if (author && !isBot(author)) {
      const activity = createEmptyActivity(author);
      activity.prsAuthored = 1;
      activity.lastActivityDate = new Date();
      contributors.set(author, activity);
    }

    // Extract reviewers
    const reviewers = this.extractReviewers($);
    for (const reviewer of reviewers) {
      if (isBot(reviewer)) {
        continue;
      }

      // Don't double-count if reviewer is also the author
      if (reviewer === author) {
        continue;
      }

      let activity = contributors.get(reviewer);
      if (!activity) {
        activity = createEmptyActivity(reviewer);
        contributors.set(reviewer, activity);
      }
      activity.prsReviewed++;
    }

    if (this.verbose) {
      console.log(`[PullRequestCollector] Single PR: author=${author}, ${reviewers.length} reviewers`);
    }

    return { contributors, author };
  }

  /**
   * Extract reviewers from a PR detail page
   */
  private extractReviewers($: cheerio.CheerioAPI): string[] {
    const reviewers: Set<string> = new Set();

    // Strategy 1: Sidebar reviewers section
    // Look for "Reviewers" section in the sidebar
    $('[data-testid="sidebar-reviewers"] a[data-hovercard-type="user"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const match = href.match(/^\/([^/]+)$/);
        if (match) {
          reviewers.add(match[1]);
        }
      }
    });

    // Strategy 2: Review timeline - look for review submissions
    // Reviews are typically in timeline items with review-related classes
    $('.review-comment, .timeline-comment-wrapper').each((_, el) => {
      const $el = $(el);
      const authorLink = $el.find('a[data-hovercard-type="user"]').first();
      if (authorLink.length > 0) {
        const href = authorLink.attr('href');
        if (href) {
          const match = href.match(/^\/([^/]+)$/);
          if (match) {
            reviewers.add(match[1]);
          }
        }
      }
    });

    // Strategy 3: Look for review status indicators
    $('.participant-avatar a[data-hovercard-type="user"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const match = href.match(/^\/([^/]+)$/);
        if (match) {
          reviewers.add(match[1]);
        }
      }
    });

    // Strategy 4: Review decision indicators (approved, changes requested)
    $('[data-testid="review-decision"] a[data-hovercard-type="user"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const match = href.match(/^\/([^/]+)$/);
        if (match) {
          reviewers.add(match[1]);
        }
      }
    });

    // Strategy 5: Generic - any user mentioned in review context
    $('.js-comment-container a[data-hovercard-type="user"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const match = href.match(/^\/([^/]+)$/);
        if (match && !reviewers.has(match[1])) {
          // Only add if explicitly in a review-related container
          const $el = $(el);
          if ($el.closest('.review-comment, .review-thread').length > 0) {
            reviewers.add(match[1]);
          }
        }
      }
    });

    return Array.from(reviewers);
  }
}
