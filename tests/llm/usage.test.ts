import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import {
  estimateCost,
  recordUsage,
  getUsageSummary,
  getUsageRecords,
  resetUsage,
} from '../../src/llm/usage.js';

const TEST_USAGE_FILE = join(tmpdir(), `inkai-usage-test-${process.pid}.jsonl`);
process.env.INKAI_USAGE_FILE = TEST_USAGE_FILE;

afterAll(() => {
  try { rmSync(TEST_USAGE_FILE, { force: true }); } catch { /* ignore */ }
});

describe('estimateCost', () => {
  it('prices known models by substring match', () => {
    // gpt-4o-mini: 1M in @ $0.15, 1M out @ $0.60
    expect(estimateCost('gpt-4o-mini', 1_000_000, 1_000_000)).toBeCloseTo(0.75, 5);
    // opus: 1M in @ $15, 1M out @ $75
    expect(estimateCost('claude-opus-4-20250514', 1_000_000, 0)).toBeCloseTo(15, 5);
  });

  it('returns 0 for unknown models', () => {
    expect(estimateCost('some-unknown-model', 1000, 1000)).toBe(0);
  });

  it('matches the most specific pricing row first', () => {
    // gpt-4o-mini must not be priced as gpt-4o
    const mini = estimateCost('gpt-4o-mini', 1_000_000, 0);
    const full = estimateCost('gpt-4o', 1_000_000, 0);
    expect(mini).toBeLessThan(full);
  });
});

describe('usage accumulation', () => {
  beforeEach(() => resetUsage());

  it('records and totals usage', () => {
    recordUsage('openai', 'gpt-4o-mini', 100, 50);
    recordUsage('openai', 'gpt-4o-mini', 200, 100);

    const { totals, byModel, byProvider } = getUsageSummary();
    expect(totals.calls).toBe(2);
    expect(totals.promptTokens).toBe(300);
    expect(totals.completionTokens).toBe(150);
    expect(totals.totalTokens).toBe(450);
    expect(byModel['gpt-4o-mini'].calls).toBe(2);
    expect(byProvider['openai'].totalTokens).toBe(450);
  });

  it('separates totals by provider and model', () => {
    recordUsage('openai', 'gpt-4o-mini', 100, 100);
    recordUsage('anthropic', 'claude-opus-4-20250514', 100, 100);

    const { byProvider, byModel } = getUsageSummary();
    expect(Object.keys(byProvider).sort()).toEqual(['anthropic', 'openai']);
    expect(Object.keys(byModel).length).toBe(2);
  });

  it('resets cleanly', () => {
    recordUsage('gemini', 'gemini-2.5-pro', 10, 10);
    expect(getUsageRecords().length).toBe(1);
    resetUsage();
    expect(getUsageRecords().length).toBe(0);
    expect(getUsageSummary().totals.calls).toBe(0);
  });

  it('persists records to disk (survives a fresh read)', () => {
    recordUsage('openai', 'gpt-4o', 500, 250);
    // getUsageRecords reads from the file, not process memory —
    // proving the data is durable across restarts/processes.
    const fresh = getUsageRecords();
    expect(fresh.length).toBe(1);
    expect(fresh[0]).toMatchObject({ provider: 'openai', model: 'gpt-4o', totalTokens: 750 });
  });
});
