import type { ContributorActivity } from '../collectors/types.js';
import type { OrganizationReport, ContributorScore } from './types.js';
import { scoreContributor } from './scorer.js';

/**
 * Aggregation result with organizations and unknown contributors
 */
export interface AggregationResult {
  organizations: OrganizationReport[];
  unknown: ContributorScore[];
}

/**
 * Internal structure for building organization data
 */
interface OrgData {
  contributors: ContributorScore[];
  breakdown: {
    commits: number;
    prsAuthored: number;
    prsReviewed: number;
    issuesAuthored: number;
    issuesCommented: number;
  };
}

/**
 * Aggregate contributors by their primary organization
 * Unknown affiliations are returned separately, not competing in rankings
 *
 * @param contributors - Map of contributor activities
 * @returns Organizations sorted by score descending, plus unknown contributors
 */
export function aggregateByOrganization(
  contributors: Map<string, ContributorActivity>
): AggregationResult {
  const orgMap = new Map<string, OrgData>();
  const unknown: ContributorScore[] = [];

  // Process each contributor
  for (const activity of contributors.values()) {
    const scored = scoreContributor(activity);
    scored.organization = activity.primaryOrg ?? null;
    const primaryOrg = activity.primaryOrg;

    // Unaffiliated contributors go to unknown array
    if (primaryOrg === null || primaryOrg === undefined) {
      unknown.push(scored);
      continue;
    }

    // Initialize org if not seen
    if (!orgMap.has(primaryOrg)) {
      orgMap.set(primaryOrg, {
        contributors: [],
        breakdown: {
          commits: 0,
          prsAuthored: 0,
          prsReviewed: 0,
          issuesAuthored: 0,
          issuesCommented: 0,
        },
      });
    }

    const orgData = orgMap.get(primaryOrg)!;

    // Add contributor to org
    orgData.contributors.push(scored);

    // Aggregate breakdown counts
    orgData.breakdown.commits += scored.breakdown.commits;
    orgData.breakdown.prsAuthored += scored.breakdown.prsAuthored;
    orgData.breakdown.prsReviewed += scored.breakdown.prsReviewed;
    orgData.breakdown.issuesAuthored += scored.breakdown.issuesAuthored;
    orgData.breakdown.issuesCommented += scored.breakdown.issuesCommented;
  }

  // Convert to OrganizationReport array
  const organizations: OrganizationReport[] = [];

  for (const [name, data] of orgMap) {
    // Sort contributors by score for top 3
    const sortedContributors = [...data.contributors].sort((a, b) => b.score - a.score);
    const topContributors = sortedContributors.slice(0, 3).map((c) => c.username);

    // Sum contributor scores for org total
    const totalScore = data.contributors.reduce((sum, c) => sum + c.score, 0);

    organizations.push({
      name,
      score: totalScore,
      contributorCount: data.contributors.length,
      breakdown: data.breakdown,
      topContributors,
    });
  }

  // Sort organizations by score descending
  organizations.sort((a, b) => b.score - a.score);

  // Sort unknown by score descending
  unknown.sort((a, b) => b.score - a.score);

  return { organizations, unknown };
}

/**
 * Multi-repo result from aggregateMultiRepo
 */
export interface MultiRepoResult {
  contributors: Map<string, ContributorActivity>;
  repos: string[];
}

/**
 * Aggregate contributor data across multiple repositories
 * Deduplicates contributors by username, merging their activity
 *
 * @param results - Array of repo results with contributors
 * @returns Merged contributors and list of repo names
 */
export function aggregateMultiRepo(
  results: Array<{ repo: string; contributors: Map<string, ContributorActivity> }>
): MultiRepoResult {
  const allContributors = new Map<string, ContributorActivity>();
  const repos: string[] = [];

  for (const result of results) {
    repos.push(result.repo);

    for (const [username, activity] of result.contributors) {
      const existing = allContributors.get(username);

      if (!existing) {
        // Clone the activity to avoid mutating original
        allContributors.set(username, {
          ...activity,
          emails: new Set(activity.emails),
        });
      } else {
        // Merge counts
        existing.commits += activity.commits;
        existing.prsAuthored += activity.prsAuthored;
        existing.prsReviewed += activity.prsReviewed;
        existing.issuesAuthored += activity.issuesAuthored;
        existing.issuesCommented += activity.issuesCommented;

        // Merge emails
        for (const email of activity.emails) {
          existing.emails.add(email);
        }

        // Keep latest activity date
        if (activity.lastActivityDate > existing.lastActivityDate) {
          existing.lastActivityDate = activity.lastActivityDate;
        }

        // Profile fetched is sticky true
        existing.profileFetched = existing.profileFetched || activity.profileFetched;

        // Keep affiliations from the one with more data or most recent
        if (activity.affiliations && activity.affiliations.length > 0) {
          if (
            !existing.affiliations ||
            existing.affiliations.length === 0 ||
            activity.affiliations.length > existing.affiliations.length
          ) {
            existing.affiliations = activity.affiliations;
            existing.primaryOrg = activity.primaryOrg;
          }
        }
      }
    }
  }

  return { contributors: allContributors, repos };
}
