import type { CollectionResult } from '../collectors/index.js';
import type { ReportData } from './types.js';
import type { GitSneakOptions } from '../types/index.js';
import { aggregateByOrganization, aggregateMultiRepo } from './aggregator.js';
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

  return {
    organizations,
    unknownContributors: unknown,
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
export type { ReportData, OrganizationReport, ContributorScore } from './types.js';
export { CONTRIBUTION_WEIGHTS, calculateScore, scoreContributor } from './scorer.js';
export { aggregateByOrganization, aggregateMultiRepo } from './aggregator.js';
export { renderOrganizationTable } from '../output/table.js';
