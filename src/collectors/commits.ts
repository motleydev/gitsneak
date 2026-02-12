import * as cheerio from 'cheerio';
import type { GitHubClient } from '../scraper/client.js';
import type { Collector, CollectorResult, ContributorActivity } from './types.js';
import { createEmptyActivity } from './types.js';
import { isBot } from '../filters/bots.js';
import { parseGitHubDate, isWithinWindow } from '../parsers/date.js';
import { extractNextPage } from '../parsers/pagination.js';

/**
 * Collector for commit data from GitHub repository
 * Extracts commit authors with cursor-based pagination
 */
export class CommitCollector implements Collector {
  private client: GitHubClient;
  private verbose: boolean;

  constructor(client: GitHubClient, verbose = false) {
    this.client = client;
    this.verbose = verbose;
  }

  /**
   * Get the starting URL for commit collection
   * GitHub commits URL doesn't support date filtering directly,
   * so time filtering is done client-side during collection
   */
  getStartUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}/commits`;
  }

  /**
   * Collect a single page of commits
   * @param url - The page URL to collect
   * @param since - Optional date cutoff for activity window
   * @returns CollectorResult with contributors, next page, and count
   */
  async collectPage(url: string, since?: Date): Promise<CollectorResult> {
    const contributors = new Map<string, ContributorActivity>();
    let itemsProcessed = 0;
    let hitCutoff = false;

    if (this.verbose) {
      console.log(`[CommitCollector] Fetching: ${url}`);
    }

    const { html, fromCache } = await this.client.fetch(url);

    if (this.verbose) {
      console.log(`[CommitCollector] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
    }

    const $ = cheerio.load(html);

    // GitHub commit list uses various selectors depending on page version
    // Try multiple approaches for robustness
    const commitElements = this.findCommitElements($);

    for (const el of commitElements) {
      const commitData = this.parseCommitElement($, el);

      if (!commitData) {
        continue;
      }

      const { username, date, email } = commitData;
      itemsProcessed++;

      // Check time window if since is provided
      if (since && date && !isWithinWindow(date, since)) {
        // We've reached commits older than our window
        hitCutoff = true;
        if (this.verbose) {
          console.log(`[CommitCollector] Hit time cutoff at ${date.toISOString()}`);
        }
        break; // Stop processing this page
      }

      // Skip bot accounts
      if (isBot(username)) {
        if (this.verbose) {
          console.log(`[CommitCollector] Skipping bot: ${username}`);
        }
        continue;
      }

      // Get or create contributor activity
      let activity = contributors.get(username);
      if (!activity) {
        activity = createEmptyActivity(username);
        contributors.set(username, activity);
      }

      // Update activity
      activity.commits++;

      // Add email if provided (emails are extracted from commit metadata if available)
      if (email) {
        activity.emails.add(email);
      }

      // Update last activity date
      if (date && date > activity.lastActivityDate) {
        activity.lastActivityDate = date;
      }
    }

    // Get next page URL unless we hit time cutoff
    let nextPage: string | null = null;
    if (!hitCutoff) {
      nextPage = extractNextPage($, 'commits');
      if (nextPage && this.verbose) {
        console.log(`[CommitCollector] Found next page`);
      }
    }

    if (this.verbose) {
      console.log(`[CommitCollector] Page complete: ${itemsProcessed} commits, ${contributors.size} unique contributors`);
    }

    return {
      contributors,
      nextPage,
      itemsProcessed,
    };
  }

  /**
   * Find commit elements in the page using multiple selector strategies
   */
  private findCommitElements($: cheerio.CheerioAPI): cheerio.Element[] {
    // Strategy 1: data-testid attribute (modern GitHub)
    let commits = $('[data-testid="commit-row"]').toArray();
    if (commits.length > 0) {
      return commits;
    }

    // Strategy 2: TimelineItem pattern (GitHub timeline)
    commits = $('.TimelineItem').toArray();
    if (commits.length > 0) {
      return commits;
    }

    // Strategy 3: commits-list-item (older GitHub)
    commits = $('[data-commits-list-item]').toArray();
    if (commits.length > 0) {
      return commits;
    }

    // Strategy 4: BlobCodeContent or commit row divs
    commits = $('div.commit').toArray();
    if (commits.length > 0) {
      return commits;
    }

    // Strategy 5: Look for commit containers with author links
    commits = $('li:has(a[data-hovercard-type="user"])').toArray();
    if (commits.length > 0) {
      return commits;
    }

    // Strategy 6: Generic - find all elements containing commit author info
    commits = $('div:has(relative-time):has(a[href^="/"]:not([href*="commit"]))').toArray();

    if (this.verbose && commits.length === 0) {
      console.log('[CommitCollector] Warning: Could not find commit elements on page');
    }

    return commits;
  }

  /**
   * Parse a commit element to extract author info
   */
  private parseCommitElement(
    $: cheerio.CheerioAPI,
    el: cheerio.Element
  ): { username: string; date: Date | null; email: string | null } | null {
    const $el = $(el);

    // Extract username from author link
    // Try various selectors for the author
    let username: string | null = null;

    // Strategy 1: User hovercard link
    const userLink = $el.find('a[data-hovercard-type="user"]').first();
    if (userLink.length > 0) {
      const href = userLink.attr('href');
      if (href) {
        // Extract username from /{username} pattern
        const match = href.match(/^\/([^/]+)$/);
        if (match) {
          username = match[1];
        }
      }
    }

    // Strategy 2: Commit author span/link
    if (!username) {
      const authorEl = $el.find('.commit-author, .author').first();
      if (authorEl.length > 0) {
        username = authorEl.text().trim();
      }
    }

    // Strategy 3: Look for user profile link by href pattern
    if (!username) {
      $el.find('a').each((_, linkEl) => {
        const href = $(linkEl).attr('href');
        if (href && /^\/[a-zA-Z0-9][-a-zA-Z0-9]*$/.test(href)) {
          username = href.slice(1);
          return false; // break
        }
      });
    }

    if (!username) {
      if (this.verbose) {
        console.log('[CommitCollector] Could not extract username from commit element');
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

    // Email is typically not directly visible in commit listings,
    // but may be in commit metadata on detail pages
    // For now, we collect emails from other sources (PRs, issues, profiles)
    const email: string | null = null;

    return { username, date, email };
  }
}
