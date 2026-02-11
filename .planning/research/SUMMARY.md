# Project Research Summary

**Project:** GitSneak - GitHub Repository Intelligence CLI
**Domain:** Developer Tools / GitHub Analytics
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

GitSneak is a CLI tool for analyzing organizational investment in open-source projects by extracting contributor affiliations from GitHub repositories. Research indicates this domain requires a layered pipeline architecture with aggressive caching to handle GitHub's rate limits, multiple affiliation detection methods to improve accuracy, and careful adherence to ToS constraints. The tool fills a gap between lightweight research tools and enterprise-scale analytics platforms by focusing specifically on business development use cases.

The recommended approach uses Python 3.11+ with a modern CLI stack (Typer, Rich) and httpx for API access. The architecture should separate data acquisition, profile resolution, and affiliation extraction into distinct components, with SQLite providing local caching to survive rate limits. BeautifulSoup with lxml backend handles HTML parsing, though some GitHub data may require direct API access rather than scraping rendered pages. The most critical success factor is respecting rate limits - aggressive request throttling, exponential backoff, and efficient caching are non-negotiable.

Key risks include HTML selector brittleness (GitHub UI changes break scrapers), rate limiting leading to IP blocks, and incomplete affiliation data due to hidden organization memberships. Mitigation strategies include using semantic selectors with fallbacks, building rate limiting into the HTTP layer from day one, and setting clear expectations about data completeness. The tool should explicitly use GitHub's REST API rather than scraping HTML where possible, as this is more stable and aligns with ToS guidance.

## Key Findings

### Recommended Stack

Python 3.11+ provides the foundation with excellent async support and type hints required by modern dependencies. The CLI layer uses Typer 0.22.0 for type-hint driven commands with automatic help generation, paired with Rich 14.3.2 for beautiful terminal output (tables, progress bars). HTTP access goes through httpx 0.28.1, chosen for its sync/async flexibility and HTTP/2 support over legacy requests.

**Core technologies:**
- **Python 3.11+**: Runtime with modern async and type hints, required by pytest 9.x and tenacity 9.x
- **Typer + Rich**: CLI framework with integrated terminal output, less boilerplate than Click, includes tab completion
- **httpx**: HTTP client with sync/async support and HTTP/2, future-proof for concurrent operations
- **BeautifulSoup4 + lxml**: HTML parsing with 5-10x performance over html.parser, familiar API for DOM navigation
- **DiskCache**: SQLite-backed local cache with dictionary API, thread-safe, survives restarts
- **Jinja2**: HTML report templating with autoescaping and template inheritance
- **tenacity**: Retry logic with exponential backoff for rate limit handling
- **pydantic-settings**: Type-safe configuration from environment variables

**Development tools:**
- **uv**: Package manager 10-100x faster than pip, replacing virtualenv and pip-tools
- **pytest**: Testing framework with fixtures and parametrization
- **ruff**: Unified linting and formatting, replacing flake8, black, and isort

### Expected Features

The research identified clear distinctions between table stakes, differentiators, and anti-features based on existing tool analysis.

**Must have (table stakes):**
- GitHub API authentication - required for 5,000 req/hour vs 60 unauthenticated
- Contributor list extraction - commits, PRs, reviews are essential data points
- Organization/company extraction - core value prop identifying affiliations
- Rate limit handling - check x-ratelimit-remaining, exponential backoff
- Progress indication - scraping takes time, users need feedback
- Basic stdout output - printable terminal results
- Error handling - graceful degradation, not crashes

**Should have (competitive differentiators):**
- Local SQLite cache - avoids re-fetching user profiles, survives rate limits
- Multiple affiliation methods - profile company field + email domain + org membership + bio parsing
- Contribution weighting - quantify investment, not just presence
- ASCII table output - beautiful terminal output using Rich
- HTML report export - shareable business-ready reports
- Issue participant analysis - expand beyond committers to community participants
- Multiple repository analysis - aggregate across project ecosystems
- Time-based filtering - recent activity matters more for BD outreach
- Organization ranking/aggregation - group by org, rank by contribution

