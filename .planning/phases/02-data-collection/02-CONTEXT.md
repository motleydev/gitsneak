# Phase 2: Data Collection - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract all relevant contributors from a repository including commit authors, PR participants, and issue participants. Handle pagination for large repos and support time-based filtering. Organization affiliation detection is Phase 3; output/reporting is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Contributor Sources
- PRs: Capture both authors AND reviewers (reviewers show organizational investment in code quality)
- Issues: Capture authors AND commenters (commenters show ongoing engagement)
- PR status: Include merged PRs + open PRs with activity in last 30 days
- Closed unmerged PRs: Include but flag for lower weight in output phase

### Time Filtering
- Default window: Last 12 months if --since not specified
- Boundary behavior: Only count in-window activity (strict cutoff)
- Filter scope: Same cutoff applies to commits, PRs, and issues equally
- PR date: Use most recent of opened or merged date

### Data Extraction Depth
- Activity counts: Track totals per type (commits: 15, prs: 3, issues: 2)
- Commit emails: Capture non-generic emails only (skip gmail, outlook, etc.)
- Profile fetching: Fetch each contributor's full GitHub profile during collection (one pass, cache immediately)
- Bot filtering: Exclude bot accounts (dependabot, renovate, etc.)

### Progress & Feedback
- Progress style: Progress bar with counts (e.g., "Collecting commits... [=====>    ] 523/1200")
- Verbosity: Add -v flag for verbose mode (shows API calls, cache hits, pagination)
- Interruption handling: Save partial data to cache on Ctrl+C (resume next time)
- Completion summary: Show totals ("Found 234 contributors from 1,523 commits, 89 PRs, 156 issues")

### Claude's Discretion
- Exact progress bar library/implementation
- Bot detection heuristics (username patterns, [bot] suffix, etc.)
- Generic email provider list for filtering
- How to determine "recently active" for open PRs (likely: any PR activity timestamp in last 30 days)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-data-collection*
*Context gathered: 2026-02-11*
