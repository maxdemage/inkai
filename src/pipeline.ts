// ─── Shared chapter-writing pipeline (steps 4-6) ────────────
// Used by both the interactive create-chapter command and the
// background worker, so bug fixes only need to happen once.

import { chatWriter, chatSmall } from './llm/manager.js';
import {
  writeChapter,
  updateChapterSummary,
  getBookDir,
} from './book/manager.js';
import { updateBook } from './db.js';
import { gitCommit } from './git.js';
import {
  buildChapterWritingFromPlanPrompt,
  buildChapterQAPrompt,
  buildSummaryUpdatePrompt,
} from './prompts/templates.js';
import { parseLLMJson } from './llm/parse.js';
import type { InkaiConfig } from './types.js';

export interface PipelineInput {
  config: InkaiConfig;
  projectName: string;
  bookId: string;
  chapterNumber: number;
  loreContext: string;
  styleGuide: string;
  chapterSummary: string;
  chapterPlan: string;
  writingInstructions: string | null;
  commitMessage?: string;
}

export interface PipelineCallbacks {
  onWriteStart?: () => void;
  onWriteComplete?: () => void;
  onQAStart?: () => void;
  onQAComplete?: (result: { changesMade: boolean; issues?: string[] }) => void;
  onQAParseError?: () => void;
  onQAError?: (err: unknown) => void;
  onSaveStart?: () => void;
  onSaveComplete?: (filePath: string) => void;
  onSummaryComplete?: () => void;
  onSummaryError?: () => void;
}

export interface PipelineResult {
  chapterContent: string;
  filePath: string;
  qaApplied: boolean;
  summaryUpdated: boolean;
}

export async function runChapterPipeline(
  input: PipelineInput,
  callbacks?: PipelineCallbacks,
): Promise<PipelineResult> {
  const {
    config, projectName, bookId, chapterNumber,
    loreContext, styleGuide, chapterSummary, chapterPlan, writingInstructions,
  } = input;

  // ─── Step 4: Write the chapter ────────────────────────────

  callbacks?.onWriteStart?.();

  const writePrompt = await buildChapterWritingFromPlanPrompt(
    loreContext, styleGuide, chapterPlan, chapterNumber, writingInstructions,
  );

  let chapterContent = await chatWriter(config, [
    {
      role: 'system',
      content: 'You are an expert fiction writer. You receive a lore bible, style guide, and a detailed chapter plan. Write the complete chapter following the plan precisely. Output only the chapter in markdown.',
    },
    { role: 'user', content: writePrompt },
  ], { maxTokens: 8192, temperature: 0.8 });

  callbacks?.onWriteComplete?.();

  // ─── Step 5: QA agent ─────────────────────────────────────

  let qaApplied = false;
  callbacks?.onQAStart?.();

  try {
    const qaPrompt = await buildChapterQAPrompt(
      loreContext, styleGuide, chapterPlan, chapterContent, chapterNumber,
    );

    const qaResponse = await chatWriter(config, [
      {
        role: 'system',
        content: 'You are a quality assurance editor. Check the chapter against lore and plan. Fix issues directly. Always respond with valid JSON.',
      },
      { role: 'user', content: qaPrompt },
    ], { jsonMode: true, maxTokens: 8192, temperature: 0.3 });

    try {
      const qaResult = parseLLMJson<{ changes_made: boolean; chapter?: string; issues_found?: string[] }>(qaResponse, 'chapter QA');
      if (qaResult.changes_made && qaResult.chapter) {
        chapterContent = qaResult.chapter;
        qaApplied = true;
        callbacks?.onQAComplete?.({ changesMade: true, issues: qaResult.issues_found });
      } else {
        callbacks?.onQAComplete?.({ changesMade: false });
      }
    } catch {
      callbacks?.onQAParseError?.();
    }
  } catch (err) {
    callbacks?.onQAError?.(err);
  }

  // ─── Step 6: Save and summarize ───────────────────────────

  callbacks?.onSaveStart?.();

  const filePath = await writeChapter(config, projectName, chapterNumber, chapterContent);
  callbacks?.onSaveComplete?.(filePath);

  let summaryUpdated = false;
  try {
    const summaryPrompt = await buildSummaryUpdatePrompt(
      chapterSummary, chapterContent, chapterNumber,
    );

    const updatedSummary = await chatSmall(config, [
      { role: 'system', content: 'You are a book assistant. Update the summary document. Output only markdown.' },
      { role: 'user', content: summaryPrompt },
    ], { maxTokens: 2000 });

    await updateChapterSummary(config, projectName, updatedSummary);
    summaryUpdated = true;
    callbacks?.onSummaryComplete?.();
  } catch {
    callbacks?.onSummaryError?.();
  }

  await updateBook(bookId, { chapterCount: chapterNumber, summaryFresh: false });

  if (config.git.enabled && config.git.autoCommit) {
    const bookDir = getBookDir(config, projectName);
    const msg = input.commitMessage ?? `Write Chapter ${chapterNumber}`;
    await gitCommit(bookDir, msg);
  }

  return { chapterContent, filePath, qaApplied, summaryUpdated };
}
