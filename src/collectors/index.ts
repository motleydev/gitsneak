import type { GitHubClient } from '../scraper/client.js';
import type { ContributorActivity } from './types.js';
import { mergeContributors } from './types.js';
import { CommitCollector } from './commits.js';
import { PullRequestCollector } from './pull-requests.js';
import { IssueCollector } from './issues.js';
import { ProfileFetcher } from './profiles.js';
import { OrganizationDetector } from '../organization/index.js';

/**
 * Result from collecting all contributor data
 */
export interface CollectionResult {
  contributors: Map<string, ContributorActivity>;
  stats: {
    commits: number;
    prsAuthored: number;
    prsReviewed: number;
    issuesAuthored: number;
    issuesCommented: number;
    uniqueContributors: number;
  };
  orgStats?: {
    withAffiliation: number;
    unknown: number;
  };
  aborted: boolean;
}

/**
 * Progress callback for collection stages
 */
export type ProgressCallback = (
  stage: string,
  current: number,
  total: number | null
) => void;

/**
 * Options for contributor collection
 */
export interface CollectionOptions {
  since?: Date;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  verbose?: boolean;
}

/**
 * Collect all contributors from a repository
 * Runs all collectors (commits, PRs, issues) and merges results
 *
 * @param client - GitHubClient for fetching
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param options - Collection options including date filter, progress callback, abort signal
 * @returns CollectionResult with merged contributors and stats
 */
