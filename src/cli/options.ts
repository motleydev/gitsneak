import type { RepoInfo } from '../types/index.js';

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
