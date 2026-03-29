const DEFAULT_DELAY_SEC = 60;
const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;

export class RateLimitTimeoutError extends Error {
  constructor() {
    super("Rate limit retry timed out");
    this.name = "RateLimitTimeoutError";
  }
}

export async function rateLimitRetry<T>(
  fn: () => Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    try {
      return await fn();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      const isRateLimit =
        message.includes("rate limit") || message.includes("Rate limit");

      if (!isRateLimit) throw error;

      const retryAfterMatch = message.match(/retry-after:\s*(\d+)/);
      const delaySec = retryAfterMatch
        ? parseInt(retryAfterMatch[1], 10)
        : DEFAULT_DELAY_SEC;

      if (Date.now() + delaySec * 1000 > deadline) {
        throw new RateLimitTimeoutError();
      }

      console.error(`Rate limited, retrying in ${delaySec}s...`);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
    }
  }
}
