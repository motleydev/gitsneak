import pc from 'picocolors';
import type { GitSneakOptions } from '../types/index.js';

export function logError(message: string, suggestion?: string): void {
  console.error(pc.red(`Error: ${message}`));
  if (suggestion) {
    console.error(pc.yellow(`  Suggestion: ${suggestion}`));
  }
}

export function logWarning(message: string): void {
  console.warn(pc.yellow(`Warning: ${message}`));
}

export function logSuccess(message: string): void {
  console.log(pc.green(message));
}

export function logVerbose(message: string, options: GitSneakOptions): void {
  if (options.verbose && !options.quiet) {
    console.log(pc.dim(message));
  }
}

export function logInfo(message: string, options: GitSneakOptions): void {
  if (!options.quiet) {
    console.log(message);
  }
}
