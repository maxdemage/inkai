import type { Command } from '../types.js';
import { listJobs, deleteJob, isJobProcessAlive, type ChapterJob } from '../jobs.js';
import { header, info, success, warn, error, blank, c, divider, boxMessage } from '../ui.js';
import { confirm } from '@inquirer/prompts';

function statusLabel(job: ChapterJob): string {
  switch (job.status) {
    case 'pending':
      return c.muted('⏳ pending');
    case 'running':
      if (isJobProcessAlive(job.pid)) {
        return c.value('⚙️  running');
      }
      return c.error('💀 crashed (process dead)');
    case 'done':
      return c.primary('✅ done');
    case 'failed':
      return c.error('❌ failed');
  }
}

function elapsed(job: ChapterJob): string {
  if (!job.startedAt) return '';
  const start = new Date(job.startedAt).getTime();
  const end = job.finishedAt ? new Date(job.finishedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export const jobsCommand: Command = {
  name: 'jobs',
  description: 'Show background chapter writing jobs',
  aliases: ['bg', 'background'],

  async execute(args, _ctx) {
    header('Background Jobs');

    const jobs = await listJobs();

    if (jobs.length === 0) {
      info('No background jobs found.');
      blank();
      return;
    }

    // Sub-command: clear
    if (args[0] === 'clear') {
      const finished = jobs.filter(j => j.status === 'done' || j.status === 'failed');
      if (finished.length === 0) {
        info('Nothing to clear.');
        blank();
        return;
      }
      const proceed = await confirm({
        message: `Remove ${finished.length} finished job(s)?`,
        default: true,
      });
      if (proceed) {
        for (const j of finished) {
          await deleteJob(j.id);
        }
        success(`Cleared ${finished.length} job(s).`);
      }
      blank();
      return;
    }

    // List all jobs
    for (const job of jobs) {
      const title = `${job.bookTitle} — Chapter ${job.chapterNumber}`;
      const status = statusLabel(job);
      const time = elapsed(job);

      console.log(`  ${c.value(title)}`);
      console.log(`    Status: ${status}${time ? `  (${c.muted(time)})` : ''}`);
      console.log(`    Job ID: ${c.muted(job.id)}`);

      if (job.status === 'failed' && job.error) {
        console.log(`    Error:  ${c.error(job.error)}`);
      }

      blank();
    }

    const running = jobs.filter(j => j.status === 'running' && isJobProcessAlive(j.pid));
    const done = jobs.filter(j => j.status === 'done');
    const failed = jobs.filter(j => j.status === 'failed');

    divider();
    info(`${running.length} running, ${done.length} done, ${failed.length} failed`);
    if (done.length + failed.length > 0) {
      info(`Use ${c.primary('/jobs clear')} to remove finished jobs.`);
    }
    blank();
  },
};
