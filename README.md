# gitsneak

Analyze organizational involvement in GitHub repositories and pull requests.

gitsneak examines commits, pull requests, issues, and contributor profiles to identify which companies have the most investment in open source projects.

## Installation

```bash
# npm
npm install -g gitsneak

# Homebrew
brew tap motleydev/tap
brew install gitsneak
```

## Usage

```bash
# Analyze a repository
gitsneak https://github.com/facebook/react

# Analyze a specific pull request
gitsneak https://github.com/facebook/react/pull/28000

# Multiple targets with HTML report
gitsneak --html report.html https://github.com/org/repo https://github.com/org/repo/pull/123

# Last 6 months, verbose output
gitsneak -v --since 6m https://github.com/org/repo
```

## Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show detailed output (URLs fetched, timing) |
| `-q, --quiet` | Suppress progress, show only final output |
| `--delay <ms>` | Delay between requests (default: 1500) |
| `--since <date>` | Filter activity after date (e.g., `12m`, `1y`, `2025-01-01`) |
| `--no-cache` | Bypass cache, fetch fresh data |
| `--fail-fast` | Stop on first error |
| `--html [path]` | Generate HTML report |

## Features

- Analyzes commits, PRs (authored & reviewed), and issues
- Detects organization affiliations from profiles, emails, and org memberships
- Scores contributions with weighted activity metrics
- Generates interactive HTML reports with filtering and charts
- Caches responses to minimize GitHub requests
- Supports both repository and individual PR analysis

## How Scoring Works

Contributions are weighted:
- Commit: 1 point
- PR authored: 3 points
- PR reviewed: 2 points
- Issue authored: 1 point
- Issue comment: 0.5 points

Scores use logarithmic scaling to prevent high-volume contributors from dominating.

## License

MIT
