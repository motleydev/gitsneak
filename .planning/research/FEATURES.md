# Feature Landscape

**Domain:** GitHub Repository Intelligence / Organizational Contributor Analysis CLI
**Researched:** 2026-02-11
**Confidence:** MEDIUM (based on WebSearch + official documentation verification)

## Table Stakes

Features users expect from any GitHub repository analysis tool. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **GitHub API Authentication** | Required for meaningful rate limits (60 unauthenticated vs 5,000 authenticated requests/hour) | Low | Personal access token support is minimum; GitHub App support is nice-to-have |
| **Contributor List Extraction** | Core capability - who contributed to a repo | Low | Commits, PRs, reviews are the essential data points |
| **Organization/Company Extraction** | Core value prop - must identify affiliations somehow | Medium | User profile `company` field is primary source; email domain is secondary |
| **Rate Limit Handling** | Without it, tool breaks on any real usage | Medium | Must check `x-ratelimit-remaining`, implement exponential backoff |
| **Progress Indication** | Scraping takes time; users need feedback | Low | Progress bars, status messages during long operations |
| **Basic Output (stdout)** | Minimum viable output | Low | Printable results to terminal |
| **Error Handling** | API failures, missing profiles, private repos | Medium | Graceful degradation, not crashes |
| **Repository Specification** | Must accept repo input (owner/repo format) | Low | Single repo is table stakes; multiple repos is differentiator |

### Table Stakes Rationale

