import { describe, it, expect, vi } from 'vitest';
import {
  withRetry,
  withTimeout,
  isRetryableError,
  TimeoutError,
} from '../../src/llm/retry.js';

describe('isRetryableError', () => {
  it('retries on 429 / 408 / 5xx status codes', () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 408 })).toBe(true);
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError({ statusCode: 502 })).toBe(true);
    expect(isRetryableError({ response: { status: 504 } })).toBe(true);
  });

  it('does NOT retry on 4xx client errors (except 408/429)', () => {
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 404 })).toBe(false);
  });

  it('retries on network-level errors', () => {
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryableError(new Error('socket hang up'))).toBe(true);
    expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    expect(isRetryableError(new Error('Overloaded'))).toBe(true);
  });

  it('retries on TimeoutError', () => {
    expect(isRetryableError(new TimeoutError(100))).toBe(true);
  });

  it('does not retry on generic errors', () => {
    expect(isRetryableError(new Error('bad input'))).toBe(false);
  });
});

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects with TimeoutError when it takes too long', async () => {
    const slow = new Promise((r) => setTimeout(r, 50));
    await expect(withTimeout(slow, 10)).rejects.toBeInstanceOf(TimeoutError);
  });

  it('passes through when ms <= 0', async () => {
    await expect(withTimeout(Promise.resolve(42), 0)).resolves.toBe(42);
  });
});

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const result = await withRetry(fn, { baseDelayMs: 1 });
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient errors then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValue('recovered');
    const onRetry = vi.fn();
    const result = await withRetry(fn, { baseDelayMs: 1, onRetry });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient errors', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400 });
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toEqual({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries and throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toEqual({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
