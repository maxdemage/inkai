// ─── Token usage & cost tracking ─────────────────────────────
// Providers report token counts on each response. We persist them
// to an append-only JSONL log in the inkai dir so usage survives
// restarts AND is shared across processes (server, CLI, and the
// detached background worker all append to the same file).
// Spend is estimated with a coarse pricing table.

import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getInkaiDir } from '../config.js';
import type { LLMProviderName, LLMUsage, UsageTotals } from '../types.js';

// Approximate USD per 1M tokens [inputPrice, outputPrice].
// Coarse on purpose — meant for spend awareness, not billing.
// Matched by case-insensitive substring against the model id.
const PRICING: { match: string; input: number; output: number }[] = [
  // OpenAI
  { match: 'gpt-4o-mini', input: 0.15, output: 0.6 },
  { match: 'gpt-4o',      input: 2.5,  output: 10 },
  { match: 'gpt-4.1-mini', input: 0.4, output: 1.6 },
  { match: 'gpt-4.1',     input: 2,    output: 8 },
  { match: 'o3-mini',     input: 1.1,  output: 4.4 },
  // Anthropic
  { match: 'haiku',       input: 0.8,  output: 4 },
  { match: 'sonnet',      input: 3,    output: 15 },
  { match: 'opus',        input: 15,   output: 75 },
  // Google Gemini
  { match: 'flash',       input: 0.15, output: 0.6 },
  { match: 'gemini-2.5-pro', input: 1.25, output: 10 },
  { match: 'gemini',      input: 1.25, output: 5 },
];

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const m = model.toLowerCase();
  const row = PRICING.find((p) => m.includes(p.match));
  if (!row) return 0;
  return (promptTokens / 1_000_000) * row.input + (completionTokens / 1_000_000) * row.output;
}

// ─── Persistence ─────────────────────────────────────────────

function usageFile(): string {
  // Overridable for tests; defaults to ~/.inkai/usage.jsonl
  return process.env.INKAI_USAGE_FILE ?? join(getInkaiDir(), 'usage.jsonl');
}

export function recordUsage(
  provider: LLMProviderName,
  model: string,
  promptTokens: number,
  completionTokens: number,
): LLMUsage {
  const usage: LLMUsage = {
    provider,
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: estimateCost(model, promptTokens, completionTokens),
    timestamp: new Date().toISOString(),
  };

  try {
    const file = usageFile();
    mkdirSync(dirname(file), { recursive: true });
    // Append a single line. POSIX append writes of this size are atomic,
    // so concurrent processes (server + worker) won't corrupt each other.
    appendFileSync(file, JSON.stringify(usage) + '\n', 'utf-8');
  } catch {
    // Never let usage logging break an LLM call.
  }

  return usage;
}

export function getUsageRecords(): LLMUsage[] {
  const file = usageFile();
  if (!existsSync(file)) return [];
  let raw: string;
  try {
    raw = readFileSync(file, 'utf-8');
  } catch {
    return [];
  }
  const records: LLMUsage[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as LLMUsage);
    } catch {
      // skip malformed lines
    }
  }
  return records;
}

function sum(list: readonly LLMUsage[]): UsageTotals {
  return list.reduce<UsageTotals>(
    (acc, u) => ({
      promptTokens: acc.promptTokens + u.promptTokens,
      completionTokens: acc.completionTokens + u.completionTokens,
      totalTokens: acc.totalTokens + u.totalTokens,
      costUsd: acc.costUsd + u.costUsd,
      calls: acc.calls + 1,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, calls: 0 },
  );
}

export function getUsageSummary(): {
  totals: UsageTotals;
  byProvider: Record<string, UsageTotals>;
  byModel: Record<string, UsageTotals>;
} {
  const records = getUsageRecords();
  const byProvider: Record<string, UsageTotals> = {};
  const byModel: Record<string, UsageTotals> = {};

  for (const provider of new Set(records.map((r) => r.provider))) {
    byProvider[provider] = sum(records.filter((r) => r.provider === provider));
  }
  for (const model of new Set(records.map((r) => r.model))) {
    byModel[model] = sum(records.filter((r) => r.model === model));
  }

  return { totals: sum(records), byProvider, byModel };
}

export function resetUsage(): void {
  try {
    writeFileSync(usageFile(), '', 'utf-8');
  } catch {
    // ignore
  }
}
