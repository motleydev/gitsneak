import * as cheerio from 'cheerio';
import type { GitHubClient } from '../scraper/client.js';
import type { ContributorActivity } from './types.js';
import { createEmptyActivity } from './types.js';
import { isBot } from '../filters/bots.js';

/**
 * Collect commit authors from a PR's commits tab
 *
 * @param client - GitHubClient for fetching
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - PR number
 * @param options - Options including abort signal and verbose flag
 * @returns Map of contributor activities from commits
 */
export async function collectPRCommits(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
  options: { signal?: AbortSignal; verbose?: boolean } = {}
): Promise<Map<string, ContributorActivity>> {
  const { verbose = false } = options;
  const contributors = new Map<string, ContributorActivity>();

  const commitsUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}/commits`;

  if (verbose) {
    console.log(`[PRCommits] Fetching: ${commitsUrl}`);
  }

  const { html, fromCache } = await client.fetch(commitsUrl);

  if (verbose) {
    console.log(`[PRCommits] ${fromCache ? 'Cache hit' : 'Fetched'}: ${html.length} bytes`);
  }

  const $ = cheerio.load(html);

  // Find commit elements on the commits tab
  // Commits are typically in a list with author information
  const commitElements = findCommitElements($);

  if (verbose) {
    console.log(`[PRCommits] Found ${commitElements.length} commit elements`);
  }

  for (const el of commitElements) {
    const $el = $(el);
    const username = extractCommitAuthor($, $el);

    if (!username) {
      continue;
    }

    if (isBot(username)) {
      if (verbose) {
        console.log(`[PRCommits] Skipping bot: ${username}`);
      }
      continue;
    }

    let activity = contributors.get(username);
    if (!activity) {
      activity = createEmptyActivity(username);
      contributors.set(username, activity);
    }

    activity.commits++;
  }

  if (verbose) {
    console.log(`[PRCommits] Extracted ${contributors.size} unique commit authors`);
  }

  return contributors;
}

/**
 * Find commit elements in the PR commits tab
 */
function findCommitElements($: cheerio.CheerioAPI): cheerio.Element[] {
  // Strategy 1: Commit list items with data attributes
  let items = $('[data-url*="/commit/"]').toArray();
  if (items.length > 0) {
    return items;
  }

  // Strategy 2: Commits container with individual commit divs
  items = $('.commit, .TimelineItem--condensed').toArray();
  if (items.length > 0) {
    return items;
  }

  // Strategy 3: Box-row elements containing commit links
  items = $('.Box-row:has(a[href*="/commit/"])').toArray();
  if (items.length > 0) {
    return items;
  }

  // Strategy 4: List items containing commit hashes
  items = $('li:has(a[href*="/commit/"])').toArray();

  return items;
}

/**
 * Extract commit author username from a commit element
 */
function extractCommitAuthor(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<cheerio.Element>
): string | null {
  // Strategy 1: User hovercard link
  const userLink = $el.find('a[data-hovercard-type="user"]').first();
  if (userLink.length > 0) {
    const href = userLink.attr('href');
    if (href) {
      const match = href.match(/^\/([^/]+)$/);
      if (match) {
        return match[1];
      }
    }
    // Try text content
    const text = userLink.text().trim();
    if (text && !text.includes(' ') && !text.includes('/')) {
      return text;
    }
  }

  // Strategy 2: Author element with class
  const authorEl = $el.find('.commit-author, .user-mention').first();
  if (authorEl.length > 0) {
    const text = authorEl.text().trim();
    if (text) {
      return text;
    }
  }

  // Strategy 3: Link to user profile
  const profileLink = $el.find('a[href^="/"][href$=""]').filter((_, linkEl) => {
    const href = $(linkEl).attr('href');
    return href ? /^\/[a-zA-Z0-9][-a-zA-Z0-9]*$/.test(href) : false;
  }).first();

  if (profileLink.length > 0) {
    const href = profileLink.attr('href');
    if (href) {
      return href.slice(1);
    }
  }

  return null;
}
