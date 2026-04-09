import type { Command } from '../types.js';
import { readLoreFiles, getChapterCount, getBookDir } from '../book/manager.js';
import { header, keyValue, blank, statusBadge, divider, c, info } from '../ui.js';

export const statusCommand: Command = {
  name: 'status',
  description: 'Show current book project status',
  aliases: ['info', 'stat'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;
    const chapterCount = await getChapterCount(ctx.config, book.projectName);
    const loreFiles = await readLoreFiles(ctx.config, book.projectName);

    header(`📊 ${book.title}`);

    keyValue('Project', book.projectName);
    keyValue('Title', book.title);
    keyValue('Type', book.type);
    keyValue('Genre', `${book.genre}${book.subgenre ? ` / ${book.subgenre}` : ''}`);
    keyValue('Authors', book.authors.join(', '));
    keyValue('Purpose', book.purpose);
    keyValue('Status', statusBadge(book.status));
    keyValue('Chapters', String(chapterCount));
    keyValue('Created', new Date(book.createdAt).toLocaleDateString());
    keyValue('Updated', new Date(book.updatedAt).toLocaleDateString());

    blank();
    divider();
    blank();

    const loreFileNames = Object.keys(loreFiles);
    if (loreFileNames.length > 0) {
      info(`Lore files (${loreFileNames.length}):`);
      for (const name of loreFileNames) {
        const size = loreFiles[name].length;
        const sizeStr = size > 1000 ? `${(size / 1000).toFixed(1)}k` : `${size}`;
        console.log(`    ${c.muted('•')} ${c.value(name)} ${c.muted(`(${sizeStr} chars)`)}`);
      }
    } else {
      info('No lore files yet.');
    }

    blank();
    keyValue('Book directory', getBookDir(ctx.config, book.projectName));
    blank();
  },
};
