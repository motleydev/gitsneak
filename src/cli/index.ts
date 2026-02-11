import { Command } from 'commander';
import { parseGitHubUrl, parseDelay } from './options.js';
import { logError, logSuccess, logInfo, logVerbose } from '../output/logger.js';
import type { GitSneakOptions, RepoInfo } from '../types/index.js';

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

    // Placeholder for actual processing (Phase 2+)
    logSuccess('URL validation complete. Processing will be implemented in future phases.');
  });

export function main(): void {
  program.parse();
}

main();
