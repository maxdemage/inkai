import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import {
  readLoreContext,
  readStyleGuide,
  readChapter,
  readReview,
  writeChapter,
} from '../book/manager.js';
import { chatWriter } from '../llm/manager.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { getBookDir } from '../book/manager.js';
import { buildChapterReviewPrompt, buildChapterRewritePrompt } from '../prompts/templates.js';
import { header, success, info, error, warn, blank, c } from '../ui.js';

export const rewriteChapterCommand: Command = {
  name: 'rewrite-chapter',
  description: 'Rewrite a chapter based on review feedback',
  aliases: ['rewrite'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;
    const totalChapters = book.chapterCount;

    if (totalChapters === 0) {
      error('No chapters written yet.');
      return;
    }

    let chapterNum = args[0] ? parseInt(args[0], 10) : totalChapters;

    if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > totalChapters) {
      error(`Invalid chapter number. Available: 1-${totalChapters}`);
      return;
    }

    header(`Rewrite Chapter ${chapterNum}`);

    const spinner = ora({ text: 'Loading chapter and review...', color: 'cyan' }).start();

    const originalChapter = await readChapter(ctx.config, book.projectName, chapterNum);
    if (!originalChapter) {
      spinner.fail(`Chapter ${chapterNum} not found.`);
      return;
    }

    let reviewContent = await readReview(ctx.config, book.projectName, chapterNum);

    // If no review exists, run review first
    if (!reviewContent) {
      spinner.text = 'No review found. Running review first...';
      warn('No existing review found — generating one now.');

      const [loreContext, styleGuide] = await Promise.all([
        readLoreContext(ctx.config, book.projectName),
        readStyleGuide(ctx.config, book.projectName),
      ]);

      try {
        reviewContent = await chatWriter(ctx.config, [
          { role: 'system', content: 'You are an expert literary editor. Provide thorough, constructive feedback in markdown.' },
          { role: 'user', content: await buildChapterReviewPrompt(loreContext, styleGuide, originalChapter, chapterNum) },
        ], { maxTokens: 4096, temperature: 0.5 });

        const { writeReview } = await import('../book/manager.js');
        await writeReview(ctx.config, book.projectName, chapterNum, reviewContent);
        spinner.succeed('Review generated');
      } catch (err: unknown) {
        spinner.fail('Failed to generate review: ' + (err instanceof Error ? err.message : String(err)));
        return;
      }
    } else {
      spinner.succeed('Review loaded');
    }

    // Confirm rewrite
    const proceed = await confirm({
      message: `Rewrite Chapter ${chapterNum}? This will overwrite the current version.`,
      default: true,
    });

    if (!proceed) {
      info('Rewrite cancelled.');
      return;
    }

    // Perform rewrite
    spinner.start(`Rewriting Chapter ${chapterNum} (writer LLM)...`);

    const [loreContext, styleGuide] = await Promise.all([
      readLoreContext(ctx.config, book.projectName),
      readStyleGuide(ctx.config, book.projectName),
    ]);

    try {
      const rewrittenChapter = await chatWriter(ctx.config, [
        { role: 'system', content: 'You are an expert fiction writer. Rewrite the chapter incorporating all review feedback. Output only the chapter content in markdown.' },
        { role: 'user', content: await buildChapterRewritePrompt(loreContext, styleGuide, originalChapter, reviewContent, chapterNum) },
      ], { maxTokens: 8192, temperature: 0.7 });

      const filePath = await writeChapter(ctx.config, book.projectName, chapterNum, rewrittenChapter);
      spinner.succeed(`Chapter ${chapterNum} rewritten`);
      info(`Saved to: ${c.muted(filePath)}`);

      // Git commit
      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, `Rewrite Chapter ${chapterNum} based on review`);
      }

      blank();
      success(`Chapter ${chapterNum} has been rewritten!`);
      info(`Use ${c.primary(`/review-chapter ${chapterNum}`)} to review the new version.`);
      blank();

    } catch (err: unknown) {
      spinner.fail('Rewrite failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  },
};
