import { Command } from 'commander';
import type Database from 'better-sqlite3';
import { writeFile } from 'node:fs/promises';
import { parseGitHubUrl, parseDelay, parseSince } from './options.js';
import { logError, logWarning, logSuccess, logInfo, logVerbose } from '../output/logger.js';
import { createDatabase, closeDatabase, getDefaultDbPath } from '../cache/database.js';
import { CacheRepository } from '../cache/repository.js';
import { createClient } from '../scraper/client.js';
import { createProgressBar } from '../output/progress.js';
import { collectContributors, collectPRContributors } from '../collectors/index.js';
import type { CollectionResult } from '../collectors/index.js';
import { generateReport, displayReport } from '../reporting/index.js';
import { generateHtmlReport, openReport } from '../output/html-report.js';
import type { GitSneakOptions, AnalysisTarget } from '../types/index.js';

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
  .option('--html [path]', 'generate HTML report (optionally specify output path)')
  .addHelpText('after', `
Examples:
  $ gitsneak https://github.com/facebook/react
      Analyze contributors to React

  $ gitsneak https://github.com/facebook/react/pull/28000
      Analyze participants in a single PR

  $ gitsneak -v --since 6m https://github.com/org/repo
      Verbose analysis of last 6 months

  $ gitsneak --html report.html https://github.com/org/repo https://github.com/org/repo/pull/123
      Generate HTML report for repo and PR combined

Date formats for --since:
  ISO date:    2025-01-01
  Relative:    12m (months), 1y (year), 2w (weeks), 30d (days)

Environment:
  NO_COLOR     Disable colored output

Documentation:
  man gitsneak
  https://github.com/jesseops/gitsneak
`)
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
      html: opts.html,
    };

    // Validate mutual exclusivity
    if (options.verbose && options.quiet) {
      logError('Cannot use --verbose and --quiet together');
      process.exitCode = 1;
      return;
    }

    // Parse and validate all URLs first
    const targets: AnalysisTarget[] = [];
    for (const url of urls) {
      try {
        targets.push(parseGitHubUrl(url));
      } catch (err) {
        logError(`Invalid GitHub URL: ${url}`, 'Use full URLs like https://github.com/owner/repo or https://github.com/owner/repo/pull/123');
        if (options.failFast) {
          process.exitCode = 1;
          return;
        }
      }
    }

    if (targets.length === 0) {
      logError('No valid GitHub URLs provided');
      process.exitCode = 1;
      return;
    }

    // Log what we're about to do
    const sinceStr = since.toISOString().split('T')[0];
    const repoCount = targets.filter(t => t.type === 'repo').length;
    const prCount = targets.filter(t => t.type === 'pr').length;
    const targetDesc = [
      repoCount > 0 ? `${repoCount} repositor${repoCount === 1 ? 'y' : 'ies'}` : '',
      prCount > 0 ? `${prCount} PR${prCount === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' and ');
    logInfo(`Analyzing ${targetDesc} (since ${sinceStr})...`, options);
    for (const target of targets) {
      if (target.type === 'pr') {
        logVerbose(`  - ${target.owner}/${target.repo}#${target.prNumber}`, options);
      } else {
        logVerbose(`  - ${target.owner}/${target.repo}`, options);
      }
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
    const targetNames: string[] = [];

    // Process each target (repo or PR)
    for (const target of targets) {
      // Create abort controller for this target
      currentAbortController = new AbortController();

      // Create label for progress bar
      const targetLabel = target.type === 'pr'
        ? `${target.owner}/${target.repo}#${target.prNumber}`
        : `${target.owner}/${target.repo}`;

      // Create progress bar for this target
      const progressBar = createProgressBar(100, targetLabel, options);
      let lastStage = '';

      try {
        if (target.type === 'pr') {
          logVerbose(`\nCollecting contributors from PR ${targetLabel}...`, options);

          const result = await collectPRContributors(client, target.owner, target.repo, target.prNumber, {
            signal: currentAbortController.signal,
            verbose: options.verbose,
            onProgress: (stage, current, total) => {
              if (stage !== lastStage) {
                lastStage = stage;
              }
              const progress = total ? Math.round((current / total) * 100) : 0;
              const countStr = total ? `${current}/${total}` : `${current}`;
              progressBar.update(progress, { status: `${stage}: ${countStr}` });
            },
          });

          progressBar.stop();

          if (result.aborted) {
            logWarning('Collection interrupted. Partial data saved to cache.');
            break;
          }

          collectionResults.push(result);
          targetNames.push(targetLabel);

          const { stats } = result;
          logSuccess(`Found ${stats.uniqueContributors} contributors in PR:`);
          logInfo(`  - ${stats.commits.toLocaleString()} commits`, options);
          logInfo(`  - ${stats.prsAuthored} PR author, ${stats.prsReviewed} reviewers`, options);
          logInfo(`  - ${stats.issuesCommented} comments`, options);
        } else {
          logVerbose(`\nCollecting contributors from ${targetLabel}...`, options);

          const result = await collectContributors(client, target.owner, target.repo, {
            since: options.since,
            signal: currentAbortController.signal,
            verbose: options.verbose,
            onProgress: (stage, current, total) => {
              if (stage !== lastStage) {
                lastStage = stage;
              }
              const progress = total ? Math.round((current / total) * 100) : 0;
              const countStr = total ? `${current}/${total}` : `${current}`;
              progressBar.update(progress, { status: `${stage}: ${countStr}` });
            },
          });

          progressBar.stop();

          if (result.aborted) {
            logWarning('Collection interrupted. Partial data saved to cache.');
            break;
          }

          collectionResults.push(result);
          targetNames.push(targetLabel);

          const { stats } = result;
          logSuccess(`Found ${stats.uniqueContributors} contributors:`);
          logInfo(`  - ${stats.commits.toLocaleString()} commits`, options);
          logInfo(`  - ${stats.prsAuthored + stats.prsReviewed} PRs (${stats.prsAuthored} authored, ${stats.prsReviewed} reviewed)`, options);
          logInfo(`  - ${stats.issuesAuthored + stats.issuesCommented} issues (${stats.issuesAuthored} authored, ${stats.issuesCommented} commented)`, options);
        }

      } catch (err) {
        hasErrors = true;
        progressBar.stop();
        logError(`Failed to collect from ${target.url}: ${err}`);
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
      const report = generateReport(collectionResults, targetNames);
      displayReport(report, options);

      // Generate HTML report if requested
      if (options.html) {
        const html = generateHtmlReport(report);

        if (typeof options.html === 'string') {
          // Write to specified path
          await writeFile(options.html, html, 'utf-8');
          logSuccess(`HTML report written to ${options.html}`);
        } else {
          // Write to temp and open in browser
          const reportPath = await openReport(html);
          logSuccess(`HTML report opened: ${reportPath}`);
        }
      }
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
