# Default: list available recipes
default:
  @just --list

# Build TypeScript to dist/
build:
  npm run build

# Run tests (placeholder until tests exist)
test:
  @echo "No tests configured yet"

# Lint and type check
lint:
  npm run lint

# Generate man page from markdown (used by 05-02)
man:
  mkdir -p man
  npx marked-man docs/gitsneak.1.md --section 1 --name gitsneak --version $(node -p "require('./package.json').version") > man/gitsneak.1

# Clean all generated files
clean:
  rm -rf dist man

# Full build for release (clean + build + man)
release-build: clean build man
  @echo "Release build complete"

# Verify npm package contents
verify:
  npm pack --dry-run

# Create git tag and push (CI handles npm publish)
release version:
  npm version {{version}} -m "release: v%s"
  git push --follow-tags
