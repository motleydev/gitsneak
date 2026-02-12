# Phase 4: Output & Reporting - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate ASCII tables and HTML reports with weighted analysis, ranking organizations by their investment in the repository. Support multi-repo analysis with aggregated results.

</domain>

<decisions>
## Implementation Decisions

### Multi-repo mode
- Support both CLI args (space-separated URLs) and file input (--repos file.txt)
- Side-by-side presentation: separate table per repo, then a summary table
- Summary table shows full aggregation — all orgs with total scores summed
- Sequential processing by default, with flag for parallel (--parallel)

### HTML report
- Clean sortable data tables — like GitHub's contributor list, not charts
- Folder output: index.html + assets folder (not single self-contained file)
- Interactive: sortable columns + search/filter box (requires JS)
- Full drill-down: Orgs → contributors → individual contributions

### Claude's Discretion
- ASCII table column layout and formatting
- Weighting formula for ranking orgs (commits vs PRs vs reviews)
- Exact JS library for table interactivity (vanilla JS, or lightweight lib)
- How to handle orgs with equal scores (tiebreaker)

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

*Phase: 04-output-reporting*
*Context gathered: 2026-02-12*