export async function collectContributors(
  client: GitHubClient,
  owner: string,
  repo: string,
  options: CollectionOptions = {}
): Promise<CollectionResult> {
  const { since, onProgress, signal, verbose = false } = options;

  // Initialize result
  let allContributors = new Map<string, ContributorActivity>();
  let aborted = false;

  // Stats tracking
  let totalCommits = 0;
  let totalPrsAuthored = 0;
  let totalPrsReviewed = 0;
  let totalIssuesAuthored = 0;
  let totalIssuesCommented = 0;

  // Helper to check abort
  const checkAborted = (): boolean => {
    if (signal?.aborted) {
      aborted = true;
      return true;
    }
    return false;
  };

  // Helper for verbose logging
  const log = (message: string): void => {
    if (verbose) {
      console.log(message);
    }
  };

  // 1. Collect commits
  log('[Orchestrator] Starting commit collection...');
  const commitCollector = new CommitCollector(client, verbose);
  let commitUrl: string | null = commitCollector.getStartUrl(owner, repo, since);
  let commitPageCount = 0;

  while (commitUrl && !checkAborted()) {
    const result = await commitCollector.collectPage(commitUrl, since);
    allContributors = mergeContributors(allContributors, result.contributors);
    totalCommits += result.itemsProcessed;
    commitPageCount++;

    if (onProgress) {
      onProgress('commits', totalCommits, null);
    }

    log(`[Orchestrator] Commits page ${commitPageCount}: ${result.itemsProcessed} processed`);
    commitUrl = result.nextPage;
  }

  log(`[Orchestrator] Commits complete: ${totalCommits} total, ${allContributors.size} contributors`);

  if (checkAborted()) {
    return buildResult(allContributors, totalCommits, totalPrsAuthored, totalPrsReviewed,
      totalIssuesAuthored, totalIssuesCommented, true);
  }

  // 2. Collect merged PRs
  log('[Orchestrator] Starting merged PR collection...');
  const prCollector = new PullRequestCollector(client, verbose);
  let prUrl: string | null = prCollector.getStartUrl(owner, repo, since);
  let prPageCount = 0;

  while (prUrl && !checkAborted()) {
    const result = await prCollector.collectPage(prUrl, since);
    allContributors = mergeContributors(allContributors, result.contributors);

    // Count PR activity from result
    for (const activity of result.contributors.values()) {
      totalPrsAuthored += activity.prsAuthored;
      totalPrsReviewed += activity.prsReviewed;
    }

    prPageCount++;

    if (onProgress) {
      onProgress('prs-merged', totalPrsAuthored + totalPrsReviewed, null);
    }

    log(`[Orchestrator] Merged PRs page ${prPageCount}: ${result.itemsProcessed} processed`);
    prUrl = result.nextPage;
  }

  if (checkAborted()) {
    return buildResult(allContributors, totalCommits, totalPrsAuthored, totalPrsReviewed,
      totalIssuesAuthored, totalIssuesCommented, true);
  }

  // 3. Collect open/active PRs
  log('[Orchestrator] Starting open PR collection...');
  let openPrUrl: string | null = prCollector.getOpenPRsUrl(owner, repo, since);
  let openPrPageCount = 0;

  while (openPrUrl && !checkAborted()) {
    const result = await prCollector.collectPage(openPrUrl, since);
    allContributors = mergeContributors(allContributors, result.contributors);

    // Count PR activity from result
    for (const activity of result.contributors.values()) {
      totalPrsAuthored += activity.prsAuthored;
      totalPrsReviewed += activity.prsReviewed;
    }

    openPrPageCount++;

    if (onProgress) {
      onProgress('prs-open', totalPrsAuthored + totalPrsReviewed, null);
    }

    log(`[Orchestrator] Open PRs page ${openPrPageCount}: ${result.itemsProcessed} processed`);
    openPrUrl = result.nextPage;
  }

  log(`[Orchestrator] PRs complete: ${totalPrsAuthored} authored, ${totalPrsReviewed} reviewed`);

  if (checkAborted()) {
    return buildResult(allContributors, totalCommits, totalPrsAuthored, totalPrsReviewed,
      totalIssuesAuthored, totalIssuesCommented, true);
  }

  // 4. Collect issues
  log('[Orchestrator] Starting issue collection...');
  const issueCollector = new IssueCollector(client, verbose);
  let issueUrl: string | null = issueCollector.getStartUrl(owner, repo, since);
  let issuePageCount = 0;

  while (issueUrl && !checkAborted()) {
    const result = await issueCollector.collectPage(issueUrl, since);
    allContributors = mergeContributors(allContributors, result.contributors);

    // Count issue activity from result
    for (const activity of result.contributors.values()) {
      totalIssuesAuthored += activity.issuesAuthored;
      totalIssuesCommented += activity.issuesCommented;
    }

    issuePageCount++;

    if (onProgress) {
      onProgress('issues', totalIssuesAuthored + totalIssuesCommented, null);
    }

    log(`[Orchestrator] Issues page ${issuePageCount}: ${result.itemsProcessed} processed`);
    issueUrl = result.nextPage;
  }

  log(`[Orchestrator] Issues complete: ${totalIssuesAuthored} authored, ${totalIssuesCommented} commented`);

  if (checkAborted()) {
    return buildResult(allContributors, totalCommits, totalPrsAuthored, totalPrsReviewed,
      totalIssuesAuthored, totalIssuesCommented, true);
  }

  // 5. Fetch profiles for all contributors
  log('[Orchestrator] Starting profile collection...');
  const profileFetcher = new ProfileFetcher(client, verbose);
  const usernames = Array.from(allContributors.keys());

  const profiles = await profileFetcher.fetchProfiles(
    usernames,
    (done, total) => {
      if (checkAborted()) return;
      if (onProgress) {
        onProgress('profiles', done, total);
      }
    }
  );

  // Mark profiles as fetched
  for (const [username, profile] of profiles) {
    const activity = allContributors.get(username);
    if (activity) {
      activity.profileFetched = true;
    }
  }

  log(`[Orchestrator] Profiles complete: ${profiles.size} fetched`);

  if (checkAborted()) {
    return buildResult(allContributors, totalCommits, totalPrsAuthored, totalPrsReviewed,
      totalIssuesAuthored, totalIssuesCommented, true);
  }

  // 6. Detect organization affiliations
  log('[Orchestrator] Starting organization detection...');
  const detector = new OrganizationDetector(verbose);
  let withAffiliation = 0;
  let unknown = 0;
  let orgDetected = 0;

  for (const [username, activity] of allContributors) {
    const profile = profiles.get(username);
    if (profile) {
      const result = detector.detectForContributor(profile, activity.emails);
      activity.affiliations = result.affiliations;
      activity.primaryOrg = result.primaryOrg;

      if (result.affiliations.length > 0) {
        withAffiliation++;
      } else {
        unknown++;
      }

      orgDetected++;
      if (onProgress) {
        onProgress('organizations', orgDetected, allContributors.size);
      }
    } else {
      // No profile fetched, mark as unknown
      activity.affiliations = [];
      activity.primaryOrg = null;
      unknown++;
    }
  }

  log(`[Orchestrator] Organization detection complete: ${withAffiliation} with affiliations, ${unknown} unknown`);

  return buildResult(allContributors, totalCommits, totalPrsAuthored, totalPrsReviewed,
    totalIssuesAuthored, totalIssuesCommented, aborted, { withAffiliation, unknown });
}

/**
 * Build the final collection result
 */
function buildResult(
  contributors: Map<string, ContributorActivity>,
  commits: number,
  prsAuthored: number,
  prsReviewed: number,
  issuesAuthored: number,
  issuesCommented: number,
  aborted: boolean,
  orgStats?: { withAffiliation: number; unknown: number }
): CollectionResult {
  return {
    contributors,
    stats: {
      commits,
      prsAuthored,
      prsReviewed,
      issuesAuthored,
      issuesCommented,
      uniqueContributors: contributors.size,
    },
    orgStats,
    aborted,
  };
}

// Re-export types for convenience
export type { ContributorActivity } from './types.js';
export { mergeContributors } from './types.js';
export { CommitCollector } from './commits.js';
export { PullRequestCollector } from './pull-requests.js';
export { IssueCollector } from './issues.js';
export { ProfileFetcher } from './profiles.js';
