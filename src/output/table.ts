import Table from 'cli-table3';
import pc from 'picocolors';
import type { OrganizationReport, ContributorScore } from '../reporting/types.js';

/**
 * Options for rendering organization table
 */
export interface TableOptions {
  limit?: number;
}

/**
 * Render organization rankings as ASCII table
 *
 * @param orgs - Ranked organization reports
 * @param unknown - Unknown/unaffiliated contributors
 * @param options - Rendering options (limit defaults to 15)
 * @returns ASCII table string
 */
export function renderOrganizationTable(
  orgs: OrganizationReport[],
  unknown: ContributorScore[],
  options: TableOptions = {}
): string {
  const limit = options.limit ?? 15;

  const table = new Table({
    head: [
      pc.bold('Rank'),
      pc.bold('Organization'),
      pc.bold('Score'),
      pc.bold('Contributors'),
      pc.bold('Commits'),
      pc.bold('PRs (A/R)'),
      pc.bold('Issues (A/C)'),
    ],
    colWidths: [6, 25, 10, 14, 10, 12, 14],
    style: {
      head: [],
      border: [],
    },
  });

  // Add top N organizations
  const topOrgs = orgs.slice(0, limit);

  for (let i = 0; i < topOrgs.length; i++) {
    const org = topOrgs[i];
    const rank = i + 1;

    // Color top 3 ranks
    let rankDisplay: string;
    if (rank === 1) {
      rankDisplay = pc.green(`#${rank}`);
    } else if (rank === 2) {
      rankDisplay = pc.cyan(`#${rank}`);
    } else if (rank === 3) {
      rankDisplay = pc.yellow(`#${rank}`);
    } else {
      rankDisplay = `#${rank}`;
    }

    // Truncate long organization names
    let orgName = org.name;
    if (orgName.length > 24) {
      orgName = orgName.slice(0, 21) + '...';
    }

    // Format score to 1 decimal
    const scoreDisplay = org.score.toFixed(1);

    // Format PR and Issue columns
    const prDisplay = `${org.breakdown.prsAuthored}/${org.breakdown.prsReviewed}`;
    const issueDisplay = `${org.breakdown.issuesAuthored}/${org.breakdown.issuesCommented}`;

    table.push([
      rankDisplay,
      orgName,
      scoreDisplay,
      org.contributorCount.toString(),
      org.breakdown.commits.toString(),
      prDisplay,
      issueDisplay,
    ]);
  }

  // Add unknown contributors summary if any
  if (unknown.length > 0) {
    // Add separator
    table.push([
      { colSpan: 7, content: pc.dim('─'.repeat(80)) },
    ]);

    // Aggregate unknown stats
    const unknownStats = unknown.reduce(
      (acc, c) => {
        acc.commits += c.breakdown.commits;
        acc.prsAuthored += c.breakdown.prsAuthored;
        acc.prsReviewed += c.breakdown.prsReviewed;
        acc.issuesAuthored += c.breakdown.issuesAuthored;
        acc.issuesCommented += c.breakdown.issuesCommented;
        return acc;
      },
      { commits: 0, prsAuthored: 0, prsReviewed: 0, issuesAuthored: 0, issuesCommented: 0 }
    );

    const totalUnknownScore = unknown.reduce((sum, c) => sum + c.score, 0);

    table.push([
      pc.dim('-'),
      pc.dim('(unaffiliated)'),
      pc.dim(totalUnknownScore.toFixed(1)),
      pc.dim(unknown.length.toString()),
      pc.dim(unknownStats.commits.toString()),
      pc.dim(`${unknownStats.prsAuthored}/${unknownStats.prsReviewed}`),
      pc.dim(`${unknownStats.issuesAuthored}/${unknownStats.issuesCommented}`),
    ]);
  }

  return table.toString();
}
