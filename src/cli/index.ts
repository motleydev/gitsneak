import { Command } from 'commander';
import type Database from 'better-sqlite3';
import { parseGitHubUrl, parseDelay } from './options.js';
import { logError, logWarning, logSuccess, logInfo, logVerbose } from '../output/logger.js';
import { createDatabase, closeDatabase, getDefaultDbPath } from '../cache/database.js';
import { CacheRepository } from '../cache/repository.js';
import { createClient } from '../scraper/client.js';
import { createProgressBar } from '../output/progress.js';
import type { GitSneakOptions, RepoInfo } from '../types/index.js';

// Track database for graceful shutdown
let db: Database.Database | null = null;

process.on('SIGINT', () => {
  if (db) closeDatabase(db);
  process.exit(130);
});

const program = new Command();

program
  .name('gitsneak')
  .description('Analyze organizational involvement in GitHub repositories')
  .version('1.0.0')
  .argument('<urls...>', 'GitHub repository URLs to analyze')
  .option('-v, --verbose', 'show detailed output (URLs fetched, timing)', false)
  .option('-q, --quiet', 'suppress progress, show only final output', false)
  .option('--delay <ms>', 'delay between requests in milliseconds', '1500')
  .option('--no-cache', 'bypass cache and fetch fresh data')
  .option('--fail-fast', 'stop on first error instead of continuing', false)
  .action(async (urls: string[], opts) => {
    const options: GitSneakOptions = {
      verbose: opts.verbose,
      quiet: opts.quiet,
      delay: parseDelay(opts.delay),
      cache: opts.cache,
      failFast: opts.failFast,
    };

    // Validate mutual exclusivity
    if (options.verbose && options.quiet) {
      logError('Cannot use --verbose and --quiet together');
      process.exitCode = 1;
      return;
    }

    // Parse and validate all URLs first
    const repos: RepoInfo[] = [];
    for (const url of urls) {
      try {
        repos.push(parseGitHubUrl(url));
      } catch (err) {
        logError(`Invalid GitHub URL: ${url}`, 'Use full URLs like https://github.com/owner/repo');
        if (options.failFast) {
          process.exitCode = 1;
          return;
        }
      }
    }

    if (repos.length === 0) {
      logError('No valid repository URLs provided');
      process.exitCode = 1;
      return;
    }

    // Log what we're about to do
    logInfo(`Analyzing ${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'}...`, options);
    for (const repo of repos) {
      logVerbose(`  - ${repo.owner}/${repo.repo}`, options);
    }

    // Initialize cache (unless --no-cache)
    let cache: CacheRepository | null = null;

    if (options.cache) {
      try {
        db = createDatabase();
        cache = new CacheRepository(db);
        logVerbose(`Cache initialized at ${getDefaultDbPath()}`, options);
      } catch (err) {
        logWarning(`Failed to initialize cache: ${err}. Continuing without cache.`);
      }
    } else {
      logVerbose('Cache disabled (--no-cache)', options);
    }

    // Create HTTP client
    const client = createClient(options, cache, (attempt, error) => {
      logWarning(`Retry ${attempt}/5: ${error.message}`);
    });

    // Create progress bar for fetch loop (respects quiet mode)
    const progressBar = createProgressBar(repos.length, 'Repositories', options);

    // Track if any errors occurred
    let hasErrors = false;

    // Fetch each repo with progress indication
    for (const repo of repos) {
      try {
        const result = await client.fetch(repo.url);
        logVerbose(`  ${repo.owner}/${repo.repo}: ${result.fromCache ? '(cached)' : '(fetched)'} ${result.html.length} bytes`, options);
        progressBar.increment({ status: result.fromCache ? 'cached' : 'fetched' });
      } catch (err) {
        hasErrors = true;
        progressBar.increment({ status: 'error' });
        logError(`Failed to fetch ${repo.url}: ${err}`);
        if (options.failFast) {
          progressBar.stop();
          process.exitCode = 1;
          break;
        }
      }
    }

    // Stop progress bar when done
    progressBar.stop();

    // Show cache stats
    if (cache) {
      const stats = cache.getStats();
      logInfo(`Cache: ${stats.hits} cached, ${stats.misses} fetched`, options);
    }

    // Cleanup
    if (db) {
      closeDatabase(db);
      db = null;
    }

    // Only show success if no errors (or continue through errors)
    if (!hasErrors) {
      logSuccess('Foundation infrastructure verified. Data extraction will be implemented in Phase 2.');
    } else if (!options.failFast) {
      logInfo('Completed with errors. Some repositories could not be fetched.', options);
    }
  });

export function main(): void {
  program.parse();
}

main();
