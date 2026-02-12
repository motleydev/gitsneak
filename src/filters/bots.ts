/**
 * Patterns to detect bot accounts on GitHub
 * These accounts should be excluded from contributor analysis
 */
export const BOT_PATTERNS: RegExp[] = [
  /\[bot\]$/i,
  /^dependabot$/i,
  /^renovate$/i,
  /^renovate-bot$/i,
  /^greenkeeper$/i,
  /^snyk-bot$/i,
  /^semantic-release-bot$/i,
  /^github-actions$/i,
  /^mergify$/i,
  /^codecov$/i,
  /^allcontributors$/i,
  /^imgbot$/i,
  /^stale$/i,
  /^netlify$/i,
  /^vercel$/i,
  /^depfu$/i,
  /^whitesource-bolt$/i,
  /^mend-bolt-for-github$/i,
  /-bot$/i,  // Generic suffix pattern
];

/**
 * Check if a username belongs to a bot account
 */
export function isBot(username: string): boolean {
  if (!username) {
    return false;
  }

  return BOT_PATTERNS.some(pattern => pattern.test(username));
}
