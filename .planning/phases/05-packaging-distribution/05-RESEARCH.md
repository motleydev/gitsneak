# Phase 5: Packaging & Distribution - Research

**Researched:** 2026-02-13
**Domain:** CLI packaging, Homebrew distribution, man pages, task automation
**Confidence:** HIGH

## Summary

This phase involves packaging gitsneak for professional distribution via Homebrew, including man page generation, enhanced help output, and build automation with Justfile. The primary challenge is that gitsneak uses better-sqlite3 (native addon), which requires Node.js at runtime when distributed via Homebrew tap.

The recommended approach is:
1. **Homebrew tap with Node.js dependency** - The standard, well-supported approach for Node.js CLIs with native addons
2. **marked-man** for man page generation from markdown
3. **Commander.js configureHelp()** for enhanced --help output with sections and examples
4. **just** task runner for build/test/release workflows
5. **GitHub Actions** for automated formula updates on release

**Primary recommendation:** Use Homebrew tap with Node.js runtime dependency (not standalone SEA), generate man pages with marked-man, enhance help with Commander.js styling, and automate everything with Justfile and GitHub Actions.

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| just | 1.x | Task runner for build/test/release | Simpler than Make, cross-platform, single binary |
| marked-man | 2.x | Markdown to man page (roff) | Standard for Node.js CLI man pages |
| Homebrew tap | - | Package distribution | Standard macOS/Linux package manager |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| gh CLI | latest | GitHub release automation | Creating releases, managing tap |
| npm publish | - | Tarball source for Homebrew | Formula downloads from npm registry |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Homebrew tap (Node dep) | Node.js SEA (Single Executable) | SEA is CommonJS only; gitsneak uses ESM and native addons - not compatible |
| Homebrew tap (Node dep) | pkg/nexe | Native addon (better-sqlite3) bundling is complex/fragile |
| marked-man | remark-man | marked-man simpler, more widely used |
| just | Make | Make is ubiquitous but complex syntax, poor Windows support |
| just | npm scripts | Limited composition, no help/listing |

**Why NOT standalone executable:**
1. Node.js SEA (--build-sea) requires CommonJS - gitsneak uses ESM
2. Native addon (better-sqlite3) bundling is complex with SEA/pkg
3. Homebrew with Node.js dependency is well-supported, simpler
4. Users installing CLI tools via Homebrew expect this pattern

## Architecture Patterns

### Recommended Project Structure

```
gitsneak/
├── src/                    # TypeScript source
├── dist/                   # Built bundle (tsup)
├── man/
│   └── gitsneak.1          # Generated man page (roff)
├── docs/
│   └── gitsneak.1.md       # Man page source (markdown)
├── support/
│   └── homebrew-formula.rb # Formula template for automation
├── justfile                # Build/test/release tasks
├── package.json            # npm config
├── tsup.config.ts          # Bundler config
└── .github/
    └── workflows/
        ├── ci.yml          # Test on push
        └── release.yml     # Publish + update tap
```

### Pattern 1: Homebrew Tap with Node.js Dependency

**What:** Distribute via custom tap that depends on Homebrew's `node` formula
**When to use:** Node.js CLIs with native addons (better-sqlite3)
**Formula structure:**

```ruby
# Source: https://docs.brew.sh/Node-for-Formula-Authors
require "language/node"

class Gitsneak < Formula
  desc "Analyze organizational involvement in GitHub repositories"
  homepage "https://github.com/user/gitsneak"
  url "https://registry.npmjs.org/gitsneak/-/gitsneak-1.0.0.tgz"
  sha256 "abc123..."
  license "MIT"

  depends_on "node"
  depends_on "python" => :build  # Required for native addon (better-sqlite3)

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
    man1.install "man/gitsneak.1"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/gitsneak --version")
  end
end
```

### Pattern 2: Man Page from Markdown

**What:** Write man page content in markdown, convert to roff with marked-man
**When to use:** Any CLI needing man pages
**Example:**

