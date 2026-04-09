#!/usr/bin/env node

import { showBanner, info, success, warn, blank, c } from './ui.js';
import { loadConfig, saveConfig, isConfigured, hasAnyProvider, loadSession } from './config.js';
import { initDB, getAllBooks, getBookByName } from './db.js';
import { checkGit, isGitAvailable } from './git.js';
import { initPromptFiles } from './prompts/loader.js';
import { listJobs, isJobProcessAlive } from './jobs.js';
import { startREPL } from './repl.js';
import { input, select, password, confirm } from '@inquirer/prompts';
import type { AppContext, LLMProviderName } from './types.js';

async function main(): Promise<void> {
  // ─── Banner ─────────────────────────────────────────────

  showBanner();

  // ─── Check git ──────────────────────────────────────────

  const gitOk = await checkGit();

  // ─── Initialize database & prompt files ─────────────────

  await initDB();
  await initPromptFiles();

  // ─── Load or create config ──────────────────────────────

  let config = await loadConfig();

  if (gitOk) {
    config.git.enabled = true;
    await saveConfig(config);
  }

  // Show system status
  if (gitOk) {
    success('Git detected — version control enabled');
  } else {
    warn('Git not found — version control disabled');
  }

  // ─── First-time setup ──────────────────────────────────

  if (!(await isConfigured()) || !(await hasAnyProvider(config))) {
    blank();
    info('Welcome! Let\'s configure your LLM providers.');
    info('You need at least one provider to get started.');
    blank();

    const provider = await select({
      message: 'Which LLM provider would you like to set up first?',
      choices: [
        { name: 'OpenAI (GPT-4o, GPT-4o-mini)', value: 'openai' as LLMProviderName },
        { name: 'Anthropic (Claude Opus, Sonnet)', value: 'anthropic' as LLMProviderName },
        { name: 'Google (Gemini 2.5 Pro, Flash)', value: 'gemini' as LLMProviderName },
      ],
    });

    const apiKey = await password({
      message: `Enter your ${provider} API key:`,
      mask: '*',
    });

    if (apiKey.trim()) {
      config.providers[provider] = { apiKey: apiKey.trim() };

      // Set default tiers based on chosen provider
      const defaults: Record<LLMProviderName, { small: string; medium: string; writer: string }> = {
        openai:    { small: 'gpt-4o-mini',            medium: 'gpt-4o',              writer: 'gpt-4o' },
        anthropic: { small: 'claude-sonnet-4-20250514', medium: 'claude-sonnet-4-20250514', writer: 'claude-opus-4-20250514' },
        gemini:    { small: 'gemini-2.0-flash',        medium: 'gemini-2.5-pro',      writer: 'gemini-3.1-pro' },
      };

      const d = defaults[provider];
      config.tiers.small  = { provider, model: d.small };
      config.tiers.medium = { provider, model: d.medium };
      config.tiers.writer = { provider, model: d.writer };

      await saveConfig(config);
      success(`${provider} configured! All tiers set to use ${provider}.`);
      info(`Use ${c.primary('/config')} later to fine-tune tiers or add more providers.`);
    }
  }

  // ─── Books directory ────────────────────────────────────────

  const { mkdir } = await import('node:fs/promises');
  await mkdir(config.booksDir, { recursive: true });

  // ─── Start REPL ─────────────────────────────────────────

  // Notify about background jobs
  const jobs = await listJobs();
  const running = jobs.filter(j => j.status === 'running' && isJobProcessAlive(j.pid));
  const done = jobs.filter(j => j.status === 'done');
  const failed = jobs.filter(j => j.status === 'failed');
  if (running.length + done.length + failed.length > 0) {
    blank();
    if (done.length)    success(`${done.length} background job(s) completed!`);
    if (running.length) info(`${running.length} background job(s) still running.`);
    if (failed.length)  warn(`${failed.length} background job(s) failed.`);
    info(`Use ${c.primary('/jobs')} for details.`);
  }

  // ─── Hint if no books exist ─────────────────────────────

  const allBooks = await getAllBooks();
  if (allBooks.filter(b => b.status !== 'archived').length === 0) {
    blank();
    info(`No books yet! Use ${c.primary('/create-book')} to start your first project.`);
  }

  const ctx: AppContext = {
    config,
    selectedBook: null,
    gitEnabled: isGitAvailable(),
  };

  // ─── Resume last session ────────────────────────────────

  const session = await loadSession();
  if (session?.lastBook) {
    const lastBook = await getBookByName(session.lastBook);
    if (lastBook && lastBook.status !== 'archived') {
      const chapters = lastBook.chapterCount;
      blank();
      const resume = await confirm({
        message: `Continue working on ${c.highlight(lastBook.title)}? (${chapters} chapter${chapters !== 1 ? 's' : ''})`,
        default: true,
      });
      if (resume) {
        ctx.selectedBook = lastBook;
        success(`Resumed: ${c.highlight(lastBook.projectName)}`);
      }
    }
  }

  await startREPL(ctx);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
