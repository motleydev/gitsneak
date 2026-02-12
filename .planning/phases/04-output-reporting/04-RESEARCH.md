# Phase 4: Output & Reporting - Research

**Researched:** 2026-02-12
**Domain:** CLI output formatting, HTML report generation, contribution weighting algorithms
**Confidence:** HIGH

## Summary

This phase implements the final output layer for gitsneak: terminal tables ranking organizations by involvement and HTML reports with interactive visualizations. The data is already collected and organized (ContributorActivity with affiliations) - this phase transforms it into actionable business development reports.

The core challenges are:
1. **Terminal tables** - Rich ASCII tables that display organization rankings with breakdown by contribution type
2. **HTML reports** - Self-contained HTML files with Chart.js visualizations that open in browser
3. **Weighted scoring** - Algorithm to rank "heavy contributors" higher than "drive-by participants"
4. **Multi-repo aggregation** - Combining results across multiple repositories analyzed in a single run

**Primary recommendation:** Use `cli-table3` for terminal output (most popular, well-maintained, color support via picocolors already in project), native template literals for HTML generation (no template engine needed), and Chart.js v4.5.0 via CDN for browser-side visualizations. Implement a simple weighted scoring algorithm based on activity counts with diminishing returns.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cli-table3 | 0.6.5 | Terminal tables with Unicode borders | 19M weekly downloads, API-compatible with cli-table, maintained, optional color support |
| open | 11.0.0 | Open HTML in browser | Cross-platform (macOS/Win/Linux), maintained by sindresorhus, pure ESM |

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | 1.1.1 | Terminal colors | Already used in logger.ts - use for table coloring |
| date-fns | 4.1.0 | Date formatting | Already used - format dates in reports |

### External (CDN for HTML Reports)

| Library | Version | Purpose | CDN URL |
|---------|---------|---------|---------|
| Chart.js | 4.5.0 | Interactive charts | `https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cli-table3 | console-table-printer | More features but larger, less established |
| cli-table3 | tty-table | Word wrap support but fewer downloads |
| Template literals | EJS/Handlebars | More powerful but adds dependency for simple task |
| Chart.js | Plotly | More interactive but heavier, requires more setup |

**Installation:**
```bash
npm install cli-table3 open
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── output/
│   ├── logger.ts           # [existing] Console logging
│   ├── progress.ts         # [existing] Progress bars
│   ├── table.ts            # [new] Terminal table rendering
│   └── html-report.ts      # [new] HTML report generation
├── reporting/
│   ├── types.ts            # [new] Report data types
│   ├── scorer.ts           # [new] Weighted contribution scoring
│   ├── aggregator.ts       # [new] Multi-repo aggregation
│   └── index.ts            # [new] Report generation orchestrator
└── cli/
    └── index.ts            # [existing] Add --output, --html flags
```

### Pattern 1: Organization-Centric Aggregation

**What:** Transform contributor-centric data into organization-centric rankings
**When to use:** For the main output - ranking organizations by total weighted involvement

**Example:**
```typescript
// Source: Project design requirement
interface OrganizationReport {
  name: string;
  score: number;                    // Weighted total
  contributorCount: number;
  breakdown: {
    commits: number;
    prsAuthored: number;
    prsReviewed: number;
    issuesAuthored: number;
    issuesCommented: number;
  };
  topContributors: string[];        // Top 3 by score
}

function aggregateByOrganization(
  contributors: Map<string, ContributorActivity>
): Map<string, OrganizationReport> {
  const orgMap = new Map<string, OrganizationReport>();

  for (const [username, activity] of contributors) {
    const org = activity.primaryOrg ?? 'Unknown';
    // Aggregate activity into organization totals
  }

  return orgMap;
}
```

### Pattern 2: Weighted Scoring with Diminishing Returns

**What:** Score contributions with higher weights for substantive work, with logarithmic scaling to prevent gaming
**When to use:** For ranking organizations by "real" involvement, not just raw counts

**Example:**
```typescript
// Source: Research synthesis from gitpert, github-contribution-tracker
// Weights reflect effort: reviewing is harder than opening an issue
const CONTRIBUTION_WEIGHTS = {
  commit: 1,           // Base unit
  prAuthored: 3,       // More effort than commit
  prReviewed: 2,       // Significant but less than authoring
  issueAuthored: 1,    // Similar to commit
  issueCommented: 0.5, // Lowest effort
} as const;

