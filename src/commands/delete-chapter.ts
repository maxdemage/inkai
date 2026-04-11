import { select, confirm } from '@inquirer/prompts';
import type { Command } from '../types.js';
import { deleteChapter } from '../book/manager.js';
import { header, success, warn, error, info, blank, c } from '../ui.js';

export const deleteChapterCommand: Command = {
  name: 'delete-chapter',
  description: 'Delete a chapter and renumber subsequent ones',
  aliases: ['remove-chapter'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;

    if (book.chapterCount === 0) {
      error('No chapters to delete.');
      return;
    }

    header('Delete Chapter');

    let chapterNumber: number;

    if (args[0]) {
      chapterNumber = parseInt(args[0], 10);
      if (isNaN(chapterNumber) || chapterNumber < 1 || chapterNumber > book.chapterCount) {
        error(`Invalid chapter number. Must be between 1 and ${book.chapterCount}.`);
        return;
      }
    } else {
      const choices = Array.from({ length: book.chapterCount }, (_, i) => ({
        name: `Chapter ${i + 1}`,
        value: i + 1,
      }));
      chapterNumber = await select({
        message: 'Which chapter to delete?',
        choices,
      });
    }

    blank();
    warn(`This will permanently delete Chapter ${chapterNumber} and all its files (text, review, plan).`);
    if (chapterNumber < book.chapterCount) {
      warn(`Chapters ${chapterNumber + 1}–${book.chapterCount} will be renumbered down by one.`);
    }
    blank();

    const confirmed = await confirm({
      message: `Delete Chapter ${chapterNumber}? This cannot be undone.`,
      default: false,
    });

    if (!confirmed) {
      info('Cancelled.');
      return;
    }

    await deleteChapter(ctx.config, book.id, book.projectName, chapterNumber, book.chapterCount);
    ctx.selectedBook!.chapterCount = book.chapterCount - 1;

    blank();
    success(`Chapter ${chapterNumber} deleted.`);
    if (chapterNumber < book.chapterCount) {
      info(`Remaining chapters renumbered. Total: ${c.value(String(book.chapterCount - 1))}`);
    }
  },
};
