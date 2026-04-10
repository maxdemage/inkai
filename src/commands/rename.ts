import { input } from '@inquirer/prompts';
import type { Command } from '../types.js';
import { updateBook } from '../db.js';
import { header, success, info, blank, c } from '../ui.js';

export const renameCommand: Command = {
  name: 'rename',
  description: 'Rename the current book title',
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Rename Book');
    info(`Current title: ${c.value(book.title)}`);
    blank();

    const newTitle = await input({
      message: 'New title:',
      default: book.title,
      validate: (val) => val.trim() ? true : 'Title is required',
    });

    const trimmed = newTitle.trim();
    if (trimmed === book.title) {
      info('Title unchanged.');
      return;
    }

    await updateBook(book.id, { title: trimmed });
    ctx.selectedBook!.title = trimmed;

    blank();
    success(`Title renamed to: ${c.value(trimmed)}`);
  },
};
