/**
 * Scored contributor with activity breakdown
 */
export interface ContributorScore {
  username: string;
  score: number;
  organization: string | null;
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
 * Summary statistics for the analysis
 */
export interface AnalysisSummary {
  totalContributors: number;
  totalCommits: number;
  totalPRsAuthored: number;
  totalPRsReviewed: number;
  totalIssuesAuthored: number;
  totalIssuesCommented: number;
  affiliatedContributors: number;
  unaffiliatedContributors: number;
}

/**
 * Complete report data for display
 */
export interface ReportData {
  organizations: OrganizationReport[];
  unknownContributors: ContributorScore[];
  allContributors: ContributorScore[];
  summary: AnalysisSummary;
  repos: string[];
  generatedAt: Date;
}
