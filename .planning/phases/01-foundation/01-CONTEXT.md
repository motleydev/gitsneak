# Phase 1: Foundation - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI skeleton, GitHub client (HTML scraping), rate limiting, and caching infrastructure. Users can invoke the CLI with repository URLs and the tool can reliably scrape data from GitHub without being blocked.

**Key clarification:** This tool scrapes GitHub HTML pages directly — no API usage. Authentication is not needed for public repos.

</domain>

<decisions>
## Implementation Decisions

### CLI Invocation
- Full GitHub URLs only (no shorthand like `owner/repo`)
- Support multiple repos in one command: `gitsneak <url1> <url2> ...`
- No authentication required — scraping public HTML pages
- Configurable request delay via `--delay` flag for scraping politeness

### Progress & Feedback
- Progress bar showing items processed (X/Y)
- `-v` flag for verbose mode (shows each URL fetched, timing info)
- `-q` flag for quiet mode (suppresses progress, only final output)
- Per-repo progress when analyzing multiple repos

### Error Messaging
- Friendly, actionable error messages by default
- Colored output: red for errors, yellow for warnings
- Auto retry with exponential backoff when rate limited/blocked
- `--fail-fast` flag for partial failures (default: continue and summarize failures at end)

### Caching
- `--no-cache` flag to force fresh fetch
- Show cache stats at end: "Used X cached entries, fetched Y new"

### Claude's Discretion
- Cache location (XDG standard vs project local)
- What to cache and TTL strategy (user profiles vs everything)
- Default delay between requests
- Exact backoff timing for rate limit retries

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for scraping and CLI conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-11*
