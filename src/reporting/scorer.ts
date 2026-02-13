import type { ContributorActivity } from '../collectors/types.js';
import type { ContributorScore } from './types.js';

/**
 * Weights for different contribution types
 * Higher weights indicate more significant involvement
 */
export const CONTRIBUTION_WEIGHTS = {
  commit: 1,           // Base unit
  prAuthored: 3,       // Most effort - creating and maintaining a PR
  prReviewed: 2,       // Significant effort - reviewing others' work
  issueAuthored: 1,    // Similar to commit - raising issues
  issueCommented: 0.5, // Lowest effort - participating in discussion
} as const;

/**
 * Calculate weighted score from activity counts
 * Uses logarithmic scaling for diminishing returns
 *
 * @param activity - Contributor activity data
 * @returns Logarithmically scaled weighted score
 */
export function calculateScore(activity: ContributorActivity): number {
  const raw =
    activity.commits * CONTRIBUTION_WEIGHTS.commit +
    activity.prsAuthored * CONTRIBUTION_WEIGHTS.prAuthored +
    activity.prsReviewed * CONTRIBUTION_WEIGHTS.prReviewed +
    activity.issuesAuthored * CONTRIBUTION_WEIGHTS.issueAuthored +
    activity.issuesCommented * CONTRIBUTION_WEIGHTS.issueCommented;

  // Logarithmic scaling for diminishing returns
  // Prevents high-volume contributors from dominating scores
  return Math.log(raw + 1);
}

/**
 * Score a contributor and return full breakdown
 *
 * @param activity - Contributor activity data
 * @returns ContributorScore with username, score, and activity breakdown
 */
export function scoreContributor(activity: ContributorActivity): ContributorScore {
  return {
    username: activity.username,
    score: calculateScore(activity),
    organization: activity.primaryOrg ?? null,
    breakdown: {
      commits: activity.commits,
      prsAuthored: activity.prsAuthored,
      prsReviewed: activity.prsReviewed,
      issuesAuthored: activity.issuesAuthored,
      issuesCommented: activity.issuesCommented,
    },
  };
}
