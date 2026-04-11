import { select } from '@inquirer/prompts';
import type { Command, BookStatus } from '../types.js';
import { updateBook } from '../db.js';
import { header, success, info, blank, c } from '../ui.js';

const STATUS_CHOICES: { name: string; value: BookStatus }[] = [
  { name: '✍️  Work in progress', value: 'work-in-progress' },
  { name: '✅  Completed',        value: 'completed' },
  { name: '🔍  Under review',     value: 'review' },
  { name: '⏸️  On hold',          value: 'on-hold' },
  { name: '🌀  Limbo',            value: 'limbo' },
];

export const changeStatusCommand: Command = {
  name: 'change-status',
  description: 'Change the status of the current book',
  aliases: ['status-change', 'set-status'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Change Book Status');
    info(`Current status: ${c.value(book.status)}`);
    blank();

    const newStatus = await select<BookStatus>({
      message: 'Select new status:',
      choices: STATUS_CHOICES.map(s => ({
        ...s,
        disabled: s.value === book.status ? '(current)' : false,
      })),
    });

    if (newStatus === book.status) {
      info('Status unchanged.');
      return;
    }

    await updateBook(book.id, { status: newStatus });
    ctx.selectedBook!.status = newStatus;

    blank();
    success(`Status changed to: ${c.value(newStatus)}`);
  },
};
