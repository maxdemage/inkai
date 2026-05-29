// ─── Retry, backoff, and timeout helpers for LLM calls ───────
// LLM providers occasionally return transient errors (rate limits,
// 5xx, network blips). A single failed call after an expensive
// chapter write is painful, so we retry with exponential backoff
// and jitter, and guard every call with a wall-clock timeout.

export const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes per request
export const DEFAULT_MAX_RETRIES = 3;

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`LLM request timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/** Reject the given promise if it does not settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Extract an HTTP-ish status code from an arbitrary error shape. */
function statusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const e = err as { status?: number; statusCode?: number; response?: { status?: number } };
  return e.status ?? e.statusCode ?? e.response?.status;
}

/** Decide whether an error is worth retrying. */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;

  const status = statusOf(err);
  if (status !== undefined) {
    // 429 = rate limit, 408 = request timeout, 5xx = server errors
    return status === 408 || status === 429 || status >= 500;
  }

  // Network-level errors that lack a status code
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('overloaded')
  );
}

export interface RetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  /** Base delay used for exponential backoff, in ms. */
  baseDelayMs?: number;
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run `fn` with a per-attempt timeout and exponential backoff + jitter.
 * Retries only transient errors; everything else is rethrown immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseDelayMs = opts.baseDelayMs ?? 1_000;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries || !isRetryableError(err)) break;
      // Exponential backoff with full jitter
      const ceiling = baseDelayMs * 2 ** attempt;
      const delay = Math.round(Math.random() * ceiling);
      opts.onRetry?.(attempt + 1, err, delay);
      await sleep(delay);
    }
  }
  throw lastErr;
}
