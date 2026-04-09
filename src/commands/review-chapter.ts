import ora from 'ora';
import type { Command } from '../types.js';
import {
  readLoreContext,
  readStyleGuide,
  readChapter,
  writeReview,
} from '../book/manager.js';
import { chatWriter } from '../llm/manager.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { getBookDir } from '../book/manager.js';
import { buildChapterReviewPrompt } from '../prompts/templates.js';
import { ensureLoreSummaries } from '../lore.js';
import { header, success, info, error, blank, boxMessage, c } from '../ui.js';

export const reviewChapterCommand: Command = {
  name: 'review-chapter',
  description: 'Get AI review of a chapter',
  aliases: ['review'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;
    const totalChapters = book.chapterCount;

    if (totalChapters === 0) {
      error('No chapters written yet. Use /create-chapter first.');
      return;
    }

    let chapterNum = args[0] ? parseInt(args[0], 10) : totalChapters;

    if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > totalChapters) {
      error(`Invalid chapter number. Available: 1-${totalChapters}`);
      return;
    }

    header(`Review Chapter ${chapterNum}`);

    const spinner = ora({ text: 'Loading chapter...', color: 'cyan' }).start();

    const chapterContent = await readChapter(ctx.config, book.projectName, chapterNum);
    if (!chapterContent) {
      spinner.fail(`Chapter ${chapterNum} not found.`);
      return;
    }

    const [loreContext, styleGuide] = await Promise.all([
      readLoreContext(ctx.config, book.projectName),
      readStyleGuide(ctx.config, book.projectName),
    ]);

    // Keep summaries fresh while we're at it
    await ensureLoreSummaries(ctx.config, book.projectName);

    spinner.text = `Reviewing Chapter ${chapterNum} (writer LLM)...`;

    try {
      const review = await chatWriter(ctx.config, [
        { role: 'system', content: 'You are an expert literary editor. Provide thorough, constructive feedback in markdown.' },
        { role: 'user', content: await buildChapterReviewPrompt(loreContext, styleGuide, chapterContent, chapterNum) },
      ], { maxTokens: 4096, temperature: 0.5 });

      const filePath = await writeReview(ctx.config, book.projectName, chapterNum, review);
      spinner.succeed(`Review complete`);

      blank();
      boxMessage(review.slice(0, 2000) + (review.length > 2000 ? '\n\n...(truncated — use /read-review to read full review)' : ''), `Review: Chapter ${chapterNum}`);
      blank();
      info(`Full review saved: ${c.muted(filePath)}`);
      info(`Use ${c.primary(`/read-review ${chapterNum}`)} to read the full review.`);
      info(`Use ${c.primary(`/rewrite-chapter ${chapterNum}`)} to apply suggestions.`);
      blank();

      // Git commit
      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, `Review Chapter ${chapterNum}`);
      }

    } catch (err: unknown) {
      spinner.fail('Review failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  },
};
