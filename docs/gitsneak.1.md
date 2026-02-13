# gitsneak(1) -- analyze organizational involvement in GitHub repositories

## SYNOPSIS

`gitsneak` [options] <urls...>

## DESCRIPTION

gitsneak analyzes GitHub repositories and pull requests to identify
organizational involvement by examining commits, pull requests, issues,
and contributor profiles. It produces ranked reports showing which
companies have the most investment in a project.

Supports both repository URLs (https://github.com/owner/repo) and
individual PR URLs (https://github.com/owner/repo/pull/123).

## OPTIONS

  * `-v`, `--verbose`:
    Show detailed output including URLs fetched and timing information.

  * `-q`, `--quiet`:
    Suppress progress indicators, show only final output.

  * `--delay` <ms>:
    Delay between requests in milliseconds. Default: 1500

  * `--since` <date>:
    Filter to activity after date. Accepts ISO dates (2025-01-01) or
    relative formats (12m, 6mo, 1y, 2w, 30d). Default: 12m

  * `--no-cache`:
    Bypass local cache and fetch fresh data from GitHub.

  * `--fail-fast`:
    Stop on first error instead of continuing with remaining repositories.

  * `--html` [path]:
    Generate HTML report. If path provided, writes to file; otherwise
    opens in default browser.

## EXAMPLES

Analyze a single repository:

    gitsneak https://github.com/facebook/react

Analyze a single pull request:

    gitsneak https://github.com/facebook/react/pull/28000

Analyze multiple repositories with verbose output:

    gitsneak -v https://github.com/org/repo1 https://github.com/org/repo2

Mix repository and PR analysis:

    gitsneak https://github.com/org/repo https://github.com/org/repo/pull/123

Generate HTML report for last 6 months:

    gitsneak --html report.html --since 6m https://github.com/org/repo

## EXIT STATUS

  * `0`: Success
  * `1`: Error (invalid URL, network failure, etc.)
  * `130`: Interrupted (Ctrl+C)

## FILES

  * `~/.local/share/gitsneak/cache.db`:
    SQLite cache for user profiles (XDG-compliant path on Linux).

## ENVIRONMENT

  * `NO_COLOR`:
    Disable colored output.

## SEE ALSO

GitHub repository: https://github.com/motleydev/gitsneak

## AUTHOR

Jesse Robertson
