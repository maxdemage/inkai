import type { Command } from '../types.js';
import { readReview } from '../book/manager.js';
import { startReader } from '../reader.js';
import { header, error, info, success, blank, c } from '../ui.js';

export const readReviewCommand: Command = {
  name: 'read-review',
  description: 'Read a chapter review in the CLI reader',
  aliases: ['view-review'],
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

    const review = await readReview(ctx.config, book.projectName, chapterNum);
    if (!review) {
      error(`No review found for Chapter ${chapterNum}. Use ${c.primary(`/review-chapter ${chapterNum}`)} first.`);
      return;
    }

    header(`Review: Chapter ${chapterNum}`);
    info('Entering reader mode...');
    blank();

    await startReader([{ title: `Review — Chapter ${chapterNum}`, content: review }]);

    success('Exited reader.');
    blank();
  },
};