function calculateScore(activity: ContributorActivity): number {
  const raw =
    activity.commits * CONTRIBUTION_WEIGHTS.commit +
    activity.prsAuthored * CONTRIBUTION_WEIGHTS.prAuthored +
    activity.prsReviewed * CONTRIBUTION_WEIGHTS.prReviewed +
    activity.issuesAuthored * CONTRIBUTION_WEIGHTS.issueAuthored +
    activity.issuesCommented * CONTRIBUTION_WEIGHTS.issueCommented;

  // Logarithmic scaling to prevent volume-gaming
  // This gives ~6.9 for 1000, ~4.6 for 100, ~2.3 for 10, ~0 for 1
  return Math.log(raw + 1);
}
```

### Pattern 3: Self-Contained HTML Report

**What:** Generate HTML with embedded data and CDN-loaded Chart.js
**When to use:** For --html flag output

**Example:**
```typescript
// Source: Chart.js documentation, template literals best practices
function generateHtmlReport(
  reportData: OrganizationReport[],
  repoNames: string[]
): string {
  const dataJson = JSON.stringify(reportData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GitSneak Report - ${repoNames.join(', ')}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js"></script>
  <style>
    /* Embedded styles */
  </style>
</head>
<body>
  <h1>Organization Involvement Report</h1>
  <canvas id="chart"></canvas>
  <script>
    const data = ${dataJson};
    // Chart.js initialization
  </script>
</body>
</html>`;
}
```

### Anti-Patterns to Avoid

- **Raw count comparison:** Don't just sum all activities - a drive-by issue commenter shouldn't rank with a core maintainer
- **Template engine for simple HTML:** Template literals are sufficient and add no dependency
- **Server-side chart rendering:** Adds complexity (canvas, puppeteer) when client-side works fine
- **Modifying contributor data:** Keep ContributorActivity immutable, compute derived data in reporting layer

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal tables | String padding/alignment | cli-table3 | Unicode widths, color codes, edge cases |
| Open file in browser | child_process spawn | open package | Cross-platform, handles WSL, app detection |
| Chart rendering | SVG/Canvas server-side | Chart.js in browser | Simpler, interactive, maintained |
| Number formatting | Manual toFixed | Intl.NumberFormat | Locale-aware, handles edge cases |

**Key insight:** The output layer should focus on data transformation and presentation logic, not reimplementing formatting primitives that libraries handle correctly.

## Common Pitfalls

### Pitfall 1: Color Code Width Calculation
**What goes wrong:** ANSI color codes make string length calculation incorrect, breaking table alignment
**Why it happens:** `"\\x1b[32mtext\\x1b[0m".length` is 14, not 4
**How to avoid:** cli-table3 handles this automatically when using optional @colors/colors; or use picocolors AFTER table renders the string
**Warning signs:** Misaligned columns when colors are enabled

### Pitfall 2: Large Dataset Performance
**What goes wrong:** Generating huge HTML files with thousands of data points
**Why it happens:** Embedding all contributor-level data in HTML
**How to avoid:** Aggregate to organization level (typically 10-100 orgs, not thousands of contributors)
**Warning signs:** Multi-MB HTML files, slow browser rendering

### Pitfall 3: Unknown Organization Handling
**What goes wrong:** "Unknown" organization dominates rankings because most casual contributors lack affiliations
**Why it happens:** Not all GitHub users have company/org/email signals
**How to avoid:** Display "Unknown" separately or allow filtering; don't let it compete in rankings
**Warning signs:** "Unknown" always #1 with 80% of score

### Pitfall 4: Score Inflation from Bot Accounts
**What goes wrong:** Bot accounts (dependabot, renovate) rank organizations highly
**Why it happens:** Bots make many commits/PRs
**How to avoid:** Phase 2 should filter bots; verify in Phase 4 output
**Warning signs:** "GitHub" (from github-actions) or "Renovate" appearing in rankings

### Pitfall 5: Multi-Repo Double Counting
**What goes wrong:** Same contributor counted multiple times across repos inflates org scores
**Why it happens:** Naive aggregation sums contributor scores from each repo
**How to avoid:** Deduplicate by username when aggregating across repos, then score once
**Warning signs:** Org scores much higher when analyzing multiple repos

## Code Examples

Verified patterns from official sources:

### CLI Table with Colors
```typescript
// Source: cli-table3 GitHub README
import Table from 'cli-table3';
import pc from 'picocolors';

const table = new Table({
  head: [
    pc.bold('Rank'),
    pc.bold('Organization'),
    pc.bold('Score'),
    pc.bold('Contributors'),
  ],
  colWidths: [6, 30, 10, 14],
  style: { head: [], border: [] }, // Disable built-in colors, use picocolors
});

table.push(
  ['1', pc.green('Microsoft'), '142.5', '47'],
  ['2', pc.cyan('Google'), '98.2', '31'],
);

console.log(table.toString());
```

### Chart.js Bar Chart in HTML
```typescript
// Source: Chart.js documentation
const chartScript = `
const ctx = document.getElementById('orgChart').getContext('2d');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(orgs.map(o => o.name))},
    datasets: [{
      label: 'Involvement Score',
      data: ${JSON.stringify(orgs.map(o => o.score))},
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  },
  options: {
    indexAxis: 'y',  // Horizontal bar chart
    scales: { x: { beginAtZero: true } }
  }
});
`;
```

