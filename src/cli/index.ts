import { Command } from 'commander';
import type Database from 'better-sqlite3';
import { parseGitHubUrl, parseDelay, parseSince } from './options.js';
import { logError, logWarning, logSuccess, logInfo, logVerbose } from '../output/logger.js';
import { createDatabase, closeDatabase, getDefaultDbPath } from '../cache/database.js';
import { CacheRepository } from '../cache/repository.js';
import { createClient } from '../scraper/client.js';
import { createProgressBar } from '../output/progress.js';
import { collectContributors } from '../collectors/index.js';
import type { CollectionResult } from '../collectors/index.js';
import { generateReport, displayReport } from '../reporting/index.js';
import type { GitSneakOptions, RepoInfo } from '../types/index.js';

// Track database for graceful shutdown
let db: Database.Database | null = null;

// Track abort controller for graceful shutdown
let currentAbortController: AbortController | null = null;

process.on('SIGINT', () => {
  // Signal abort to current collection
  if (currentAbortController) {
    currentAbortController.abort();
  }
  // Close database gracefully
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
  .option('--since <date>', 'filter to activity after date (ISO or relative like 12m, 1y)', '12m')
  .option('--no-cache', 'bypass cache and fetch fresh data')
  .option('--fail-fast', 'stop on first error instead of continuing', false)
  .action(async (urls: string[], opts) => {
    // Parse --since option
    let since: Date;
    try {
      since = parseSince(opts.since);
    } catch (err) {
      logError(`Invalid --since value: ${opts.since}`, (err as Error).message);
      process.exitCode = 1;
      return;
    }

    const options: GitSneakOptions = {
      verbose: opts.verbose,
      quiet: opts.quiet,
      delay: parseDelay(opts.delay),
      cache: opts.cache,
      failFast: opts.failFast,
      since,
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
    const sinceStr = since.toISOString().split('T')[0];
    logInfo(`Analyzing ${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'} (since ${sinceStr})...`, options);
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

    // Track if any errors occurred
    let hasErrors = false;

    // Store collection results for reporting
    const collectionResults: CollectionResult[] = [];
    const repoNames: string[] = [];

    // Process each repository
    for (const repo of repos) {
      // Create abort controller for this repo
      currentAbortController = new AbortController();

      // Create progress bar for this repo
      const progressBar = createProgressBar(100, `${repo.owner}/${repo.repo}`, options);
      let lastStage = '';

      try {
        logVerbose(`\nCollecting contributors from ${repo.owner}/${repo.repo}...`, options);

        const result = await collectContributors(client, repo.owner, repo.repo, {
          since: options.since,
          signal: currentAbortController.signal,
          verbose: options.verbose,
          onProgress: (stage, current, total) => {
            // Update progress bar with stage info
            if (stage !== lastStage) {
              lastStage = stage;
            }

            // Format progress display
            const progress = total ? Math.round((current / total) * 100) : 0;
            const countStr = total ? `${current}/${total}` : `${current}`;
            progressBar.update(progress, { status: `${stage}: ${countStr}` });
          },
        });

        // Stop progress bar
        progressBar.stop();

        if (result.aborted) {
          logWarning('Collection interrupted. Partial data saved to cache.');
          break;
        }

        // Store result for reporting
        collectionResults.push(result);
        repoNames.push(`${repo.owner}/${repo.repo}`);

        // Show completion summary
        const { stats } = result;
        logSuccess(`Found ${stats.uniqueContributors} contributors:`);
        logInfo(`  - ${stats.commits.toLocaleString()} commits`, options);
        logInfo(`  - ${stats.prsAuthored + stats.prsReviewed} PRs (${stats.prsAuthored} authored, ${stats.prsReviewed} reviewed)`, options);
        logInfo(`  - ${stats.issuesAuthored + stats.issuesCommented} issues (${stats.issuesAuthored} authored, ${stats.issuesCommented} commented)`, options);

      } catch (err) {
        hasErrors = true;
        progressBar.stop();
        logError(`Failed to collect from ${repo.url}: ${err}`);
        if (options.failFast) {
          process.exitCode = 1;
          break;
        }
      } finally {
        currentAbortController = null;
      }
    }

    // Show cache stats
    if (cache) {
      const stats = cache.getStats();
      logInfo(`Cache: ${stats.hits} cached, ${stats.misses} fetched`, options);
    }

    // Generate and display report if we have results
    if (collectionResults.length > 0) {
      const report = generateReport(collectionResults, repoNames);
      displayReport(report, options);
    }

    // Cleanup
    if (db) {
      closeDatabase(db);
      db = null;
    }

    // Final status
    if (hasErrors && !options.failFast) {
      logInfo('Completed with errors. Some repositories could not be analyzed.', options);
    }
  });

export function main(): void {
  program.parse();
}

main();
