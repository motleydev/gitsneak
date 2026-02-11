# Technology Stack

**Project:** GitSneak - GitHub Repository Intelligence CLI
**Researched:** 2026-02-11
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| Python | 3.11+ | Runtime | HIGH | Excellent async support, type hints, performance improvements. 3.11+ required by key dependencies (pytest 9.x requires 3.10+, tenacity 9.x requires 3.10+) |
| Typer | 0.22.0 | CLI framework | HIGH | Type-hint driven CLI with automatic --help, tab completion. Built on Click but cleaner API. Includes Rich integration for beautiful output |
| Rich | 14.3.2 | Terminal output | HIGH | Tables, progress bars, syntax highlighting. Already a Typer dependency. Industry standard for modern Python CLIs |

### HTTP & Scraping

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| httpx | 0.28.1 | HTTP client | HIGH | Sync + async support, HTTP/2, requests-compatible API. Future-proof for concurrent scraping if needed |
| BeautifulSoup4 | 4.14.3 | HTML parsing | HIGH | User-specified preference. Excellent for navigating DOM, handles malformed HTML gracefully. Most familiar to Python developers |
| lxml | 6.0.2 | HTML parser backend | HIGH | Use as BeautifulSoup parser (`lxml` or `lxml-xml`). 5-10x faster than `html.parser`. C-based performance |

### Caching & Storage

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| DiskCache | 5.6.3 | Local caching | HIGH | SQLite-backed, thread/process safe, dictionary-like API. Perfect for caching user profile lookups. Survives process restarts |
| SQLite | stdlib | Underlying storage | HIGH | Bundled with Python, zero config, fast, reliable. DiskCache uses it internally |

### Output & Visualization

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| Rich | 14.3.2 | ASCII tables | HIGH | `rich.table.Table` for terminal output. Already required by Typer. Beautiful, auto-sizing columns |
| Jinja2 | 3.1.6 | HTML templates | HIGH | Industry standard templating. Template inheritance, filters, autoescaping. Powers Flask/Django templates |

### Configuration & Validation

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| pydantic-settings | 2.12.0 | Config management | HIGH | Type-safe settings from env vars/.env files. Validation, secrets handling, nested config support |

### Resilience & Anti-Detection

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| tenacity | 9.1.4 | Retry logic | HIGH | Exponential backoff, jitter, retry conditions. Essential for handling rate limits and transient failures |
| fake-useragent | 2.2.0 | User agent rotation | MEDIUM | Real-world browser UA database. Rotate to avoid detection. Note: requires internet to update UA list |

### Development & Testing

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| uv | 0.10.2 | Package management | HIGH | 10-100x faster than pip. Replaces pip, virtualenv, pip-tools. Rust-based, production-ready in 2025/2026 |
| pytest | 9.0.2 | Testing | HIGH | De facto standard. Fixtures, parametrization, plugins. Requires Python 3.10+ |
| ruff | 0.15.0 | Linting & formatting | HIGH | Replaces flake8, black, isort. Extremely fast (Rust). Single tool for all style enforcement |
| pytest-httpx | latest | HTTP mocking | HIGH | Mock httpx requests in tests. Better than responses for httpx-based projects |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| HTTP Client | httpx | requests | requests (2.32.5) works but no async, no HTTP/2. httpx is the modern successor |
| HTTP Client | httpx | aiohttp | aiohttp is async-only. httpx does both sync and async with same API |
| CLI Framework | Typer | Click | Click (8.x) works but more boilerplate. Typer wraps Click with type hints |
| CLI Framework | Typer | argparse | argparse is stdlib but verbose. Typer generates help, completion automatically |
| HTML Parser | BeautifulSoup+lxml | selectolax | selectolax (0.4.6) is 5-30x faster but less familiar API. BeautifulSoup preferred per user spec |
| HTML Parser | lxml backend | html.parser | html.parser is stdlib but 5-10x slower than lxml |
| HTML Parser | lxml backend | html5lib | html5lib handles worst malformed HTML but extremely slow. Use only if lxml fails |
| Caching | DiskCache | sqlite-utils | sqlite-utils is lower-level. DiskCache provides caching primitives out of the box |
| Caching | DiskCache | Redis | Redis requires external service. DiskCache is embedded, zero config |
| Tables | Rich | tabulate | tabulate is simpler but Rich is already a dependency and more powerful |
| Config | pydantic-settings | python-dotenv | python-dotenv is simpler but no validation. pydantic-settings provides type safety |
| Package Mgmt | uv | pip/poetry | pip is slower; poetry is slower and more complex. uv is the 2025/2026 standard |

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| Scrapy | Overkill for this project. Scrapy is a full framework for large-scale crawling. GitSneak is a focused CLI tool |
| Selenium/Playwright | GitHub's public pages are mostly server-rendered HTML. No need for browser automation overhead |
| requests | Use httpx instead. requests is legacy; no async, no HTTP/2 |
| asyncio throughout | Keep it simple. Use sync httpx first. Only add async if scraping becomes a bottleneck |
| MongoDB/PostgreSQL | SQLite via DiskCache is sufficient. External databases add deployment complexity |
| Click directly | Use Typer which wraps Click. Same power, less boilerplate |