```markdown
# gitsneak(1) -- analyze organizational involvement in GitHub repositories

## SYNOPSIS

`gitsneak` [options] <urls...>

## DESCRIPTION

gitsneak analyzes GitHub repositories to identify organizational involvement
by examining commits, pull requests, issues, and contributor profiles.

## OPTIONS

  * `-v`, `--verbose`:
    Show detailed output including URLs fetched and timing information.

  * `-q`, `--quiet`:
    Suppress progress indicators, show only final output.

  * `--since` <date>:
    Filter to activity after date. Accepts ISO dates (2025-01-01) or
    relative formats (12m, 6mo, 1y, 2w, 30d). Default: 12m

## EXAMPLES

Analyze a single repository:

    gitsneak https://github.com/facebook/react

Analyze multiple repositories with verbose output:

    gitsneak -v https://github.com/org/repo1 https://github.com/org/repo2

## EXIT STATUS

  * `0`: Success
  * `1`: Error (invalid URL, network failure, etc.)
  * `130`: Interrupted (Ctrl+C)

## SEE ALSO

GitHub: https://github.com/user/gitsneak
```

### Pattern 3: Enhanced Commander.js Help

**What:** Customize --help output with sections, styling, examples
**When to use:** Any CLI using Commander.js
**Example:**

```typescript
// Source: https://github.com/tj/commander.js/blob/master/docs/help-in-depth.md
import { Command } from 'commander';

const program = new Command();

program
  .name('gitsneak')
  .description('Analyze organizational involvement in GitHub repositories')
  .version('1.0.0')
  .configureHelp({
    sortOptions: true,
    showGlobalOptions: false,
  })
  .addHelpText('after', `
Examples:
  $ gitsneak https://github.com/facebook/react
  $ gitsneak -v --since 6m https://github.com/org/repo
  $ gitsneak --html report.html https://github.com/org/repo

Environment:
  NO_COLOR    Disable colored output

More info:
  man gitsneak
  https://github.com/user/gitsneak
`);
```

### Pattern 4: Justfile for Build Automation

**What:** Define common tasks in justfile
**When to use:** Every project
**Example:**

```just
# Source: https://just.systems/man/en/

# Default recipe - show available commands
default:
  @just --list

# Build TypeScript to dist/
build:
  npm run build

# Run tests
test:
  npm test

# Lint code
lint:
  npm run lint

# Generate man page from markdown
man:
  npx marked-man docs/gitsneak.1.md > man/gitsneak.1

# Clean build artifacts
clean:
  rm -rf dist man/gitsneak.1

# Build everything for release
release-build: clean build man
  @echo "Built dist/ and man/"

# Create a new release (prompts for version)
release version:
  npm version {{version}}
  git push && git push --tags

# Publish to npm
publish: release-build
  npm publish
```

### Anti-Patterns to Avoid

- **Hand-rolling man pages in roff:** Write in markdown, convert with marked-man
- **Using pkg/nexe with native addons:** Complex configuration, fragile builds
- **Skipping std_npm_args in Homebrew:** Required for proper npm environment
- **Manual formula SHA updates:** Automate with GitHub Actions
- **Using make for simple tasks:** just is simpler and cross-platform

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Man page formatting | Raw roff macros | marked-man | Markdown is readable, roff is not |
| Homebrew formula updates | Manual SHA calculation | GitHub Actions workflow | Error-prone, tedious |
| Build task orchestration | Shell scripts | justfile | Discoverability, cross-platform |
| Help text formatting | Custom string building | Commander addHelpText | Consistent formatting, less code |
| SHA256 calculation | Manual curl + shasum | Automated in workflow | Reproducible, no mistakes |

**Key insight:** The packaging ecosystem has mature tooling. Using it correctly is the challenge, not building alternatives.

## Common Pitfalls

### Pitfall 1: SEA/pkg with Native Addons

