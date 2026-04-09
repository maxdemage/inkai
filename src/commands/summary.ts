import type { Command } from '../types.js';
import { readChapterSummary } from '../book/manager.js';
import { header, blank, boxMessage, info, c } from '../ui.js';

export const summaryCommand: Command = {
  name: 'summary',
  description: 'Show the chapter summary document',
  aliases: ['chapters-summary'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Chapter Summary');

    const summary = await readChapterSummary(ctx.config, book.projectName);

    blank();
    boxMessage(summary, `${book.title} — Summary of Chapters`);
    blank();
    info(`Chapters written: ${c.value(String(book.chapterCount))}`);
    blank();
  },
};
