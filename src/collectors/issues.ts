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
 * Collector for issue data from GitHub repository
 * Extracts issue authors and commenters with page-based pagination
 */
export class IssueCollector implements Collector {
  private client: GitHubClient;
  private verbose: boolean;

  constructor(client: GitHubClient, verbose = false) {
    this.client = client;
    this.verbose = verbose;
  }

  /**
   * Get the starting URL for issue collection
   */
  getStartUrl(owner: string, repo: string, since?: Date): string {
    let query = 'is:issue';

    if (since) {
      query += ` created:>${formatDateForQuery(since)}`;
    }

    // URL encode the query
    const encodedQuery = encodeURIComponent(query);
    return `https://github.com/${owner}/${repo}/issues?q=${encodedQuery}`;
  }

  /**
   * Get URL for issues with recent comments (ongoing engagement)
   */
  getActiveIssuesUrl(owner: string, repo: string, since?: Date): string {
    let query = 'is:issue';

    if (since) {
      query += ` updated:>${formatDateForQuery(since)}`;
    }

    const encodedQuery = encodeURIComponent(query);
    return `https://github.com/${owner}/${repo}/issues?q=${encodedQuery}`;
  }

  /**
   * Collect a single page of issues
   * @param url - The page URL to collect
   * @param since - Optional date cutoff for activity window
   * @returns CollectorResult with contributors, next page, and count
   */
  async collectPage(url: string, since?: Date): Promise<CollectorResult> {
    const contributors = new Map<string, ContributorActivity>();
    let itemsProcessed = 0;

    if (this.verbose) {
      console.log(`[IssueCollector] Fetching: ${url}`);
    }

    const { html, fromCache } = await this.client.fetch(url);

    if (this.verbose) {
      console.log(`[IssueCollector] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
    }

    const $ = cheerio.load(html);

    // Find issue list items
    const issueElements = this.findIssueElements($);

    if (this.verbose) {
      console.log(`[IssueCollector] Found ${issueElements.length} issue elements on page`);
    }

    // Collect issue URLs for detail page fetching (needed for commenters)
    const issueUrls: string[] = [];

    for (const el of issueElements) {
      const issueData = this.parseIssueElement($, el);

      if (!issueData) {
        continue;
      }

      const { username, date, issueUrl } = issueData;
      itemsProcessed++;

      // Check time window if since is provided
      if (since && date && !isWithinWindow(date, since)) {
        if (this.verbose) {
          console.log(`[IssueCollector] Skipping old issue from ${date.toISOString()}`);
        }
        continue;
      }

      // Skip bot accounts
      if (isBot(username)) {
        if (this.verbose) {
          console.log(`[IssueCollector] Skipping bot: ${username}`);
        }
        continue;
      }

      // Track issue URL for commenter extraction
      if (issueUrl) {
        issueUrls.push(issueUrl);
      }

      // Get or create contributor activity
      let activity = contributors.get(username);
      if (!activity) {
        activity = createEmptyActivity(username);
        contributors.set(username, activity);
      }

      // Update activity - issue authored
      activity.issuesAuthored++;

      // Update last activity date
      if (date && date > activity.lastActivityDate) {
        activity.lastActivityDate = date;
      }
    }

    // Fetch detail pages to extract commenters
    // This is expensive but necessary - commenters aren't visible in list view
    for (const issueUrl of issueUrls) {
      await this.collectCommentersFromDetailPage(issueUrl, contributors, since);
    }

    // Get next page URL
    const nextPage = extractNextPage($, 'issues');

    if (nextPage && this.verbose) {
      console.log(`[IssueCollector] Found next page`);
    }

    if (this.verbose) {
      console.log(`[IssueCollector] Page complete: ${itemsProcessed} issues, ${contributors.size} unique contributors`);
    }

    return {
      contributors,
      nextPage,
      itemsProcessed,
    };
  }

  /**
   * Fetch issue detail page and extract commenters
   */
  private async collectCommentersFromDetailPage(
    issueUrl: string,
    contributors: Map<string, ContributorActivity>,
    since?: Date
  ): Promise<void> {
    try {
      if (this.verbose) {
        console.log(`[IssueCollector] Fetching issue detail: ${issueUrl}`);
      }

      const { html, fromCache } = await this.client.fetch(issueUrl);

      if (this.verbose) {
        console.log(`[IssueCollector] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
      }

      const $ = cheerio.load(html);

      // Extract commenters from the issue thread
      const commenters = this.extractCommenters($, since);

      for (const commenter of commenters) {
        if (isBot(commenter)) {
          if (this.verbose) {
            console.log(`[IssueCollector] Skipping bot commenter: ${commenter}`);
          }
          continue;
        }

        // Get or create contributor activity
        let activity = contributors.get(commenter);
        if (!activity) {
          activity = createEmptyActivity(commenter);
          contributors.set(commenter, activity);
        }

        // Update activity - issue commented
        activity.issuesCommented++;
      }

      // Check for comment pagination and follow it
      // GitHub paginates long threads, though this is less common with HTML scraping
      await this.handleCommentPagination($, issueUrl, contributors, since);

    } catch (error) {
      if (this.verbose) {
        console.log(`[IssueCollector] Failed to fetch issue detail page: ${issueUrl}`);
      }
      // Continue processing other issues even if one fails
    }
  }

