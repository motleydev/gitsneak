import open from 'open';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ReportData, OrganizationReport, ContributorScore } from '../reporting/types.js';

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate a complete self-contained HTML report
 *
 * @param report - Report data to render
 * @returns Complete HTML document string
 */
export function generateHtmlReport(report: ReportData): string {
  const targetNames = report.repos.join(', ');
  const { summary, allContributors, organizations } = report;

  // Get unique organizations for filter dropdown
  const uniqueOrgs = [...new Set(allContributors.map(c => c.organization).filter(Boolean))] as string[];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitSneak Report - ${escapeHtml(targetNames)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      line-height: 1.6;
    }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }

    /* Header */
    header {
      background: linear-gradient(135deg, #238636 0%, #1f6feb 100%);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    header h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .meta { opacity: 0.9; font-size: 0.9rem; }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #58a6ff;
    }
    .stat-label {
      font-size: 0.85rem;
      color: #8b949e;
      margin-top: 0.25rem;
    }

    /* Cards */
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #f0f6fc;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .card h2 .icon { font-size: 1.1rem; }

    /* Charts */
    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }
    .chart-container { position: relative; height: 350px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #30363d; }
    th { background: #21262d; font-weight: 600; color: #f0f6fc; position: sticky; top: 0; }
    tr:hover { background: #21262d; }
    .rank { font-weight: 600; color: #58a6ff; width: 60px; }
    .score { font-weight: 600; color: #3fb950; }
    .username { font-weight: 500; }
    .org-badge {
      display: inline-block;
      background: #30363d;
      padding: 0.15rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      color: #8b949e;
    }
    .activity-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #21262d;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .pill.commits { color: #a5d6ff; }
    .pill.prs { color: #a371f7; }
    .pill.issues { color: #f78166; }

    /* Filters */
    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .filter-group label { font-size: 0.85rem; color: #8b949e; }
    input[type="text"], select {
      background: #21262d;
      border: 1px solid #30363d;
      color: #c9d1d9;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.9rem;
    }
    input[type="text"]:focus, select:focus {
      outline: none;
      border-color: #58a6ff;
    }
    input[type="text"] { width: 250px; }

    /* Scrollable table container */
    .table-scroll {
      max-height: 600px;
      overflow-y: auto;
      border: 1px solid #30363d;
      border-radius: 6px;
    }
    .table-scroll table { margin: 0; }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid #30363d;
      margin-bottom: 1rem;
    }
    .tab {
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      color: #8b949e;
      transition: all 0.2s;
    }
    .tab:hover { color: #c9d1d9; }
    .tab.active {
      color: #f0f6fc;
      border-bottom-color: #f78166;
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Footer */
    footer {
      text-align: center;
      padding: 1.5rem;
      color: #8b949e;
      font-size: 0.85rem;
      border-top: 1px solid #30363d;
      margin-top: 2rem;
    }

    /* Methodology */
    .methodology {
      font-size: 0.85rem;
      color: #8b949e;
      background: #21262d;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }
    .methodology h4 { color: #f0f6fc; margin-bottom: 0.5rem; }
    .methodology code {
      background: #30363d;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>GitSneak Analysis Report</h1>
      <p class="meta">Targets: ${escapeHtml(targetNames)}</p>
      <p class="meta">Generated: ${report.generatedAt.toLocaleString()}</p>
    </header>

    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${summary.totalContributors}</div>
        <div class="stat-label">Contributors</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.totalCommits.toLocaleString()}</div>
        <div class="stat-label">Commits</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.totalPRsAuthored + summary.totalPRsReviewed}</div>
        <div class="stat-label">PR Activity</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.totalIssuesAuthored + summary.totalIssuesCommented}</div>
        <div class="stat-label">Issue Activity</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${organizations.length}</div>
        <div class="stat-label">Organizations</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round((summary.affiliatedContributors / summary.totalContributors) * 100) || 0}%</div>
        <div class="stat-label">Affiliated</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="card">
        <h2><span class="icon">📊</span> Organization Involvement</h2>
        <div class="chart-container">
          <canvas id="orgChart"></canvas>
        </div>
      </div>
      <div class="card">
        <h2><span class="icon">📈</span> Activity Breakdown</h2>
        <div class="chart-container">
          <canvas id="activityChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Tabbed Content -->
    <div class="card">
      <div class="tabs">
        <div class="tab active" data-tab="contributors">All Contributors (${allContributors.length})</div>
        <div class="tab" data-tab="organizations">Organizations (${organizations.length})</div>
      </div>

      <!-- Contributors Tab -->
      <div class="tab-content active" id="contributors-tab">
        <div class="filters">
          <div class="filter-group">
            <label for="search">Search:</label>
            <input type="text" id="search" placeholder="Filter by username...">
          </div>
          <div class="filter-group">
            <label for="org-filter">Organization:</label>
            <select id="org-filter">
              <option value="">All</option>
              <option value="__unaffiliated__">Unaffiliated</option>
              ${uniqueOrgs.map(org => `<option value="${escapeHtml(org)}">${escapeHtml(org)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="sort-by">Sort by:</label>
            <select id="sort-by">
              <option value="score">Score</option>
              <option value="commits">Commits</option>
              <option value="prs">PRs</option>
              <option value="issues">Issues</option>
            </select>
          </div>
        </div>

        <div class="table-scroll">
          <table id="contributors-table">
            <thead>
              <tr>
                <th class="rank">#</th>
                <th>Username</th>
                <th>Organization</th>
                <th class="score">Score</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              ${allContributors.map((c, i) => `
              <tr data-username="${escapeHtml(c.username.toLowerCase())}" data-org="${c.organization ? escapeHtml(c.organization) : '__unaffiliated__'}" data-score="${c.score}" data-commits="${c.breakdown.commits}" data-prs="${c.breakdown.prsAuthored + c.breakdown.prsReviewed}" data-issues="${c.breakdown.issuesAuthored + c.breakdown.issuesCommented}">
                <td class="rank">${i + 1}</td>
                <td class="username">
                  <a href="https://github.com/${escapeHtml(c.username)}" target="_blank" rel="noopener">${escapeHtml(c.username)}</a>
                </td>
                <td>${c.organization ? `<span class="org-badge">${escapeHtml(c.organization)}</span>` : '<span style="color:#6e7681">—</span>'}</td>
                <td class="score">${c.score.toFixed(2)}</td>
                <td>
                  <div class="activity-pills">
                    ${c.breakdown.commits > 0 ? `<span class="pill commits">${c.breakdown.commits} commit${c.breakdown.commits !== 1 ? 's' : ''}</span>` : ''}
                    ${c.breakdown.prsAuthored > 0 ? `<span class="pill prs">${c.breakdown.prsAuthored} PR${c.breakdown.prsAuthored !== 1 ? 's' : ''}</span>` : ''}
                    ${c.breakdown.prsReviewed > 0 ? `<span class="pill prs">${c.breakdown.prsReviewed} review${c.breakdown.prsReviewed !== 1 ? 's' : ''}</span>` : ''}
                    ${c.breakdown.issuesAuthored > 0 ? `<span class="pill issues">${c.breakdown.issuesAuthored} issue${c.breakdown.issuesAuthored !== 1 ? 's' : ''}</span>` : ''}
                    ${c.breakdown.issuesCommented > 0 ? `<span class="pill issues">${c.breakdown.issuesCommented} comment${c.breakdown.issuesCommented !== 1 ? 's' : ''}</span>` : ''}
                  </div>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Organizations Tab -->
      <div class="tab-content" id="organizations-tab">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="rank">#</th>
                <th>Organization</th>
                <th class="score">Score</th>
                <th>Contributors</th>
                <th>Commits</th>
                <th>PRs (A/R)</th>
                <th>Issues (A/C)</th>
                <th>Top Contributors</th>
              </tr>
            </thead>
            <tbody>
              ${organizations.map((org, i) => `
              <tr>
                <td class="rank">${i + 1}</td>
                <td><strong>${escapeHtml(org.name)}</strong></td>
                <td class="score">${org.score.toFixed(1)}</td>
                <td>${org.contributorCount}</td>
                <td>${org.breakdown.commits}</td>
                <td>${org.breakdown.prsAuthored} / ${org.breakdown.prsReviewed}</td>
                <td>${org.breakdown.issuesAuthored} / ${org.breakdown.issuesCommented}</td>
                <td>${org.topContributors.map(u => `<a href="https://github.com/${escapeHtml(u)}" target="_blank">${escapeHtml(u)}</a>`).join(', ')}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="methodology">
          <h4>Scoring Methodology</h4>
          <p>
            Involvement scores use weighted activity:
            <code>commit=1</code>, <code>PR authored=3</code>, <code>PR reviewed=2</code>,
            <code>issue authored=1</code>, <code>issue comment=0.5</code>.
            Scores use logarithmic scaling (<code>log(raw + 1)</code>) to prevent high-volume contributors from dominating.
          </p>
        </div>
      </div>
    </div>

    <footer>
      Generated by <a href="https://github.com/motleydev/gitsneak" target="_blank">GitSneak</a>
    </footer>
  </div>

  <script>
    // Data for charts
    const allOrgs = ${JSON.stringify(organizations)};
    const summary = ${JSON.stringify(summary)};

    // Organization Bar Chart
    const orgCtx = document.getElementById('orgChart').getContext('2d');
    new Chart(orgCtx, {
      type: 'bar',
      data: {
        labels: allOrgs.map(o => o.name),
        datasets: [{
          label: 'Involvement Score',
          data: allOrgs.map(o => o.score),
          backgroundColor: 'rgba(88, 166, 255, 0.7)',
          borderColor: 'rgba(88, 166, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#30363d' },
            ticks: { color: '#8b949e' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#c9d1d9' }
          }
        }
      }
    });

    // Activity Doughnut Chart
    const actCtx = document.getElementById('activityChart').getContext('2d');
    new Chart(actCtx, {
      type: 'doughnut',
      data: {
        labels: ['Commits', 'PRs Authored', 'PRs Reviewed', 'Issues Authored', 'Issue Comments'],
        datasets: [{
          data: [
            summary.totalCommits,
            summary.totalPRsAuthored,
            summary.totalPRsReviewed,
            summary.totalIssuesAuthored,
            summary.totalIssuesCommented
          ],
          backgroundColor: [
            'rgba(165, 214, 255, 0.8)',
            'rgba(163, 113, 247, 0.8)',
            'rgba(190, 135, 255, 0.8)',
            'rgba(247, 129, 102, 0.8)',
            'rgba(255, 166, 145, 0.8)'
          ],
          borderColor: '#161b22',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#c9d1d9', padding: 15 }
          }
        }
      }
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
      });
    });

    // Filtering and sorting
    const searchInput = document.getElementById('search');
    const orgFilter = document.getElementById('org-filter');
    const sortBy = document.getElementById('sort-by');
    const tableBody = document.querySelector('#contributors-table tbody');
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    function filterAndSort() {
      const searchTerm = searchInput.value.toLowerCase();
      const selectedOrg = orgFilter.value;
      const sortField = sortBy.value;

      // Filter
      let visible = rows.filter(row => {
        const username = row.dataset.username;
        const org = row.dataset.org;

        const matchesSearch = !searchTerm || username.includes(searchTerm);
        const matchesOrg = !selectedOrg || org === selectedOrg;

        return matchesSearch && matchesOrg;
      });

      // Sort
      visible.sort((a, b) => {
        const aVal = parseFloat(a.dataset[sortField === 'score' ? 'score' : sortField]);
        const bVal = parseFloat(b.dataset[sortField === 'score' ? 'score' : sortField]);
        return bVal - aVal;
      });

      // Re-render
      tableBody.innerHTML = '';
      visible.forEach((row, i) => {
        row.querySelector('.rank').textContent = i + 1;
        tableBody.appendChild(row);
      });

      // Hide filtered rows
      rows.forEach(row => {
        row.style.display = visible.includes(row) ? '' : 'none';
      });
    }

    searchInput.addEventListener('input', filterAndSort);
    orgFilter.addEventListener('change', filterAndSort);
    sortBy.addEventListener('change', filterAndSort);
  </script>
</body>
</html>`;
}

/**
 * Write HTML report to temp file and open in default browser
 *
 * @param html - HTML content to write
 * @returns Path to the created report file
 */
export async function openReport(html: string): Promise<string> {
  const filename = `gitsneak-report-${Date.now()}.html`;
  const reportPath = join(tmpdir(), filename);

  await writeFile(reportPath, html, 'utf-8');
  await open(reportPath);

  return reportPath;
}
