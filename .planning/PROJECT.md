# GitSneak

## What This Is

A CLI tool that scrapes GitHub repositories to identify which organizations are most invested in specific open-source projects. It analyzes contributors and issue participants, extracts their organizational affiliations from profiles, and outputs ranked reports showing company involvement — enabling targeted business development outreach.

## Core Value

Surface which organizations have the most skin in the game for any given GitHub repository, so you can approach them for consulting or services around that technology.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] CLI accepts one or more GitHub repository URLs as input
- [ ] Scrape repository contributors (commit authors)
- [ ] Scrape pull request authors (merged or active PRs)
- [ ] Scrape pull request reviewers
- [ ] Scrape issue authors
- [ ] Scrape issue commenters
- [ ] Extract organization from user profiles (company field)
- [ ] Extract organization from user's GitHub org memberships
- [ ] Extract organization from commit email domain (fallback)
- [ ] Apply precedence weighting: company field > GitHub orgs > email domain
- [ ] Cache user profile lookups locally to avoid redundant scraping
- [ ] Terminal output: ASCII tables ranking organizations by involvement
- [ ] HTML output: Interactive visualization for deeper exploration
- [ ] Handle pagination when scraping contributor/issue lists
- [ ] Graceful handling of rate limiting and request failures

### Out of Scope

- GitLab/Bitbucket support — GitHub-only for v1
- GitHub API usage — scraping-only approach, no token required
- Historical trend analysis — point-in-time snapshot only
- Real-time updates or watching — manual CLI invocation
- User authentication/accounts — local tool only

## Context

**Use case:** Business development. Identify companies heavily invested in specific open-source technologies, then approach them for consulting, support, or services. Example: scanning Pandoc to find which publishers or document-heavy companies are contributing or filing issues.

**Technical approach:** Pure web scraping with BeautifulSoup or similar. No GitHub API to avoid token requirements and rate limit complexity. Local SQLite or file-based cache for user profiles to support multi-repo runs efficiently.

**Output formats:**
- Terminal: Quick ASCII tables showing top organizations, contribution counts, issue counts
- HTML: Richer visualization (charts, drill-down) that opens in browser

## Constraints

- **No API tokens**: Must work without GitHub authentication — scraping only
- **Respectful scraping**: Reasonable delays between requests to avoid being blocked
- **Python**: BeautifulSoup mentioned as preferred parsing approach

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scraping over API | Avoids token requirement, simpler setup | — Pending |
| Local caching | Reuse profile data across repos, faster subsequent runs | — Pending |
| Org precedence: company > orgs > email | Company field is most explicit self-identification | — Pending |

---
*Last updated: 2025-02-11 after initialization*