**Defer (v2+ or anti-features):**
- GraphQL API usage - optimization can come after REST works
- Complex identity merging - simple heuristics sufficient for MVP
- Direct email extraction/output - violates GitHub ToS
- LinkedIn profile matching - legally risky, massive complexity
- Real-time dashboard - overkill for CLI tool, GrimoireLab already does this
- Private repository analysis - elevated permissions complicate auth

### Architecture Approach

The architecture follows a layered pipeline pattern with clear component boundaries: CLI interface parses commands and displays output; orchestrator coordinates workflow and aggregates results; contribution collector fetches commits/PRs/reviews/issues; user profile resolver looks up user details with cache-first strategy; affiliation extractor determines organization from multiple signals; GitHub client provides rate-limited API access; local SQLite cache persists profiles with TTL.

**Major components:**
1. **GitHub Client (Rate-Limited Singleton)** - Single point of API access, tracks x-ratelimit-remaining, exponential backoff on 403/429, supports REST and GraphQL
2. **Local Cache (SQLite)** - Persist user profiles with 7-day TTL, use ETags for conditional refresh, prevents redundant API calls across runs
3. **Contribution Collector** - Extract activity from /repos/{owner}/{repo}/contributors, commits, pulls, issues endpoints with pagination
4. **Affiliation Extractor** - Priority order: company field (highest confidence), public org memberships, email domain excluding generic providers
5. **Report Generator** - Transform aggregated data into ASCII tables (stdout) and HTML reports (disk)

**Key patterns to follow:**
- Cache-aside with conditional refresh using ETags
- Rate limit aware queue pausing when limits approach
- Progressive output showing results as they arrive
- GraphQL batching for bulk user lookups (50 users per query)

**Critical anti-patterns to avoid:**
- Unbounded parallel requests triggering secondary rate limits
- Ignoring conditional requests (ETags, If-Modified-Since)
- Parsing Link headers manually instead of following rel="next"
- Storing derived data without source provenance

### Critical Pitfalls

1. **HTML Structure Fragility** - GitHub UI changes break scrapers using CSS class names or position-based selectors. Use semantic selectors (data-* attributes, ARIA labels), implement fallback selector chains, validate extracted data against schema. Address in Phase 1 architecture.

2. **Rate Limiting and IP Blocking** - Aggressive request rates trigger 429/403 responses or IP bans. Implement 1-3 second delays between requests, exponential backoff with jitter, request budgeting, User-Agent rotation. Build into HTTP layer from day one.

3. **JavaScript-Rendered Content Blindness** - BeautifulSoup misses data loaded via XHR after initial page load. Identify XHR endpoints in DevTools, call internal APIs directly instead of parsing HTML, test with JS disabled. Audit in Phase 1 before committing to BeautifulSoup-only approach.

4. **Ignoring GitHub Terms of Service** - Tool violates acceptable use policies exposing users to suspension. Read ToS, respect robots.txt, rate limit aggressively, document compliance. Address in Phase 0 before writing code.

5. **Poor Pagination Handling** - Only capturing first page of results produces incomplete data. Detect pagination elements, test on large repos, implement page limits, validate totals match GitHub's count. Build into all list extractors from start.

## Implications for Roadmap

Based on research, the project naturally divides into 5 phases following dependency chains and risk mitigation priorities.

### Phase 1: Foundation & Risk Mitigation
**Rationale:** Rate limiting and authentication must be solved before any meaningful data collection. The GitHub Client is the critical path - all other components depend on reliable API access. This phase addresses the top 2 critical pitfalls (rate limiting, ToS compliance).

**Delivers:**
- Working GitHub REST API client with authentication
- Rate limiting implementation (delays, backoff, request budgeting)
- SQLite cache layer with TTL
- CLI skeleton with command parsing

**Addresses:**
- GitHub API authentication (table stakes)
- Rate limit handling (table stakes)
- Foundation for local caching (differentiator)

