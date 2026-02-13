import type { CollectionResult } from '../collectors/index.js';
import type { ReportData, AnalysisSummary, ContributorScore } from './types.js';
import type { GitSneakOptions } from '../types/index.js';
import { aggregateByOrganization, aggregateMultiRepo } from './aggregator.js';
import { scoreContributor } from './scorer.js';
import { renderOrganizationTable } from '../output/table.js';

/**
 * Generate a report from collection results
 *
 * @param results - Single or multiple collection results
 * @param repos - Repository names that were analyzed
 * @returns ReportData ready for display
 */
export function generateReport(
  results: CollectionResult | CollectionResult[],
  repos: string[]
): ReportData {
  // Normalize to array
  const resultsArray = Array.isArray(results) ? results : [results];

  // If multiple results, merge contributors across repos
  let contributors;

  if (resultsArray.length === 1) {
    contributors = resultsArray[0].contributors;
  } else {
    // Prepare for aggregation
    const repoResults = resultsArray.map((result, i) => ({
      repo: repos[i] || `repo-${i}`,
      contributors: result.contributors,
    }));

    const merged = aggregateMultiRepo(repoResults);
    contributors = merged.contributors;
  }

  // Aggregate by organization
  const { organizations, unknown } = aggregateByOrganization(contributors);

  // Build all contributors list with scores
  const allContributors: ContributorScore[] = [];
  for (const activity of contributors.values()) {
    allContributors.push(scoreContributor(activity));
  }
  // Sort by score descending
  allContributors.sort((a, b) => b.score - a.score);

  // Calculate summary statistics
  const summary: AnalysisSummary = {
    totalContributors: contributors.size,
    totalCommits: 0,
    totalPRsAuthored: 0,
    totalPRsReviewed: 0,
    totalIssuesAuthored: 0,
    totalIssuesCommented: 0,
    affiliatedContributors: 0,
    unaffiliatedContributors: 0,
  };

  for (const activity of contributors.values()) {
    summary.totalCommits += activity.commits;
    summary.totalPRsAuthored += activity.prsAuthored;
    summary.totalPRsReviewed += activity.prsReviewed;
    summary.totalIssuesAuthored += activity.issuesAuthored;
    summary.totalIssuesCommented += activity.issuesCommented;

    if (activity.primaryOrg) {
      summary.affiliatedContributors++;
    } else {
      summary.unaffiliatedContributors++;
    }
  }

  return {
    organizations,
    unknownContributors: unknown,
    allContributors,
    summary,
    repos,
    generatedAt: new Date(),
  };
}

/**
 * Display a report to the console
 *
 * @param report - Report data to display
 * @param options - CLI options (for verbose flag)
 */
export function displayReport(report: ReportData, options: GitSneakOptions): void {
  // Render and print the table
  const tableStr = renderOrganizationTable(
    report.organizations,
    report.unknownContributors
  );

  console.log('');
  console.log(tableStr);

  // Verbose: show generation timestamp
  if (options.verbose) {
    console.log(`\nGenerated at: ${report.generatedAt.toISOString()}`);
  }
}

// Re-export types and functions
export type { ReportData, OrganizationReport, ContributorScore, AnalysisSummary } from './types.js';
export { CONTRIBUTION_WEIGHTS, calculateScore, scoreContributor } from './scorer.js';
export { aggregateByOrganization, aggregateMultiRepo } from './aggregator.js';
export { renderOrganizationTable } from '../output/table.js';