### Opening HTML in Browser
```typescript
// Source: sindresorhus/open GitHub README
import open from 'open';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function openReport(html: string): Promise<void> {
  const reportPath = join(tmpdir(), `gitsneak-report-${Date.now()}.html`);
  await writeFile(reportPath, html, 'utf-8');
  await open(reportPath);
}
```

### Multi-Repo Aggregation
```typescript
// Source: Project design - deduplication pattern
interface AggregatedData {
  organizations: Map<string, OrganizationReport>;
  contributors: Map<string, ContributorActivity>; // Deduplicated
  repos: string[];
}

function aggregateMultiRepo(
  results: Array<{ repo: string; contributors: Map<string, ContributorActivity> }>
): AggregatedData {
  // Deduplicate contributors across repos by username
  const allContributors = new Map<string, ContributorActivity>();

  for (const { contributors } of results) {
    for (const [username, activity] of contributors) {
      const existing = allContributors.get(username);
      if (existing) {
        // Merge: sum counts, keep latest date, merge emails
        mergeContributors(new Map([[username, existing]]),
                         new Map([[username, activity]]));
      } else {
        allContributors.set(username, { ...activity });
      }
    }
  }

  // Now aggregate by organization (each contributor counted once)
  const organizations = aggregateByOrganization(allContributors);

  return {
    organizations,
    contributors: allContributors,
    repos: results.map(r => r.repo),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chalk for colors | picocolors | 2022 | Smaller, faster, ESM native |
| EJS/Handlebars | Template literals | 2015+ | No dependency for simple cases |
| chart.js@2.x | chart.js@4.x | 2022 | Tree-shakeable, better TypeScript |
| opn package | open package | 2019 | opn renamed to open, same author |

**Deprecated/outdated:**
- cli-table (unmaintained) -> use cli-table3
- cli-table2 (unmaintained) -> use cli-table3
- opn -> renamed to open

## Open Questions

1. **Score weights fine-tuning**
   - What we know: Commits/PRs/reviews have different effort levels
   - What's unclear: Optimal weight ratios for business development use case
   - Recommendation: Start with weights in research (1/3/2/1/0.5), allow user override via config later

2. **"Unknown" organization display**
   - What we know: Many contributors won't have detectable affiliations
   - What's unclear: Should "Unknown" appear in rankings or separate section?
   - Recommendation: Show "Unknown" at bottom with "(unaffiliated)" note, not competing in rankings

3. **HTML report persistence**
   - What we know: Can write to temp or allow --output path
   - What's unclear: User expectation for report file location
   - Recommendation: Support --html [path] with default to temp dir + auto-open

## Sources

### Primary (HIGH confidence)
- [cli-table3 GitHub](https://github.com/cli-table/cli-table3) - API, examples, usage patterns
- [sindresorhus/open GitHub](https://github.com/sindresorhus/open) - Cross-platform file opening API
- [Chart.js documentation](https://www.chartjs.org/docs/latest/getting-started/) - Integration, chart types
- [cdnjs Chart.js](https://cdnjs.com/libraries/Chart.js) - Version 4.5.0 confirmed

### Secondary (MEDIUM confidence)
- [npm compare: cli-table3 vs table vs console-table-printer](https://npm-compare.com/cli-table,cli-table3,console-table-printer,table,text-table) - Download statistics, feature comparison
- [gitpert scoring algorithm](https://github.com/augmentable-dev/gitpert) - Time-decay contribution scoring
- [score-and-rank-contributors](https://github.com/asterinas/score-and-rank-contributors) - Activity-based ranking approach

### Tertiary (LOW confidence)
- Developer productivity metrics articles - No authoritative source provides definitive weights; weights in this research are synthesized recommendations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - npm download stats, official docs verified
- Architecture: HIGH - Patterns follow existing project structure, use established libraries
- Scoring algorithm: MEDIUM - Synthesized from multiple sources, no authoritative standard exists
- Pitfalls: MEDIUM - Based on common patterns, not project-specific testing

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days - stable domain, libraries unlikely to change significantly)
