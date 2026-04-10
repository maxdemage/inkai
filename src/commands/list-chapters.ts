import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import Table from 'cli-table3';
import chalk from 'chalk';
import type { Command } from '../types.js';
import { getChaptersDir, getChapterPlansDir } from '../book/manager.js';
import { header, info, blank, c } from '../ui.js';

export const listChaptersCommand: Command = {
  name: 'list-chapters',
  description: 'List all chapters in the current book',
  aliases: ['chapters', 'lc'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;
    const chaptersDir = getChaptersDir(ctx.config, book.projectName);
    const plansDir = getChapterPlansDir(ctx.config, book.projectName);

    header(`Chapters: ${book.title}`);

    if (book.chapterCount === 0) {
      info('No chapters yet. Use /create-chapter to write one.');
      blank();
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('#'),
        chalk.cyan('Words'),
        chalk.cyan('Size'),
        chalk.cyan('Plan'),
        chalk.cyan('Review'),
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

    for (let i = 1; i <= book.chapterCount; i++) {
      const num = String(i).padStart(2, '0');
      const chapterFile = `${chaptersDir}/chapter-${num}.md`;
      const planFile = `${plansDir}/plan-chapter-${num}.md`;
      const reviewFile = `${chaptersDir}/review_chapter_${num}.md`;

      let words = c.muted('—');
      let size = c.muted('—');

      if (existsSync(chapterFile)) {
        const fileStat = await stat(chapterFile);
        const bytes = fileStat.size;
        const { readFile } = await import('node:fs/promises');
        const content = await readFile(chapterFile, 'utf-8');
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        words = c.value(wordCount.toLocaleString());
        size = c.muted(bytes > 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`);
      }

      const hasPlan = existsSync(planFile) ? chalk.green('✓') : c.muted('—');
      const hasReview = existsSync(reviewFile) ? chalk.green('✓') : c.muted('—');

      table.push([
        c.highlight(`Ch. ${i}`),
        words,
        size,
        hasPlan,
        hasReview,
      ]);
    }

    console.log(table.toString());
    blank();
    info(`${book.chapterCount} chapter(s) in ${c.primary(book.title)}.`);
    blank();
  },
};