## Project Structure

```
gitsneak/
├── pyproject.toml          # Project metadata, dependencies (PEP 518)
├── README.md
├── LICENSE
├── .env.example            # Example environment variables
├── src/
│   └── gitsneak/
│       ├── __init__.py
│       ├── __main__.py     # Entry point: python -m gitsneak
│       ├── cli.py          # Typer CLI commands
│       ├── scraper/
│       │   ├── __init__.py
│       │   ├── client.py   # httpx client with retry/UA rotation
│       │   ├── repo.py     # Repository page scraping
│       │   ├── user.py     # User profile scraping
│       │   └── parsers.py  # BeautifulSoup parsing logic
│       ├── cache/
│       │   ├── __init__.py
│       │   └── store.py    # DiskCache wrapper
│       ├── models/
│       │   ├── __init__.py
│       │   └── domain.py   # Pydantic models for data
│       ├── output/
│       │   ├── __init__.py
│       │   ├── tables.py   # Rich table formatters
│       │   └── html.py     # Jinja2 HTML report generation
│       ├── templates/      # Jinja2 templates
│       │   └── report.html
│       └── config.py       # pydantic-settings configuration
├── tests/
│   ├── conftest.py
│   ├── test_scraper/
│   ├── test_cache/
│   └── test_output/
└── .github/
    └── workflows/
        └── ci.yml
```

## Installation

```bash
# Create project with uv (recommended)
uv init gitsneak
cd gitsneak

# Add runtime dependencies
uv add typer httpx beautifulsoup4 lxml diskcache jinja2 pydantic-settings tenacity fake-useragent

# Add dev dependencies
uv add --dev pytest pytest-httpx ruff

# Or with traditional pip (slower)
pip install typer httpx beautifulsoup4 lxml diskcache jinja2 pydantic-settings tenacity fake-useragent
pip install -D pytest pytest-httpx ruff
```

## pyproject.toml

```toml
[project]
name = "gitsneak"
version = "0.1.0"
description = "CLI tool to analyze organizational investment in open-source projects"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "typer>=0.22.0",
    "httpx>=0.28.0",
    "beautifulsoup4>=4.14.0",
    "lxml>=6.0.0",
    "diskcache>=5.6.0",
    "jinja2>=3.1.0",
    "pydantic-settings>=2.12.0",
    "tenacity>=9.1.0",
    "fake-useragent>=2.2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=9.0.0",
    "pytest-httpx>=0.34.0",
    "ruff>=0.15.0",
]

[project.scripts]
gitsneak = "gitsneak.cli:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/gitsneak"]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
```

## Scraping-Specific Considerations

### Rate Limiting Strategy

```python
# Recommended approach with tenacity
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TimeoutException))
)
def fetch_page(client: httpx.Client, url: str) -> str:
    response = client.get(url)
    response.raise_for_status()
    return response.text
```

### User Agent Rotation

