import type { Command } from '../types.js';
import { readChapter, readChapterNotes, writeChapterNotes } from '../book/manager.js';
import { startReader } from '../reader.js';
import type { ReaderPage } from '../reader.js';
import { multilineInput } from '../multiline.js';
import { header, error, info, success, blank } from '../ui.js';

export const readCommand: Command = {
  name: 'read',
  description: 'Read book chapters in a comfortable CLI reader',
  aliases: ['reader', 'view'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;
    const totalChapters = book.chapterCount;

    if (totalChapters === 0) {
      error('No chapters written yet. Use /create-chapter to write one.');
      return;
    }

    let startChapter = 1;
    if (args[0]) {
      const n = parseInt(args[0], 10);
      if (isNaN(n) || n < 1 || n > totalChapters) {
        error(`Invalid chapter number. Available: 1-${totalChapters}`);
        return;
      }
      startChapter = n;
    }

    header(`Reading: ${book.title}`);
    info(`${totalChapters} chapter(s) available. Starting at chapter ${startChapter}.`);
    info('Entering reader mode...');
    blank();

    // Build pages for all chapters from startChapter onwards
    const pages: ReaderPage[] = [];
    for (let i = startChapter; i <= totalChapters; i++) {
      const content = await readChapter(ctx.config, book.projectName, i);
      if (content) {
        pages.push({ title: `Chapter ${i}`, content });
      }
    }

    if (pages.length === 0) {
      error('Could not load any chapters.');
      return;
    }

    await startReader(pages, {
      onNotes: async (pageIndex) => {
        const chapterNumber = startChapter + pageIndex;
        const existing = await readChapterNotes(ctx.config, book.projectName, chapterNumber) || '';
        console.log('');
        if (existing) {
          info(`Current notes for Chapter ${chapterNumber}:`);
          console.log(existing);
          console.log('');
        }
        const notes = await multilineInput(`Notes for Chapter ${chapterNumber} (replaces existing)`);
        if (notes.trim()) {
          await writeChapterNotes(ctx.config, book.projectName, chapterNumber, notes);
          success(`Notes saved for Chapter ${chapterNumber}`);
        } else if (existing) {
          info('Empty input — keeping existing notes.');
        }
      },
    });

    success('Exited reader.');
    blank();
  },
};
