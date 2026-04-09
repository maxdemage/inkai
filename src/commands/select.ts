import { select } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import { getAllBooks, getBookByName } from '../db.js';
import { readLoreFiles, getChapterCount } from '../book/manager.js';
import { chatSmall } from '../llm/manager.js';
import { buildBookSummaryPrompt } from '../prompts/templates.js';
import { header, success, info, error, blank, boxMessage, keyValue, statusBadge, c } from '../ui.js';

export const selectCommand: Command = {
  name: 'select',
  description: 'Select a book project to work on',
  aliases: ['open', 'use'],

  async execute(args, ctx) {
    let projectName = args[0];

    if (!projectName) {
      // Show interactive selection
      const books = await getAllBooks();
      if (books.length === 0) {
        info('No books yet. Use /create-book to start your first project.');
        return;
      }

      projectName = await select({
        message: 'Select a book project:',
        choices: books.map(b => ({
          name: `${b.projectName} — ${b.title} ${statusBadge(b.status)}`,
          value: b.projectName,
        })),
      });
    }

    const book = await getBookByName(projectName);
    if (!book) {
      error(`Book project "${projectName}" not found. Use /list to see available projects.`);
      return;
    }

    ctx.selectedBook = book;
    header(`📖 ${book.title}`);
    keyValue('Project', book.projectName);
    keyValue('Type', `${book.type} — ${book.genre}${book.subgenre ? ` / ${book.subgenre}` : ''}`);
    keyValue('Authors', book.authors.join(', '));
    keyValue('Status', statusBadge(book.status));

    const chapterCount = await getChapterCount(ctx.config, book.projectName);
    keyValue('Chapters', String(chapterCount));
    blank();

    // Show AI summary if book has lore
    if (book.status !== 'new') {
      const spinner = ora({ text: 'Loading book summary...', color: 'cyan' }).start();
      try {
        const loreFiles = await readLoreFiles(ctx.config, book.projectName);
        const prompt = await buildBookSummaryPrompt(loreFiles, chapterCount);
        const summary = await chatSmall(ctx.config, [
          { role: 'system', content: 'You are a concise book assistant. Give a brief, engaging project status update.' },
          { role: 'user', content: prompt },
        ], { maxTokens: 300 });
        spinner.stop();
        boxMessage(summary, 'Summary');
      } catch {
        spinner.stop();
        // Skip summary if LLM fails
      }
    }

    blank();
    success(`Now working on: ${c.highlight(book.projectName)}`);
    info(`Commands: ${c.primary('/create-chapter')} ${c.primary('/edit-lore')} ${c.primary('/review-chapter')} ${c.primary('/status')}`);
    blank();
  },
};
