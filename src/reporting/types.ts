/**
 * Scored contributor with activity breakdown
 */
export interface ContributorScore {
  username: string;
  score: number;
  breakdown: {
    commits: number;
    prsAuthored: number;
    prsReviewed: number;
    issuesAuthored: number;
    issuesCommented: number;
  };
}

/**
 * Aggregated report for a single organization
 */
export interface OrganizationReport {
  name: string;
  score: number;
  contributorCount: number;
  breakdown: {
    commits: number;
    prsAuthored: number;
    prsReviewed: number;
    issuesAuthored: number;
    issuesCommented: number;
  };
  topContributors: string[];
}

/**
 * Complete report data for display
 */
export interface ReportData {
  organizations: OrganizationReport[];
  unknownContributors: ContributorScore[];
  repos: string[];
  generatedAt: Date;
}