**Avoids:**
- Rate limiting and IP blocking (Critical Pitfall #2)
- Ignoring GitHub ToS (Critical Pitfall #4)

**Research flags:** Standard patterns well-documented in GitHub API docs. Skip deeper research.

### Phase 2: Core Data Collection
**Rationale:** Once reliable API access exists, build the data pipeline. Contributor extraction is the foundation - all analysis depends on having a complete list of contributors with activity counts. This phase addresses pagination pitfalls and JS-rendered content issues.

**Delivers:**
- Contribution Collector extracting commits, PRs, issues
- Pagination handling for all list endpoints
- User Profile Resolver with cache-first lookups
- Progress indication during long operations

**Addresses:**
- Contributor list extraction (table stakes)
- Progress indication (table stakes)

**Uses:**
- httpx client from Phase 1
- DiskCache from Phase 1
- BeautifulSoup + lxml for HTML parsing

**Implements:**
- Contribution Collector component
- User Profile Resolver component

**Avoids:**
- Poor pagination handling (Moderate Pitfall #5)
- JavaScript-rendered content blindness (Critical Pitfall #3)

**Research flags:** May need API research if XHR endpoints required for JS-rendered data. Flag for validation during planning.

### Phase 3: Affiliation Intelligence
**Rationale:** With contributor data collected, extract organizational affiliations. Multiple detection methods provide competitive advantage over single-method tools. This is the core value proposition for business development use cases.

**Delivers:**
- Affiliation Extractor with priority-ordered detection
- Organization normalization (handling name variations)
- Aggregation by organization
- Confidence scoring for affiliations

**Addresses:**
- Organization/company extraction (table stakes)
- Multiple affiliation methods (differentiator)
- Organization ranking/aggregation (differentiator)

**Implements:**
- Affiliation Extractor component
- Organization normalizer

**Avoids:**
- Organization affiliation data incompleteness (Moderate Pitfall #8)
- Duplicate data and merge failures (Moderate Pitfall #9)

**Research flags:** Standard patterns. Company field parsing and email domain extraction well-documented. Skip deeper research.

### Phase 4: Output & Presentation
**Rationale:** Transform aggregated data into business-ready deliverables. ASCII tables for quick CLI analysis, HTML reports for sharing with stakeholders. This phase completes the MVP feature set.

**Delivers:**
- ASCII table output using Rich
- HTML report generation using Jinja2
- Contribution weighting/scoring
- Time-based filtering

**Addresses:**
- Basic stdout output (table stakes)
- ASCII table output (differentiator)
- HTML report export (differentiator)
- Contribution weighting (differentiator)
- Time-based filtering (differentiator)

**Uses:**
- Rich for terminal tables
- Jinja2 for HTML templates

**Implements:**
- Report Generator component

**Research flags:** Standard patterns. Rich and Jinja2 well-documented. Skip deeper research.

### Phase 5: Scale & Polish
**Rationale:** Optimizations for large repositories and user experience improvements. GraphQL batching dramatically improves performance for 100+ contributor repos. Multiple repository analysis extends value proposition.

**Delivers:**
- GraphQL batching for bulk user lookups
- Multiple repository analysis
- Issue participant analysis (beyond just committers)
- Resume capability for interrupted runs
- Enhanced error reporting

**Addresses:**
- Multiple repository analysis (differentiator)
- Issue participant analysis (differentiator)

**Avoids:**
- Poor CLI user experience (Minor Pitfall #10)
- Silent failure and poor error reporting (Moderate Pitfall #7)

**Research flags:** May need GraphQL API research for batch query optimization. Flag for validation during planning.

### Phase Ordering Rationale

- **Phase 1 before everything**: GitHub Client is the critical path. All data collection depends on reliable, rate-limited API access. Without this, every subsequent phase will fail in production.

- **Phase 2 depends on Phase 1**: Cannot collect contributor data without working API client and cache layer.

- **Phase 3 depends on Phase 2**: Cannot extract affiliations without contributor profiles. User Profile Resolver must work first.

- **Phase 4 depends on Phase 3**: Cannot generate reports without aggregated affiliation data.

- **Phase 5 is optimization**: Everything before Phase 5 delivers a complete MVP. Phase 5 adds performance and scale improvements.

**Grouping logic**: Phases group by architectural layer (infrastructure → data collection → analysis → presentation → optimization). This minimizes cross-cutting changes and allows each phase to be validated independently.

**Pitfall avoidance**: Phase ordering addresses critical pitfalls early (rate limiting in Phase 1, pagination in Phase 2, ToS compliance in Phase 1) before they can compound into rework.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Data Collection):** May need API endpoint research if GitHub heavily uses JS rendering for contributor data. Validate whether BeautifulSoup-only approach is sufficient or if XHR endpoint calls required.
- **Phase 5 (GraphQL Optimization):** GraphQL query construction and batching patterns need validation. Point-cost calculations for rate limiting differ from REST.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** GitHub REST API extensively documented. Rate limiting patterns well-established in httpx + tenacity.
- **Phase 3 (Affiliation):** Company field parsing and email domain extraction are straightforward string operations. Standard normalization patterns.
- **Phase 4 (Output):** Rich and Jinja2 have comprehensive documentation. Table formatting and HTML templating are solved problems.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies verified on PyPI with recent versions. Typer, httpx, BeautifulSoup, DiskCache are production-proven. |
| Features | MEDIUM | Table stakes verified against existing tools (sbaack/github-scraper, GrimoireLab, OSCI). Differentiators based on comparative analysis. Some low-confidence claims about GraphQL performance need validation. |
| Architecture | HIGH | Pipeline architecture pattern is standard for scraping tools. Component boundaries align with successful projects (RepoSense, git-fame). Rate limiting and caching patterns well-documented. |
| Pitfalls | HIGH | Critical pitfalls verified through multiple sources including official GitHub docs, established scraper projects, and technical articles. All pitfalls have documented real-world examples. |

**Overall confidence:** HIGH

Research quality is strong across all areas. Stack recommendations based on official documentation and PyPI verification. Architecture patterns validated against existing projects. Pitfalls identified through both official sources (GitHub ToS, API docs) and community experience (existing scrapers, technical articles).

### Gaps to Address

- **GraphQL performance claims**: Community reports claim "2100 repos in 8 seconds vs 50 repos in 30 seconds" but benchmarks not independently verified. Validate during Phase 5 planning. If GraphQL doesn't deliver expected performance gains, REST with batching may be sufficient.

- **Email domain extraction reliability**: Research indicates email domains can supplement company field, but accuracy depends on excluding generic providers (gmail, hotmail, etc.). Maintain whitelist/blacklist during implementation. Test against known corporate contributors.

- **Hidden organization memberships**: Users can hide org membership on profiles. Tool will undercount organizational contributions for privacy-conscious users. This is inherent limitation - document clearly in output, don't promise 100% accuracy.

- **BeautifulSoup vs API for contributor data**: Unclear whether all required data (commits, PRs, reviews, issues) is accessible via static HTML or requires API calls. Audit in Phase 2 planning. If most data requires API, BeautifulSoup may only be needed for edge cases.

## Sources

### Primary (HIGH confidence)
- GitHub REST API documentation (rate limits, endpoints, best practices)
- GitHub Acceptable Use Policies (ToS compliance)
- PyPI package pages for all dependencies (versions, requirements)
- Typer, httpx, Rich, BeautifulSoup, DiskCache official documentation
- SQLite official documentation (corruption, locking, WAL mode)

### Secondary (MEDIUM confidence)
- sbaack/github-scraper project (GitHub scraping patterns)
- GrimoireLab/CHAOSS documentation (identity resolution, caching strategies)
- OSCI/EPAM methodology (email domain approach)
- RepoSense documentation (contributor analysis patterns)
- Firecrawl, ScrapingBee, ZenRows articles on scraping best practices

### Tertiary (LOW confidence)
- Community reports on GraphQL performance improvements (needs validation)
- Various Medium articles on error handling patterns
- Blog posts on SQLite caching in scrapers

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*
