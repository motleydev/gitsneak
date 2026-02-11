import cliProgress, { SingleBar, MultiBar } from 'cli-progress';
import pc from 'picocolors';
import type { GitSneakOptions } from '../types/index.js';

// No-op progress bar for quiet mode
const noopBar: SingleBar = {
  start: () => {},
  update: () => {},
  increment: () => {},
  stop: () => {},
  setTotal: () => {},
  updateETA: () => {},
  getProgress: () => 0,
  getTotal: () => 0,
  startTime: null,
  isActive: false,
  value: 0,
  total: 0,
  lastDrawnString: '',
  eta: { getTime: () => 0, getRate: () => 0 },
  payload: {},
  on: () => {},
  off: () => {},
  once: () => {},
  emit: () => false,
  removeListener: () => {},
  addListener: () => {},
  removeAllListeners: () => {},
  listeners: () => [],
  listenerCount: () => 0,
  rawListeners: () => [],
  eventNames: () => [],
  prependListener: () => {},
  prependOnceListener: () => {},
  setMaxListeners: () => {},
  getMaxListeners: () => 0,
} as unknown as SingleBar;

export function createProgressBar(
  total: number,
  repoName: string,
  options?: GitSneakOptions
): SingleBar {
  if (options?.quiet) {
    return noopBar;
  }

  const bar = new cliProgress.SingleBar({
    format: `${pc.cyan('{repo}')} [{bar}] {percentage}% | {value}/{total} | {status}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  bar.start(total, 0, { repo: repoName, status: 'starting' });
  return bar;
}

export function createMultiProgress(options?: GitSneakOptions): MultiBar | null {
  if (options?.quiet) {
    return null;
  }

  return new cliProgress.MultiBar({
    format: `${pc.cyan('{repo}')} [{bar}] {percentage}% | {value}/{total} | {status}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    clearOnComplete: false,
    stopOnComplete: true,
  });
}