  /**
   * Handle comment pagination for issues with many comments
   */
  private async handleCommentPagination(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    contributors: Map<string, ContributorActivity>,
    since?: Date
  ): Promise<void> {
    // GitHub uses AJAX loading for additional comments rather than page-based pagination
    // The "Load more..." button triggers a fetch to a specific endpoint
    // For now, we collect what's visible on the initial page load
    // In the future, we could add support for fetching additional comment pages

    // Check if there are hidden comments indicators
    const hiddenComments = $('.ajax-pagination-btn, .js-ajax-pagination').length;
    if (hiddenComments > 0 && this.verbose) {
      console.log(`[IssueCollector] Issue has hidden comments (pagination): ${baseUrl}`);
    }

    // Note: To fully support comment pagination, we'd need to:
    // 1. Extract the "Load more" URL from the button
    // 2. Fetch that URL and parse additional comments
    // This is a potential enhancement for very active issues
  }

  /**
   * Find issue elements in the page using multiple selector strategies
   */
  private findIssueElements($: cheerio.CheerioAPI): Element[] {
    // Strategy 1: Issue list items with data attribute
    let items = $('[data-id]').filter((_, el) => {
      const $el = $(el);
      return $el.find('a[data-hovercard-type="issue"]').length > 0 ||
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

    // Strategy 4: Look for list items containing issue links (not PR links)
    items = $('div:has(a[href*="/issues/"])').filter((_, el) => {
      const $el = $(el);
      // Only keep items that look like issue list rows
      return $el.find('.opened-by, .text-small, relative-time').length > 0 &&
             $el.find('a[href*="/pull/"]').length === 0; // Exclude PRs
    }).toArray();

    if (this.verbose && items.length === 0) {
      console.log('[IssueCollector] Warning: Could not find issue elements on page');
    }

    return items;
  }

  /**
   * Parse an issue element to extract author info and issue URL
   */
  private parseIssueElement(
    $: cheerio.CheerioAPI,
    el: Element
  ): { username: string; date: Date | null; issueUrl: string | null } | null {
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
        console.log('[IssueCollector] Could not extract username from issue element');
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

    // Extract issue URL for detail page fetching
    let issueUrl: string | null = null;
    const issueLink = $el.find('a[href*="/issues/"]').first();
    if (issueLink.length > 0) {
      const href = issueLink.attr('href');
      if (href) {
        issueUrl = href.startsWith('http') ? href : `https://github.com${href}`;
      }
    }

    return { username, date, issueUrl };
  }

  /**
   * Extract commenters from an issue detail page
   */
  private extractCommenters($: cheerio.CheerioAPI, since?: Date): string[] {
    const commenters: Set<string> = new Set();

    // Strategy 1: Timeline comment containers
    // Each comment in the timeline has an author link
    $('.timeline-comment-group, .js-timeline-item').each((_, el) => {
      const $el = $(el);

      // Check comment date if since is provided
      if (since) {
        const timeEl = $el.find('relative-time').first();
        if (timeEl.length > 0) {
          const datetime = timeEl.attr('datetime');
          if (datetime) {
            const date = parseGitHubDate(datetime);
            if (!isWithinWindow(date, since)) {
              // Skip comments older than our window
              return;
            }
          }
        }
      }

      // Extract commenter username
      const authorLink = $el.find('a.author, a[data-hovercard-type="user"]').first();
      if (authorLink.length > 0) {
        const href = authorLink.attr('href');
        if (href) {
          const match = href.match(/^\/([^/]+)$/);
          if (match) {
            commenters.add(match[1]);
          }
        }
      }
    });

    // Strategy 2: Comment body containers
    $('.comment-body, .js-comment-body').each((_, el) => {
      const $el = $(el);
      const container = $el.closest('.timeline-comment');

      if (container.length > 0) {
        const authorLink = container.find('a.author, a[data-hovercard-type="user"]').first();
        if (authorLink.length > 0) {
          const href = authorLink.attr('href');
          if (href) {
            const match = href.match(/^\/([^/]+)$/);
            if (match && !commenters.has(match[1])) {
              commenters.add(match[1]);
            }
          }
        }
      }
    });

    // Strategy 3: Participant list in sidebar
    // This shows all participants, useful as a fallback
    $('[data-testid="sidebar-participants"] a[data-hovercard-type="user"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const match = href.match(/^\/([^/]+)$/);
        if (match && !commenters.has(match[1])) {
          commenters.add(match[1]);
        }
      }
    });

    // Strategy 4: Issue comment wrapper
    $('.js-comment-container').each((_, el) => {
      const $el = $(el);
      const authorLink = $el.find('a[data-hovercard-type="user"]').first();
      if (authorLink.length > 0) {
        const href = authorLink.attr('href');
        if (href) {
          const match = href.match(/^\/([^/]+)$/);
          if (match && !commenters.has(match[1])) {
            commenters.add(match[1]);
          }
        }
      }
    });

    return Array.from(commenters);
  }
}
