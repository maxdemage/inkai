#!/usr/bin/env node
// ─── Background chapter writer ──────────────────────────────
// Spawned as a detached process by inkai. Reads a job file,
// runs the LLM pipeline (write → QA → save → summarise), and
// writes results back to disk. Safe to survive parent exit.

import { loadJob, saveJob } from './jobs.js';
import { chatWriter, chatSmall } from './llm/manager.js';
import {
  writeChapter,
  updateChapterSummary,
  getBookDir,
} from './book/manager.js';
import { updateBook } from './db.js';
import { initDB } from './db.js';
import { gitCommit } from './git.js';
import {
  buildChapterWritingFromPlanPrompt,
  buildChapterQAPrompt,
  buildSummaryUpdatePrompt,
} from './prompts/templates.js';
import { initPromptFiles } from './prompts/loader.js';
import type { InkaiConfig } from './types.js';

async function run(): Promise<void> {
  const jobId = process.argv[2];
  if (!jobId) {
    process.exit(1);
  }

  // Initialise subsystems the worker needs
  await initDB();
  await initPromptFiles();

  const job = await loadJob(jobId);
  if (!job) {
    process.exit(1);
  }

  const config: InkaiConfig = JSON.parse(job.configSnapshot);

  // Mark running
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.pid = process.pid;
  await saveJob(job);

  try {
    // ─── Step 4: Write the chapter ──────────────────────────

    const writePrompt = await buildChapterWritingFromPlanPrompt(
      job.loreContext,
      job.styleGuide,
      job.chapterPlan,
      job.chapterNumber,
      job.writingInstructions,
    );

    let chapterContent = await chatWriter(config, [
      {
        role: 'system',
        content: 'You are an expert fiction writer. You receive a lore bible, style guide, and a detailed chapter plan. Write the complete chapter following the plan precisely. Output only the chapter in markdown.',
      },
      { role: 'user', content: writePrompt },
    ], { maxTokens: 8192, temperature: 0.8 });

    // ─── Step 5: QA agent ───────────────────────────────────

    try {
      const qaPrompt = await buildChapterQAPrompt(
        job.loreContext,
        job.styleGuide,
        job.chapterPlan,
        chapterContent,
        job.chapterNumber,
      );

      const qaResponse = await chatWriter(config, [
        {
          role: 'system',
          content: 'You are a quality assurance editor. Check the chapter against lore and plan. Fix issues directly. Always respond with valid JSON.',
        },
        { role: 'user', content: qaPrompt },
      ], { jsonMode: true, maxTokens: 8192, temperature: 0.3 });

      try {
        const qaResult = JSON.parse(qaResponse);
        if (qaResult.changes_made && qaResult.chapter) {
          chapterContent = qaResult.chapter;
        }
      } catch {
        // QA parse failed — keep original draft
      }
    } catch {
      // QA call failed — keep original draft
    }

    // ─── Step 6: Save and summarise ─────────────────────────

    await writeChapter(config, job.projectName, job.chapterNumber, chapterContent);

    // Update summary
    try {
      const summaryPrompt = await buildSummaryUpdatePrompt(
        job.chapterSummary,
        chapterContent,
        job.chapterNumber,
      );

      const updatedSummary = await chatSmall(config, [
        { role: 'system', content: 'You are a book assistant. Update the summary document. Output only markdown.' },
        { role: 'user', content: summaryPrompt },
      ], { maxTokens: 2000 });

      await updateChapterSummary(config, job.projectName, updatedSummary);
    } catch {
      // Summary update failed — non-fatal
    }

    // Update DB
    await updateBook(job.bookId, { chapterCount: job.chapterNumber });

    // Git commit
    if (config.git.enabled && config.git.autoCommit) {
      const bookDir = getBookDir(config, job.projectName);
      await gitCommit(bookDir, `Write Chapter ${job.chapterNumber} (background)`);
    }

    // Mark done
    job.status = 'done';
    job.finishedAt = new Date().toISOString();
    await saveJob(job);
  } catch (err: any) {
    job.status = 'failed';
    job.error = err.message ?? String(err);
    job.finishedAt = new Date().toISOString();
    await saveJob(job);
    process.exit(1);
  }
}

run();
