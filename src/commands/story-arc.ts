import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import {
  readLoreContext,
  readChapterSummary,
  readLoreFiles,
  writeLoreFiles,
  getBookDir,
} from '../book/manager.js';
import { updateBook } from '../db.js';
import { chatWriter } from '../llm/manager.js';
import { multilineInput } from '../multiline.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { buildStoryArcGeneratePrompt } from '../prompts/templates.js';
import { header, success, info, warn, blank, boxMessage, divider, c } from '../ui.js';

export const storyArcCommand: Command = {
  name: 'story-arc',
  description: 'Generate or regenerate the book-level story arc',
  aliases: ['arc'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Story Arc');

    const spinner = ora({ text: 'Loading book context...', color: 'cyan' }).start();

    const [loreContext, chapterSummary, loreFiles] = await Promise.all([
      readLoreContext(ctx.config, book.projectName),
      readChapterSummary(ctx.config, book.projectName),
      readLoreFiles(ctx.config, book.projectName),
    ]);

    spinner.succeed('Context loaded');

    const hasExisting = !!loreFiles['story-arc.md'];

    if (hasExisting) {
      blank();
      boxMessage(loreFiles['story-arc.md'], 'Current Story Arc');
      blank();

      const regenerate = await confirm({
        message: 'Regenerate the story arc? This will replace the current one.',
        default: false,
      });

      if (!regenerate) {
        info('Story arc unchanged.');
        return;
      }
    } else {
      blank();
      info('No story arc found. Let\'s generate one.');
    }

    // ─── Author guidance ────────────────────────────────────

    blank();
    info('Provide any guidance for the story arc — ending ideas, themes, plot directions, etc.');
    info('Leave empty to let the AI generate based on your existing lore.');
    blank();
    const authorGuidance = await multilineInput('Story arc guidance (optional):');

    // ─── Generate ───────────────────────────────────────────

    spinner.start('Generating story arc (writer LLM — this may take a moment)...');

    try {
      const prompt = await buildStoryArcGeneratePrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        purpose: book.purpose,
        summary: book.summary || '',
        loreContext,
        chapterSummary,
        authorGuidance: authorGuidance.trim(),
      });

      const content = await chatWriter(ctx.config, [
        {
          role: 'system',
          content: 'You are an expert story architect. Generate a detailed, actionable story arc document in markdown.',
        },
        { role: 'user', content: prompt },
      ], { maxTokens: 4096, temperature: 0.7 });

      await writeLoreFiles(ctx.config, book.projectName, { 'story-arc.md': content });
      spinner.succeed('Story arc generated');

      // Invalidate lore summaries since we changed a lore file
      await updateBook(book.id, { summaryFresh: false });

      // Git commit
      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, hasExisting ? 'Regenerate story arc' : 'Generate story arc');
      }

      blank();
      divider();
      blank();
      boxMessage(content, 'Story Arc');
      blank();
      success('Story arc saved to lore/story-arc.md');
      info(`Edit it anytime with ${c.primary('/edit-lore story-arc.md')} or regenerate with ${c.primary('/story-arc')}`);
      blank();
    } catch (err: unknown) {
      spinner.fail('Failed to generate story arc: ' + (err instanceof Error ? err.message : String(err)));
    }
  },
};
