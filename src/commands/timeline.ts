import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import {
  readLoreFiles,
  readLoreNotes,
  readChapterSummary,
  writeLoreFiles,
  getBookDir,
} from '../book/manager.js';
import { updateBook } from '../db.js';
import { chatWriter } from '../llm/manager.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { buildTimelineGeneratePrompt } from '../prompts/templates.js';
import { header, success, info, blank, boxMessage, divider, c } from '../ui.js';

export const timelineCommand: Command = {
  name: 'timeline',
  description: 'Generate a chronology from lore, chapters, and notes — flags impossible sequencing',
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Timeline');

    const spinner = ora({ text: 'Loading book context...', color: 'cyan' }).start();

    const [loreFiles, chapterSummary, notesContext] = await Promise.all([
      readLoreFiles(ctx.config, book.projectName),
      readChapterSummary(ctx.config, book.projectName),
      readLoreNotes(ctx.config, book.projectName),
    ]);

    const fileCount = Object.keys(loreFiles).length;
    spinner.succeed(`Loaded ${fileCount} lore files`);

    const hasExisting = !!loreFiles['timeline.md'];

    if (hasExisting) {
      blank();
      boxMessage(loreFiles['timeline.md'], 'Current Timeline');
      blank();

      const regenerate = await confirm({
        message: 'Regenerate the timeline? This will replace the current one.',
        default: false,
      });

      if (!regenerate) {
        info('Timeline unchanged.');
        return;
      }
    } else {
      blank();
      info('No timeline.md found. Generating from all available sources...');
    }

    // ─── Generate ───────────────────────────────────────────

    spinner.start('Building timeline (writer LLM — synthesizing all sources)...');

    try {
      const prompt = await buildTimelineGeneratePrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        loreFiles,
        chapterSummary,
        notesContext,
      });

      const content = await chatWriter(ctx.config, [
        {
          role: 'system',
          content: 'You are an expert story chronologist. Build a precise timeline and flag any sequencing issues. Output only markdown.',
        },
        { role: 'user', content: prompt },
      ], { maxTokens: 8192, temperature: 0.4 });

      await writeLoreFiles(ctx.config, book.projectName, { 'timeline.md': content });
      spinner.succeed('Timeline generated');

      await updateBook(book.id, { summaryFresh: false });

      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, hasExisting ? 'Regenerate timeline' : 'Generate timeline');
      }

      blank();
      divider();
      blank();
      boxMessage(content, 'Timeline');
      blank();
      success('Timeline saved to lore/timeline.md');
      info(`Edit anytime with ${c.primary('/edit-lore timeline.md')} or regenerate with ${c.primary('/timeline')}`);
      blank();
    } catch (err: unknown) {
      spinner.fail('Failed to generate timeline: ' + (err instanceof Error ? err.message : String(err)));
    }
  },
};