**What goes wrong:** Build fails or runtime crashes when bundling better-sqlite3
**Why it happens:** Native addons (.node files) require special handling, platform-specific binaries, complex configuration
**How to avoid:** Use Homebrew with Node.js dependency - native addons work naturally
**Warning signs:** "Cannot find module" errors, NAPI version mismatches, platform-specific crashes

### Pitfall 2: Missing python Build Dependency

**What goes wrong:** Homebrew formula fails to build on user machines
**Why it happens:** better-sqlite3 uses node-gyp which requires Python
**How to avoid:** Add `depends_on "python" => :build` to formula
**Warning signs:** "gyp ERR! find Python" in brew install output

### Pitfall 3: Stale Formula SHA256

**What goes wrong:** `brew install` fails with checksum mismatch
**Why it happens:** npm tarball SHA changed after publish, or manual calculation error
**How to avoid:** Automate formula updates in GitHub Actions, calculate SHA from actual tarball
**Warning signs:** "SHA256 mismatch" errors during brew install

### Pitfall 4: Man Page Not Installed

**What goes wrong:** `man gitsneak` returns "No manual entry"
**Why it happens:** Forgot to add man1.install to formula, or man/ not in npm tarball
**How to avoid:** Include man/ in package.json files array, install in formula
**Warning signs:** Man page works locally but not after brew install

### Pitfall 5: npm Tarball Missing Files

**What goes wrong:** Installed CLI missing required files
**Why it happens:** .npmignore or package.json files array excludes needed files
**How to avoid:** Test with `npm pack` and inspect tarball before publishing
**Warning signs:** Works in dev, fails after npm install

### Pitfall 6: Homebrew Tap Repository Naming

**What goes wrong:** `brew tap user/repo` fails
**Why it happens:** Tap repository must be named `homebrew-<name>`, not just `<name>`
**How to avoid:** Name repository `homebrew-gitsneak` on GitHub
**Warning signs:** "Repository not found" errors with brew tap

## Code Examples

### Man Page Generation Script (package.json)

```json
{
  "scripts": {
    "build": "tsup",
    "build:man": "npx marked-man docs/gitsneak.1.md --section 1 --name gitsneak > man/gitsneak.1",
    "prepublishOnly": "npm run build && npm run build:man"
  },
  "files": [
    "dist",
    "man"
  ]
}
```

### Complete Justfile

```just
# Source: https://just.systems/man/en/

set shell := ["bash", "-cu"]

# Default: list available recipes
default:
  @just --list

# Build TypeScript bundle
build:
  npm run build

# Run tests
test:
  npm test

# Lint and type check
lint:
  npx tsc --noEmit

# Generate man page from markdown
man:
  mkdir -p man
  npx marked-man docs/gitsneak.1.md --section 1 --name gitsneak --version $(node -p "require('./package.json').version") > man/gitsneak.1

# Clean all generated files
clean:
  rm -rf dist man

# Full build for release
release-build: clean build man
  @echo "Release build complete"

# Verify npm package contents
verify:
  npm pack --dry-run

# Create release (CI does the rest)
release version:
  npm version {{version}} -m "release: v%s"
  git push --follow-tags
```

### GitHub Actions Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run build
      - run: npm run build:man
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  update-tap:
    needs: publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: user/homebrew-gitsneak
          token: ${{ secrets.TAP_GITHUB_TOKEN }}

      - name: Update formula
        run: |
          VERSION="${GITHUB_REF#refs/tags/v}"
          TARBALL_URL="https://registry.npmjs.org/gitsneak/-/gitsneak-${VERSION}.tgz"
          SHA256=$(curl -sL "$TARBALL_URL" | shasum -a 256 | cut -d' ' -f1)

          sed -i "s|url \".*\"|url \"${TARBALL_URL}\"|" Formula/gitsneak.rb
          sed -i "s|sha256 \".*\"|sha256 \"${SHA256}\"|" Formula/gitsneak.rb

          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add Formula/gitsneak.rb
          git commit -m "gitsneak ${VERSION}"
          git push
```

### Enhanced Help Output

```typescript
// src/cli/index.ts
import { Command } from 'commander';