These features are table stakes because existing tools like [sbaack/github-scraper](https://github.com/sbaack/github-scraper), [RepoSense](https://github.com/reposense/RepoSense), and commercial tools like [Apify GitHub scrapers](https://apify.com/janbuchar/github-contributors-scraper/api/cli) all provide these capabilities. A tool missing these would be dismissed immediately.

**Sources:**
- [GitHub REST API Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) - HIGH confidence
- [sbaack/github-scraper](https://github.com/sbaack/github-scraper) - MEDIUM confidence (direct inspection)

---

## Differentiators

Features that set GitSneak apart. Not expected by default, but add significant value for the business development use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Local SQLite Cache** | Avoids re-fetching user profiles; survives rate limits; enables incremental analysis | Medium | Cache user lookups, not repo data (repos change more often) |
| **Multiple Affiliation Detection Methods** | Better coverage than single-method tools | Medium | Profile `company` field + email domain + bio parsing + org membership |
| **Contribution Weighting/Scoring** | Quantify "investment" not just presence | Medium | Commits vs PRs vs reviews vs issue comments have different weights |
| **ASCII Table Output** | Beautiful terminal output for quick analysis | Low | Use Rich or PrettyTable; matches CLI tool expectations |
| **HTML Report Export** | Shareable, presentable reports for business use | Medium | Static HTML with tables/charts; no server required |
| **Issue Participant Analysis** | Expand beyond committers to community participants | Medium | Issue creators, commenters, discussion participants show interest even without code |
| **Multiple Repository Analysis** | Aggregate across project ecosystem | Medium | Analyze kubernetes/* or multiple related repos together |
| **Time-Based Filtering** | Recent activity matters more for BD outreach | Low | Last 6 months vs all time; active vs historical contributors |
| **Org Ranking/Aggregation** | Group contributors by org, rank by total contribution | Low | Core value for BD: "Company X has 15 contributors with 847 commits" |
| **GraphQL API Usage** | Dramatically more efficient data fetching | Medium | One query vs 11+ REST calls for nested contributor data |
| **Configurable Contribution Types** | Different use cases need different signals | Low | CLI flags to include/exclude commits, PRs, reviews, issues |
| **Email Domain Extraction** | Additional affiliation signal when company field empty | Medium | Parse commit emails; respect privacy (no direct email output) |

### Differentiator Rationale

These features create competitive advantage:

1. **Local caching** is critical because user profile lookups are the bottleneck. OSCI methodology caches GH Archive data. GrimoireLab uses Elasticsearch for data persistence. A lightweight SQLite approach fits CLI tools better.

2. **Multiple affiliation methods** matters because [OSCI](https://opensourceindex.io/) relies solely on email domains, which misses many contributors. Combining methods improves coverage significantly.

3. **HTML reports** serve the business development use case - you need to share findings with sales teams who won't use CLI.

4. **GraphQL efficiency** is a genuine advantage: "2100 repos in 8 seconds compared to 50 repos in 30 seconds" per community reports.

**Sources:**
- [OSCI Methodology](https://github.com/epam/OSCI) - email domain approach - MEDIUM confidence
- [GrimoireLab](https://chaoss.github.io/grimoirelab/) - identity management via SortingHat - MEDIUM confidence
- [GitHub GraphQL vs REST](https://docs.github.com/en/rest/about-the-rest-api/comparing-githubs-rest-api-and-graphql-api) - HIGH confidence
- [SQLite caching pattern](https://jerrynsh.com/how-i-saved-scraped-data-in-an-sqlite-database-on-github/) - LOW confidence

---

## Anti-Features

Features to explicitly NOT build. These are traps that waste effort, violate ToS, or create maintenance burden.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Direct Email Extraction/Output** | Violates GitHub ToS ("may not use information...for spamming purposes, including for the purposes of sending unsolicited emails") | Show organization affiliation only; let users find contacts through proper channels |
| **LinkedIn Profile Scraping/Matching** | Violates LinkedIn ToS; legally risky; adds massive complexity | Stick to GitHub data only; LinkedIn is separate BD workflow |
| **Web Scraping (non-API)** | GitHub explicitly distinguishes API usage from web scraping; scraping "does not refer to the collection of information through the API" | Use REST/GraphQL API exclusively |
| **Real-time Dashboard** | Overkill for CLI tool; GrimoireLab already does this well | Batch processing with report export is sufficient |
| **Private Repository Analysis** | Requires elevated permissions; privacy concerns; complicates auth | Public repos only; enterprise can fork and customize |
| **Automatic Outreach/Emails** | Explicitly prohibited by GitHub ToS; spam territory | Output data for manual review and outreach |
| **User Activity Monitoring** | Crosses into surveillance; privacy concerns; not BD relevant | Point-in-time analysis is sufficient |
| **Full Commit History Storage** | Storage explosion; not needed for organizational analysis | Store aggregates and contributor metadata only |
| **Complex Identity Resolution** | GrimoireLab/SortingHat does this well; massive complexity | Simple heuristics (same email = same person); suggest manual review for edge cases |

### Anti-Feature Rationale

These anti-features would:
1. **Legal/ToS violations**: Email harvesting and automated outreach are explicitly prohibited by [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
2. **Scope creep**: Real-time dashboards and full identity resolution are solved problems (GrimoireLab, OSCI) - GitSneak should stay focused on CLI simplicity
3. **Maintenance burden**: Private repo support and web scraping add complexity without proportional value

**Sources:**
- [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) - HIGH confidence
- [GitHub Site Policy - Scraping](https://github.com/github/site-policy/issues/56) - MEDIUM confidence

---

## Feature Dependencies

```
Authentication (PAT) ─┬─> Contributor Extraction ──> Org/Company Extraction
                      │                                      │
                      │                                      v
                      │                              Affiliation Aggregation
                      │                                      │
                      ├─> Rate Limit Handling                │
                      │                                      v
                      └─> Local Cache ──────────────> Report Generation
                                                            │
                                            ┌───────────────┴───────────────┐
                                            v                               v
                                      ASCII Output                    HTML Export
```

### Core Dependencies
1. **Authentication** must exist before any API calls
2. **Contributor Extraction** requires authentication to be useful (rate limits)
3. **Local Cache** depends on having data to cache (contributor/user data)
4. **Org Extraction** depends on contributor list (must have users to look up)
5. **Report Generation** depends on aggregated data existing

### Optional Feature Dependencies
- **GraphQL usage** is parallel to REST, not dependent
- **HTML export** can be added after ASCII output works
- **Multiple repo analysis** extends single-repo (same data flow, just iterated)
- **Time filtering** is a parameter to contributor extraction, not a separate feature

---

## MVP Recommendation

For MVP, prioritize based on core value proposition (organizational contributor intelligence for BD):

### Phase 1: Core Value (Must Have)
1. **GitHub Authentication** - PAT-based, environment variable or config file
2. **Contributor Extraction** - Commits and PRs at minimum
3. **User Profile Lookup** - Get company field and email domain
4. **Rate Limit Handling** - Check headers, basic backoff
5. **Org Aggregation** - Group by organization, count contributions
6. **ASCII Table Output** - Terminal-friendly results

### Phase 2: Practical Usability
7. **Local SQLite Cache** - User profile caching to survive rate limits
8. **Progress Indication** - Show what's happening during long operations
9. **Time Filtering** - Focus on recent activity
10. **Multiple Repos** - Analyze related repositories together

### Phase 3: Business Deliverables
11. **HTML Report Export** - Shareable business-ready reports
12. **Review/Issue Participant Analysis** - Broader community signal
13. **Contribution Weighting** - Sophistication for power users

### Defer to Post-MVP
- **GraphQL API**: Complexity vs REST, optimization can come later
- **Complex identity merging**: Start simple, add if needed
- **Bio parsing for affiliation**: Profile `company` field gets 80% of value
- **GitHub App authentication**: PAT is sufficient for CLI tool

### MVP Scope Rationale

The MVP focuses on answering the core question: "Which organizations have the most contributors to this project?"

This requires:
- Getting the contributor list (commits/PRs)
- Looking up each contributor's profile
- Extracting organization from profile
- Aggregating and displaying results

Everything else is optimization or extended capability.

---

## Feature Comparison: Existing Tools

| Feature | sbaack/github-scraper | GrimoireLab | OSCI | RepoSense | GitSneak (Target) |
|---------|----------------------|-------------|------|-----------|-------------------|
| CLI Interface | Yes | Complex setup | No (cloud) | No (Java/Web) | **Yes** |
| Org Affiliation | Via membership | Via SortingHat | Email domain | No | **Multiple methods** |
| Local Caching | No | Elasticsearch | GH Archive | No | **SQLite** |
| Output Formats | CSV, GEXF | Kibana dashboards | Web rankings | Web reports | **ASCII + HTML** |
| Rate Limit Handling | Manual | Built-in | N/A (archived data) | Git only | **Built-in** |
| BD Focus | No (research) | No (community health) | No (rankings) | No (code review) | **Yes** |
| Issue Participants | No | Yes | No | No | **Yes** |
| Lightweight | Yes | No (many components) | No (infrastructure) | No (Java) | **Yes** |

### GitSneak's Niche

GitSneak fills a gap: a **lightweight, CLI-native tool specifically designed for business development** use cases. Existing tools are either:
- Research-focused (github-scraper) with network analysis output (GEXF)
- Enterprise-scale (GrimoireLab) requiring significant infrastructure
- Ranking-focused (OSCI) without per-repo analysis capability
- Code review focused (RepoSense) without organizational intelligence

---

## Sources Summary

### HIGH Confidence (Official Documentation)
- [GitHub REST API Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
- [GitHub GraphQL vs REST Comparison](https://docs.github.com/en/rest/about-the-rest-api/comparing-githubs-rest-api-and-graphql-api)
- [GitHub REST API Best Practices](https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api)

### MEDIUM Confidence (Verified with Project Documentation)
- [sbaack/github-scraper](https://github.com/sbaack/github-scraper) - Direct repository inspection
- [GrimoireLab/CHAOSS](https://chaoss.github.io/grimoirelab/) - Official project documentation
- [OSCI/EPAM](https://github.com/epam/OSCI) - Project README and methodology
- [RepoSense](https://github.com/reposense/RepoSense) - Project documentation

### LOW Confidence (WebSearch Only - Needs Validation)
- SQLite caching patterns for scrapers
- Email domain extraction reliability
- GraphQL performance claims (community reports, not benchmarked)
