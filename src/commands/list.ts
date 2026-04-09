import Table from 'cli-table3';
import chalk from 'chalk';
import type { Command } from '../types.js';
import { getAllBooks } from '../db.js';
import { header, info, blank, statusBadge, c } from '../ui.js';

export const listCommand: Command = {
  name: 'list',
  description: 'List all book projects',
  aliases: ['ls'],

  async execute(_args, _ctx) {
    const allBooks = await getAllBooks();
    const books = allBooks.filter(b => b.status !== 'archived');

    header('Book Projects');

    if (books.length === 0) {
      info('No books yet. Use /create-book to start your first project.');
      blank();
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Project'),
        chalk.cyan('Title'),
        chalk.cyan('Type'),
        chalk.cyan('Genre'),
        chalk.cyan('Chapters'),
        chalk.cyan('Status'),
      ],
      style: {
        head: [],
        border: ['gray'],
      },
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│',
      },
    });

    for (const book of books) {
      table.push([
        c.highlight(book.projectName),
        book.title,
        book.type,
        book.genre,
        String(book.chapterCount),
        statusBadge(book.status),
      ]);
    }

    console.log(table.toString());
    blank();
    info(`${books.length} project(s). Use ${c.primary('/select <name>')} to work on one.`);
    blank();
  },
};
