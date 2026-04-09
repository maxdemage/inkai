// ─── Smart lore loading with summaries + relevance selection ──
// Generates per-file summaries (cached via content hashes) and
// asks a cheap LLM which lore files are relevant for a given task.
// Falls back to full lore context on error or few files.

import { chatSmall } from './llm/manager.js';
import {
  readLoreFiles,
  readLoreContext,
  getStaleLoreFiles,
  writeLoreSummary,
  hashLoreContent,
  readLoreSummaryContext,
} from './book/manager.js';
import {
  buildLoreFileSummaryPrompt,
  buildLoreRelevancePrompt,
} from './prompts/templates.js';
import { parseLLMJson } from './llm/parse.js';
import type { InkaiConfig } from './types.js';

export interface LoreSelectionCallbacks {
  onSummaryGenerateStart?: (count: number) => void;
  onSummaryGenerateProgress?: (filename: string) => void;
  onSummaryGenerateComplete?: () => void;
  onSelectionStart?: () => void;
  onSelectionComplete?: (files: string[]) => void;
}

/**
 * Regenerate summaries for any lore files whose content has changed.
 */
export async function ensureLoreSummaries(
  config: InkaiConfig,
  projectName: string,
  callbacks?: LoreSelectionCallbacks,
): Promise<void> {
  const staleFiles = await getStaleLoreFiles(config, projectName);
  if (staleFiles.length === 0) return;

  callbacks?.onSummaryGenerateStart?.(staleFiles.length);

  const loreFiles = await readLoreFiles(config, projectName);

  for (const filename of staleFiles) {
    callbacks?.onSummaryGenerateProgress?.(filename);

    const content = loreFiles[filename];
    const hash = hashLoreContent(content);

    const prompt = await buildLoreFileSummaryPrompt(filename, content);
    const summary = await chatSmall(config, [
      { role: 'system', content: 'You are a concise summariser. Output only the summary, no preamble.' },
      { role: 'user', content: prompt },
    ], { maxTokens: 500, temperature: 0.2 });

    await writeLoreSummary(config, projectName, filename, summary, hash);
  }

  callbacks?.onSummaryGenerateComplete?.();
}

/**
 * Smart lore loading: select only relevant lore files for a task.
 * If there are 3 or fewer lore files, returns everything (no point selecting).
 * Falls back to full lore context on error.
 */
export async function selectRelevantLore(
  config: InkaiConfig,
  projectName: string,
  taskDescription: string,
  callbacks?: LoreSelectionCallbacks,
): Promise<string> {
  // Ensure summaries are up to date
  await ensureLoreSummaries(config, projectName, callbacks);

  const loreFiles = await readLoreFiles(config, projectName);
  const loreFileNames = Object.keys(loreFiles).filter(f => f !== 'summary-of-chapters.md');

  // Not worth selecting when there are only a few files
  if (loreFileNames.length <= 3) {
    return readLoreContext(config, projectName);
  }

  callbacks?.onSelectionStart?.();

  try {
    const loreSummaryContext = await readLoreSummaryContext(config, projectName);

    const prompt = await buildLoreRelevancePrompt(loreSummaryContext, loreFileNames, taskDescription);
    const response = await chatSmall(config, [
      { role: 'system', content: 'You select relevant lore files. Respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ], { jsonMode: true, maxTokens: 200, temperature: 0.1 });

    const result = parseLLMJson<{ files: string[] }>(response, 'lore relevance');

    // Always include basic-lore.md + validate file names
    const selected = new Set<string>();
    if (loreFiles['basic-lore.md']) {
      selected.add('basic-lore.md');
    }

    for (const file of result.files) {
      if (loreFiles[file] && file !== 'summary-of-chapters.md') {
        selected.add(file);
      }
    }

    callbacks?.onSelectionComplete?.([...selected]);

    return [...selected]
      .map(name => `=== ${name} ===\n${loreFiles[name]}`)
      .join('\n\n');

  } catch {
    // Fall back to full context if selection fails
    return readLoreContext(config, projectName);
  }
}
