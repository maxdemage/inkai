import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getInkaiDir } from './config.js';

// ─── Job types ───────────────────────────────────────────────

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

export interface ChapterJob {
  id: string;
  status: JobStatus;
  bookId: string;
  projectName: string;
  bookTitle: string;
  chapterNumber: number;
  // All serialised context the worker needs
  configSnapshot: string;       // JSON-encoded InkaiConfig
  loreContext: string;
  styleGuide: string;
  chapterSummary: string;
  chapterPlan: string;
  writingInstructions: string | null;
  // Results
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  pid?: number;
}

// ─── Paths ───────────────────────────────────────────────────

const JOBS_DIR = join(getInkaiDir(), 'jobs');

export function getJobsDir(): string {
  return JOBS_DIR;
}

async function ensureJobsDir(): Promise<void> {
  if (!existsSync(JOBS_DIR)) {
    await mkdir(JOBS_DIR, { recursive: true });
  }
}

function jobPath(id: string): string {
  return join(JOBS_DIR, `${id}.json`);
}

export function jobLogPath(id: string): string {
  return join(JOBS_DIR, `${id}.log`);
}

// ─── CRUD ────────────────────────────────────────────────────

export async function saveJob(job: ChapterJob): Promise<void> {
  await ensureJobsDir();
  await writeFile(jobPath(job.id), JSON.stringify(job, null, 2), 'utf-8');
}

export async function loadJob(id: string): Promise<ChapterJob | null> {
  const p = jobPath(id);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, 'utf-8'));
}

export async function listJobs(): Promise<ChapterJob[]> {
  await ensureJobsDir();
  const files = await readdir(JOBS_DIR);
  const jobs: ChapterJob[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const data = await readFile(join(JOBS_DIR, f), 'utf-8');
      jobs.push(JSON.parse(data));
    } catch {
      // skip corrupt files
    }
  }
  // newest first
  jobs.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
  return jobs;
}

export async function deleteJob(id: string): Promise<void> {
  const p = jobPath(id);
  if (existsSync(p)) await unlink(p);
}

/** Check if a job's worker process is still alive. */
export function isJobProcessAlive(pid: number | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);   // signal 0 = just check if alive
    return true;
  } catch {
    return false;
  }
}
