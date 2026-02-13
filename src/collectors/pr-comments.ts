import * as cheerio from 'cheerio';
import type { GitHubClient } from '../scraper/client.js';
import type { ContributorActivity } from './types.js';
import { createEmptyActivity } from './types.js';
import { isBot } from '../filters/bots.js';

/**
 * Collect commenters from a PR's discussion thread
 *
 * @param client - GitHubClient for fetching
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - PR number
 * @param options - Options including abort signal and verbose flag
 * @returns Map of contributor activities from comments
 */
export async function collectPRCommenters(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
  options: { signal?: AbortSignal; verbose?: boolean } = {}
): Promise<Map<string, ContributorActivity>> {
  const { verbose = false } = options;
  const contributors = new Map<string, ContributorActivity>();

  // The PR main page contains the discussion thread
  const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;

  if (verbose) {
    console.log(`[PRCommenters] Fetching: ${prUrl}`);
  }

  const { html, fromCache } = await client.fetch(prUrl);

  if (verbose) {
    console.log(`[PRCommenters] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
  }

  const $ = cheerio.load(html);

  // Find all comment authors in the PR discussion
  const commenters = extractCommenters($);

  if (verbose) {
    console.log(`[PRCommenters] Found ${commenters.size} unique commenters`);
  }

  for (const username of commenters) {
    if (isBot(username)) {
      if (verbose) {
        console.log(`[PRCommenters] Skipping bot: ${username}`);
      }
      continue;
    }

    let activity = contributors.get(username);
    if (!activity) {
      activity = createEmptyActivity(username);
      contributors.set(username, activity);
    }

    // Count as issue comment since PRs are issues in GitHub
    activity.issuesCommented++;
  }

  return contributors;
}

/**
 * Extract all commenters from a PR page
 */
function extractCommenters($: cheerio.CheerioAPI): Set<string> {
  const commenters = new Set<string>();

  // Strategy 1: Timeline comment containers
  $('.timeline-comment, .review-comment, .js-comment-container').each((_, el) => {
    const $el = $(el);
    const username = extractCommentAuthor($, $el);
    if (username) {
      commenters.add(username);
    }
  });

  // Strategy 2: Comment author links with specific classes
  $('.comment-body').each((_, el) => {
    const $el = $(el);
    const authorLink = $el.closest('.js-comment-container, .timeline-comment')
      .find('a[data-hovercard-type="user"]').first();
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

  // Strategy 3: Review thread comments
  $('.review-thread-reply, .inline-comment-form-container').each((_, el) => {
    const $el = $(el);
    const username = extractCommentAuthor($, $el);
    if (username) {
      commenters.add(username);
    }
  });

  // Strategy 4: TimelineItem comments
  $('.TimelineItem').each((_, el) => {
    const $el = $(el);
    // Only process items that look like comments (have user links and body)
    const hasUserLink = $el.find('a[data-hovercard-type="user"]').length > 0;
    const hasCommentBody = $el.find('.comment-body, .markdown-body').length > 0;

    if (hasUserLink && hasCommentBody) {
      const authorLink = $el.find('a[data-hovercard-type="user"]').first();
      const href = authorLink.attr('href');
      if (href) {
        const match = href.match(/^\/([^/]+)$/);
        if (match) {
          commenters.add(match[1]);
        }
      }
    }
  });

  return commenters;
}

/**
 * Extract comment author from a comment element
 */
function extractCommentAuthor(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<cheerio.Element>
): string | null {
  // Strategy 1: Author link with hovercard
  const authorLink = $el.find('a[data-hovercard-type="user"]').first();
  if (authorLink.length > 0) {
    const href = authorLink.attr('href');
    if (href) {
      const match = href.match(/^\/([^/]+)$/);
      if (match) {
        return match[1];
      }
    }
    // Try text content
    const text = authorLink.text().trim();
    if (text && !text.includes(' ')) {
      return text;
    }
  }

  // Strategy 2: Author element with specific class
  const authorEl = $el.find('.author, .user-mention').first();
  if (authorEl.length > 0) {
    const text = authorEl.text().trim();
    if (text) {
      return text;
    }
  }

  return null;
}