```python
from fake_useragent import UserAgent

ua = UserAgent(browsers=['Chrome', 'Firefox', 'Edge'])
headers = {'User-Agent': ua.random}
```

### Request Delays

Add 1-3 second delays between requests to avoid triggering GitHub's rate limiting. Use `time.sleep()` or httpx's built-in timeout handling.

## Key Dependencies Version Summary

| Package | Version | Released | Python Req |
|---------|---------|----------|------------|
| typer | 0.22.0 | 2026-02-11 | >=3.9 |
| httpx | 0.28.1 | 2024-12-06 | >=3.8 |
| beautifulsoup4 | 4.14.3 | 2025-11-30 | >=3.6 |
| lxml | 6.0.2 | 2025-09-22 | >=3.8 |
| rich | 14.3.2 | 2026-02-01 | >=3.8 |
| diskcache | 5.6.3 | 2023-08-31 | >=3.6 |
| jinja2 | 3.1.6 | 2025-03-05 | >=3.7 |
| pydantic-settings | 2.12.0 | 2025-11-10 | >=3.8 |
| tenacity | 9.1.4 | 2026-02-07 | >=3.10 |
| fake-useragent | 2.2.0 | 2025-04-14 | >=3.9 |
| pytest | 9.0.2 | 2025-12-06 | >=3.10 |
| ruff | 0.15.0 | 2026-02-03 | >=3.7 |
| uv | 0.10.2 | 2026-02-10 | N/A (Rust) |

## Sources

### Official Documentation (HIGH confidence)
- [PyPI - beautifulsoup4](https://pypi.org/project/beautifulsoup4/) - Version 4.14.3
- [PyPI - httpx](https://pypi.org/project/httpx/) - Version 0.28.1
- [PyPI - typer](https://pypi.org/project/typer/) - Version 0.22.0
- [PyPI - rich](https://pypi.org/project/rich/) - Version 14.3.2
- [PyPI - diskcache](https://pypi.org/project/diskcache/) - Version 5.6.3
- [PyPI - jinja2](https://pypi.org/project/Jinja2/) - Version 3.1.6
- [PyPI - pydantic-settings](https://pypi.org/project/pydantic-settings/) - Version 2.12.0
- [PyPI - tenacity](https://pypi.org/project/tenacity/) - Version 9.1.4
- [PyPI - fake-useragent](https://pypi.org/project/fake-useragent/) - Version 2.2.0
- [PyPI - pytest](https://pypi.org/project/pytest/) - Version 9.0.2
- [PyPI - ruff](https://pypi.org/project/ruff/) - Version 0.15.0
- [PyPI - uv](https://pypi.org/project/uv/) - Version 0.10.2
- [PyPI - lxml](https://pypi.org/project/lxml/) - Version 6.0.2
- [DiskCache Documentation](https://grantjenks.com/docs/diskcache/) - Tutorial and API
- [Typer Documentation](https://typer.tiangolo.com/) - Official docs, Click compatibility
- [Rich Tables Documentation](https://rich.readthedocs.io/en/stable/tables.html) - Table API
- [Pydantic Settings Documentation](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) - Configuration management
- [Tenacity Documentation](https://tenacity.readthedocs.io/) - Retry strategies

### Community Sources (MEDIUM confidence)
- [HTTPX vs Requests Comparison 2025](https://www.proxy-cheap.com/blog/httpx-vs-requests) - Performance benchmarks
- [Python CLI Best Practices 2025](https://medium.com/the-pythonworld/the-cleanest-way-to-structure-a-python-project-in-2025-4f04ccb8602f) - Project structure
- [Web Scraping Best Practices](https://www.zenrows.com/blog/bypass-bot-detection) - Anti-detection strategies
- [BeautifulSoup vs selectolax](https://medium.com/@yahyamrafe202/in-depth-comparison-of-web-scraping-parsers-lxml-beautifulsoup-and-selectolax-4f268ddea8df) - Parser comparison
- [uv Package Manager Guide](https://www.datacamp.com/tutorial/python-uv) - Modern Python package management