const program = new Command();

program
  .name('gitsneak')
  .description('Analyze organizational involvement in GitHub repositories')
  .version('1.0.0')
  .argument('<urls...>', 'GitHub repository URLs to analyze')
  .option('-v, --verbose', 'show detailed output (URLs fetched, timing)', false)
  .option('-q, --quiet', 'suppress progress, show only final output', false)
  .option('--delay <ms>', 'delay between requests in milliseconds', '1500')
  .option('--since <date>', 'filter to activity after date (ISO or relative like 12m, 1y)', '12m')
  .option('--no-cache', 'bypass cache and fetch fresh data')
  .option('--fail-fast', 'stop on first error instead of continuing', false)
  .option('--html [path]', 'generate HTML report (optionally specify output path)')
  .configureHelp({
    sortOptions: false,  // Keep logical grouping
  })
  .addHelpText('after', `
Examples:
  $ gitsneak https://github.com/facebook/react
      Analyze contributors to React

  $ gitsneak -v --since 6m https://github.com/org/repo
      Verbose analysis of last 6 months

  $ gitsneak --html report.html https://github.com/org/repo1 https://github.com/org/repo2
      Generate HTML report for multiple repos

Date formats for --since:
  ISO date:    2025-01-01
  Relative:    12m (months), 1y (year), 2w (weeks), 30d (days)

Environment:
  NO_COLOR     Disable colored output

Documentation:
  man gitsneak
  https://github.com/user/gitsneak
`);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pkg/nexe for standalone | Node.js SEA (--build-sea) | Node.js 25.5 (Jan 2026) | Native SEA in Node core |
| Manual Homebrew formula updates | GitHub Actions automation | 2023+ | No manual SHA calculation |
| Raw roff man pages | Markdown with marked-man | Stable | Maintainable documentation |
| Make/npm scripts | just command runner | Growing adoption | Simpler syntax, better UX |

**Deprecated/outdated:**
- **pkg for ESM projects:** pkg primarily supports CommonJS; Node.js SEA is the future but also CommonJS-only currently
- **Manual SHA256 in formulas:** Should be automated via CI/CD

## Open Questions

1. **Native addon formula revision bumps**
   - What we know: Formulas with native addons need revision when Node major version changes
   - What's unclear: How to automate detection/notification
   - Recommendation: Add note to formula maintenance docs, monitor Node.js releases

2. **ESM support in Node.js SEA**
   - What we know: Current SEA only supports CommonJS
   - What's unclear: Timeline for ESM support
   - Recommendation: Continue with Homebrew tap approach; revisit when SEA supports ESM

## Sources

### Primary (HIGH confidence)
- [Homebrew Node.js Formula Guide](https://docs.brew.sh/Node-for-Formula-Authors) - Official documentation
- [Commander.js help-in-depth](https://github.com/tj/commander.js/blob/master/docs/help-in-depth.md) - Help customization
- [Just Programmer's Manual](https://just.systems/man/en/) - Task runner reference
- [Node.js SEA Documentation](https://nodejs.org/api/single-executable-applications.html) - Official SEA docs
- [Homebrew Taps Documentation](https://docs.brew.sh/Taps) - Tap creation guide

### Secondary (MEDIUM confidence)
- [marked-man GitHub](https://github.com/kapouer/marked-man) - Man page generation tool
- [Automatically maintaining Homebrew formulas](https://til.simonwillison.net/homebrew/auto-formulas-github-actions) - Simon Willison's workflow
- [Node.js 25.5 --build-sea](https://progosling.com/en/dev-digest/2026-01/nodejs-25-5-build-sea-single-executable) - SEA improvements

### Tertiary (LOW confidence)
- [Just Best Practices](https://www.chicks.net/reference/file_formats/just/) - Community patterns (verify against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Homebrew and Commander.js documentation
- Architecture: HIGH - Verified patterns from homebrew-core examples
- Pitfalls: HIGH - Known issues from official docs and issue trackers

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable domain, but check SEA progress)
