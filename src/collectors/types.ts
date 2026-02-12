/**
 * Contributor activity data collected from GitHub
 */
export interface ContributorActivity {
  username: string;
  commits: number;
  prsAuthored: number;
  prsReviewed: number;
  issuesAuthored: number;
  issuesCommented: number;
  emails: Set<string>;
  lastActivityDate: Date;
  profileFetched: boolean;
}

/**
 * Result from a single page collection
 */
export interface CollectorResult {
  contributors: Map<string, ContributorActivity>;
  nextPage: string | null;
  itemsProcessed: number;
}

/**
 * Interface for all collectors (commits, PRs, issues)
 */
export interface Collector {
  collectPage(url: string, since?: Date): Promise<CollectorResult>;
  getStartUrl(owner: string, repo: string, since?: Date): string;
}

/**
 * Create an empty ContributorActivity for a new contributor
 */
export function createEmptyActivity(username: string): ContributorActivity {
  return {
    username,
    commits: 0,
    prsAuthored: 0,
    prsReviewed: 0,
    issuesAuthored: 0,
    issuesCommented: 0,
    emails: new Set<string>(),
    lastActivityDate: new Date(0), // Epoch start, will be updated
    profileFetched: false,
  };
}

/**
 * Merge incoming contributor data into existing map
 * Updates counts and merges emails, keeps latest activity date
 */
export function mergeContributors(
  existing: Map<string, ContributorActivity>,
  incoming: Map<string, ContributorActivity>
): Map<string, ContributorActivity> {
  for (const [username, incomingActivity] of incoming) {
    const existingActivity = existing.get(username);

    if (!existingActivity) {
      existing.set(username, incomingActivity);
    } else {
      // Merge counts
      existingActivity.commits += incomingActivity.commits;
      existingActivity.prsAuthored += incomingActivity.prsAuthored;
      existingActivity.prsReviewed += incomingActivity.prsReviewed;
      existingActivity.issuesAuthored += incomingActivity.issuesAuthored;
      existingActivity.issuesCommented += incomingActivity.issuesCommented;

      // Merge emails
      for (const email of incomingActivity.emails) {
        existingActivity.emails.add(email);
      }

      // Keep latest activity date
      if (incomingActivity.lastActivityDate > existingActivity.lastActivityDate) {
        existingActivity.lastActivityDate = incomingActivity.lastActivityDate;
      }

      // Profile fetched is sticky true
      existingActivity.profileFetched = existingActivity.profileFetched || incomingActivity.profileFetched;
    }
  }

  return existing;
}
