/**
 * Sleep for specified milliseconds with optional jitter
 */
export function sleep(ms: number, jitter: number = 0): Promise<void> {
  const actualDelay = jitter > 0
    ? ms + Math.floor(Math.random() * jitter * 2) - jitter
    : ms;
  return new Promise(resolve => setTimeout(resolve, Math.max(0, actualDelay)));
}

/**
 * Rate limiter that enforces minimum delay between calls
 */
export class RateLimiter {
  private lastRequestTime: number = 0;
  private delayMs: number;
  private jitterMs: number;

  constructor(delayMs: number = 1500, jitterMs: number = 200) {
    this.delayMs = delayMs;
    this.jitterMs = jitterMs;
  }

  async waitForNext(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const remaining = this.delayMs - elapsed;

    if (remaining > 0) {
      await sleep(remaining, this.jitterMs);
    }

    this.lastRequestTime = Date.now();
  }

  setDelay(delayMs: number): void {
    this.delayMs = delayMs;
  }
}
