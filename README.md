# gitsneak

**Open source intelligence for business development.**

Discover which companies are investing engineering resources in open source projects. gitsneak analyzes GitHub repositories to reveal organizational involvement—helping you identify potential partners, customers, or acquisition targets based on their open source footprint.

## Why gitsneak?

Companies that contribute to open source signal:
- **Technical investment** in specific technologies
- **Engineering capacity** and team size
- **Strategic priorities** through sustained contribution patterns

gitsneak surfaces this intelligence by analyzing commits, pull requests, code reviews, and contributor profiles to map the corporate landscape behind any GitHub project.

## Installation

```bash
# Homebrew
brew tap motleydev/tap
brew install gitsneak

# npm
npm install -g gitsneak
```

## Quick Start

```bash
# Who's contributing to React?
gitsneak https://github.com/facebook/react

# Analyze a specific PR's participants
gitsneak https://github.com/kubernetes/kubernetes/pull/12345

# Generate an interactive HTML report
gitsneak --html report.html https://github.com/apache/kafka
```

## Example Output

```
┌──────┬─────────────────────────┬───────┬──────────────┬─────────┬───────────┬─────────────┐
│ Rank │ Organization            │ Score │ Contributors │ Commits │ PRs (A/R) │ Issues (A/C)│
├──────┼─────────────────────────┼───────┼──────────────┼─────────┼───────────┼─────────────┤
│ #1   │ Meta                    │ 847.2 │ 24           │ 1,892   │ 342/521   │ 89/445      │
│ #2   │ Vercel                  │ 234.5 │ 8            │ 445     │ 122/89    │ 34/122      │
│ #3   │ Google                  │ 198.3 │ 12           │ 234     │ 67/145    │ 23/89       │
│ ...  │                         │       │              │         │           │             │
└──────┴─────────────────────────┴───────┴──────────────┴─────────┴───────────┴─────────────┘
```

## Features

- **Organization Detection** — Identifies companies from GitHub profiles, email domains, and org memberships
- **Multi-signal Analysis** — Weighs commits, PRs authored, code reviews, and issue participation
- **PR-level Targeting** — Analyze individual pull requests to see who's involved in specific features
- **Interactive Reports** — Filterable HTML reports with charts and direct links to contributor profiles
- **Smart Caching** — Respects rate limits with local caching to enable iterative analysis

## Options

| Flag | Description |
|------|-------------|
| `--html [path]` | Generate interactive HTML report |
| `--since <date>` | Filter to recent activity (e.g., `6m`, `1y`, `2024-01-01`) |
| `--delay <ms>` | Request delay in milliseconds (default: 1500) |
| `--no-cache` | Bypass cache for fresh data |
| `-v, --verbose` | Show detailed progress |
| `-q, --quiet` | Minimal output |

## Use Cases

**Sales & Business Development**
> "Which companies are using Kubernetes? Let me analyze their contributor base to build a prospect list."

**Competitive Intelligence**
> "How much is our competitor investing in this open source project compared to us?"

**M&A Research**
> "Which startups have engineers actively contributing to AI/ML frameworks?"

**Partnership Discovery**
> "Find companies with shared technology interests for potential integration partnerships."

## How Scoring Works

Contributions are weighted by effort:

| Activity | Weight |
|----------|--------|
| PR Authored | 3 |
| PR Reviewed | 2 |
| Commit | 1 |
| Issue Authored | 1 |
| Issue Comment | 0.5 |

Scores use logarithmic scaling to balance prolific individuals against broader team participation.

## License

MIT

---

<p align="center">
  <sub>Built for discovering the companies behind open source.</sub>
</p>
