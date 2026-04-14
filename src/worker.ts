#!/usr/bin/env node
// ─── Background chapter writer ──────────────────────────────
// Spawned as a detached process by inkai. Reads a job file,
// runs the shared LLM pipeline (write → QA → save → summarise),
// and writes results back to disk. Safe to survive parent exit.

import { loadJob, saveJob } from './jobs.js';
import { initDB } from './db.js';
import { initPromptFiles } from './prompts/loader.js';
import { runChapterPipeline } from './pipeline.js';
import type { InkaiConfig } from './types.js';

async function run(): Promise<void> {
  const jobId = process.argv[2];
  if (!jobId) {
    process.exit(1);
  }

  // Initialise subsystems the worker needs
  await initDB();

  const job = await loadJob(jobId);
  if (!job) {
    process.exit(1);
  }

  const config: InkaiConfig = JSON.parse(job.configSnapshot);
  await initPromptFiles(config.language ?? 'en');

  // Mark running
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.pid = process.pid;
  await saveJob(job);

  try {
    await runChapterPipeline({
      config,
      projectName: job.projectName,
      bookId: job.bookId,
      chapterNumber: job.chapterNumber,
      loreContext: job.loreContext,
      fullLoreContext: job.fullLoreContext,
      styleGuide: job.styleGuide,
      chapterSummary: job.chapterSummary,
      chapterPlan: job.chapterPlan,
      writingInstructions: job.writingInstructions,
      commitMessage: `Write Chapter ${job.chapterNumber} (background)`,
    });

    // Mark done
    job.status = 'done';
    job.finishedAt = new Date().toISOString();
    await saveJob(job);
  } catch (err: unknown) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    job.finishedAt = new Date().toISOString();
    await saveJob(job);
    process.exit(1);
  }
}

run();
