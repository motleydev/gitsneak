import * as cheerio from 'cheerio';
import type { GitHubClient } from '../scraper/client.js';

/**
 * User profile information fetched from GitHub profile page
 */
export interface UserProfile {
  username: string;
  company: string | null;
  bio: string | null;
  orgs: string[];
  fetchedAt: Date;
}

/**
 * Fetcher for GitHub user profiles
 * Extracts company, bio, and org memberships from profile pages
 */
export class ProfileFetcher {
  private client: GitHubClient;
  private verbose: boolean;

  constructor(client: GitHubClient, verbose = false) {
    this.client = client;
    this.verbose = verbose;
  }

  /**
   * Fetch a single user profile
   * @param username - GitHub username
   * @returns UserProfile with company, bio, and org memberships
   */
  async fetchProfile(username: string): Promise<UserProfile> {
    const url = `https://github.com/${username}`;
    const cacheKey = `profile:${username}`;

    try {
      const { html, fromCache } = await this.client.fetch(url, cacheKey);

      if (this.verbose) {
        console.log(`[ProfileFetcher] ${fromCache ? 'Cache hit' : 'Fetched'}: ${username}`);
      }

      const $ = cheerio.load(html);

      // Extract company from profile
      const company = this.extractCompany($);

      // Extract bio
      const bio = this.extractBio($);

      // Extract organization memberships
      const orgs = this.extractOrgs($);

      return {
        username,
        company,
        bio,
        orgs,
        fetchedAt: new Date(),
      };
    } catch (error) {
      if (this.verbose) {
        console.log(`[ProfileFetcher] Failed to fetch profile for ${username}: ${error}`);
      }

      // Return empty profile on failure - don't block collection
      return {
        username,
        company: null,
        bio: null,
        orgs: [],
        fetchedAt: new Date(),
      };
    }
  }

  /**
   * Fetch profiles for multiple users
   * @param usernames - List of GitHub usernames
   * @param onProgress - Optional progress callback
   * @returns Map of username to profile
   */
  async fetchProfiles(
    usernames: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<Map<string, UserProfile>> {
    const profiles = new Map<string, UserProfile>();
    const total = usernames.length;

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      const profile = await this.fetchProfile(username);
      profiles.set(username, profile);

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return profiles;
  }

  /**
   * Extract company from profile page
   */
  private extractCompany($: cheerio.CheerioAPI): string | null {
    // Strategy 1: Profile item with organization icon
    const companyEl = $('[itemprop="worksFor"] span').first();
    if (companyEl.length > 0) {
      const company = companyEl.text().trim();
      if (company) return company;
    }

    // Strategy 2: Look for organization link in profile
    const orgLink = $('li a[data-hovercard-type="organization"]').first();
    if (orgLink.length > 0) {
      const company = orgLink.text().trim();
      if (company) return company;
    }

    // Strategy 3: Look for company field with @ prefix
    const workText = $('[itemprop="worksFor"]').text().trim();
    if (workText) {
      // Remove leading @ if present
      return workText.replace(/^@/, '').trim();
    }

    // Strategy 4: Profile list item with organization icon
    const listItems = $('ul.vcard-details li').toArray();
    for (const li of listItems) {
      const $li = $(li);
      if ($li.find('svg.octicon-organization').length > 0) {
        const text = $li.text().trim();
        if (text) return text;
      }
    }

    return null;
  }

  /**
   * Extract bio from profile page
   */
  private extractBio($: cheerio.CheerioAPI): string | null {
    // Strategy 1: Bio div with data-bio attribute
    const bioEl = $('[data-bio-text]').first();
    if (bioEl.length > 0) {
      const bio = bioEl.text().trim();
      if (bio) return bio;
    }

    // Strategy 2: Profile bio div
    const profileBio = $('.p-note').first();
    if (profileBio.length > 0) {
      const bio = profileBio.text().trim();
      if (bio) return bio;
    }

    // Strategy 3: User bio container
    const userBio = $('[class*="user-profile-bio"]').first();
    if (userBio.length > 0) {
      const bio = userBio.text().trim();
      if (bio) return bio;
    }

    return null;
  }

  /**
   * Extract organization memberships from profile page
   */
  private extractOrgs($: cheerio.CheerioAPI): string[] {
    const orgs: Set<string> = new Set();

    // Strategy 1: Organization avatars in sidebar
    $('a[data-hovercard-type="organization"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        // Extract org name from /org-name path
        const match = href.match(/^\/([^/]+)$/);
        if (match) {
          orgs.add(match[1]);
        }
      }
    });

    // Strategy 2: Organization list items
    $('[itemprop="follows"]').each((_, el) => {
      const $el = $(el);
      const orgName = $el.text().trim();
      if (orgName) {
        orgs.add(orgName);
      }
    });

    // Strategy 3: Avatar container with org links
    $('.avatar-group-item a[href^="/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const match = href.match(/^\/([^/]+)$/);
        if (match && !match[1].includes('?')) {
          orgs.add(match[1]);
        }
      }
    });

    return Array.from(orgs);
  }
}
