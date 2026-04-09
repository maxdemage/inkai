import { select, confirm } from '@inquirer/prompts';
import { rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Command } from '../types.js';
import { getAllBooks, updateBook, removeBook } from '../db.js';
import { getBookDir } from '../book/manager.js';
import { header, success, info, error, warn, blank, statusBadge, c } from '../ui.js';

const ARCHIVE_GRACE_DAYS = 30;

export const archiveCommand: Command = {
  name: 'archive',
  description: 'Archive a book project (removable after 30 days)',

  async execute(args, ctx) {
    const books = await getAllBooks();
    const activeBooks = books.filter(b => b.status !== 'archived');
    const archivedBooks = books.filter(b => b.status === 'archived');

    const action = args[0];

    // ─── /archive purge — remove expired archives ───────
    if (action === 'purge') {
      const now = Date.now();
      const expired = archivedBooks.filter(b => {
        if (!b.archivedAt) return false;
        const daysOld = (now - new Date(b.archivedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysOld >= ARCHIVE_GRACE_DAYS;
      });

      if (expired.length === 0) {
        info('No archived books past the 30-day grace period.');
        return;
      }

      header('Purge Expired Archives');
      for (const book of expired) {
        const days = Math.floor((now - new Date(book.archivedAt!).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`    ${c.muted('•')} ${c.value(book.projectName)} ${c.muted(`— "${book.title}" (archived ${days} days ago)`)}`);
      }
      blank();

      const proceed = await confirm({
        message: `Permanently delete ${expired.length} archived project(s) and all their files?`,
        default: false,
      });

      if (!proceed) {
        info('Purge cancelled.');
        return;
      }

      for (const book of expired) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        if (existsSync(bookDir)) {
          await rm(bookDir, { recursive: true, force: true });
        }
        await removeBook(book.id);
      }

      success(`Permanently deleted ${expired.length} project(s).`);
      return;
    }

    // ─── /archive list — show archived books ────────────
    if (action === 'list') {
      header('Archived Books');
      if (archivedBooks.length === 0) {
        info('No archived books.');
        return;
      }

      const now = Date.now();
      for (const book of archivedBooks) {
        const archivedDate = book.archivedAt ? new Date(book.archivedAt) : new Date(book.updatedAt);
        const daysOld = Math.floor((now - archivedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, ARCHIVE_GRACE_DAYS - daysOld);
        const expiry = daysLeft === 0
          ? c.error('eligible for purge')
          : c.muted(`${daysLeft} days until purgeable`);
        console.log(`    ${c.muted('•')} ${c.value(book.projectName)} ${c.muted(`— "${book.title}"`)} ${expiry}`);
      }
      blank();
      info(`Use ${c.primary('/archive purge')} to permanently remove expired archives.`);
      info(`Use ${c.primary('/archive restore')} to restore a book.`);
      blank();
      return;
    }

    // ─── /archive restore — un-archive a book ──────────
    if (action === 'restore') {
      if (archivedBooks.length === 0) {
        info('No archived books to restore.');
        return;
      }

      const projectName = await select({
        message: 'Which book to restore?',
        choices: archivedBooks.map(b => ({
          name: `${b.projectName} — ${b.title}`,
          value: b.projectName,
        })),
      });

      const book = archivedBooks.find(b => b.projectName === projectName)!;

      // Move directory back from archive if needed
      const archivedDir = join(ctx.config.booksDir, '.archived', book.projectName);
      const activeDir = getBookDir(ctx.config, book.projectName);

      if (existsSync(archivedDir) && !existsSync(activeDir)) {
        await rename(archivedDir, activeDir);
      }

      await updateBook(book.id, { status: 'work-in-progress', archivedAt: undefined });
      success(`"${book.title}" restored to work-in-progress.`);
      return;
    }

    // ─── Default: archive a book ────────────────────────
    if (activeBooks.length === 0) {
      info('No active books to archive.');
      return;
    }

    header('Archive Book');

    const projectName = await select({
      message: 'Which book to archive?',
      choices: activeBooks.map(b => ({
        name: `${b.projectName} — ${b.title} ${statusBadge(b.status)}`,
        value: b.projectName,
      })),
    });

    const book = activeBooks.find(b => b.projectName === projectName)!;

    const proceed = await confirm({
      message: `Archive "${book.title}"? It can be restored within ${ARCHIVE_GRACE_DAYS} days.`,
      default: true,
    });

    if (!proceed) {
      info('Archive cancelled.');
      return;
    }

    // Move book directory to .archived/
    const bookDir = getBookDir(ctx.config, book.projectName);
    const archivedDir = join(ctx.config.booksDir, '.archived', book.projectName);

    if (existsSync(bookDir)) {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(join(ctx.config.booksDir, '.archived'), { recursive: true });
      await rename(bookDir, archivedDir);
    }

    await updateBook(book.id, { status: 'archived', archivedAt: new Date().toISOString() });

    // Deselect if this was the selected book
    if (ctx.selectedBook?.id === book.id) {
      ctx.selectedBook = null;
      info('Book deselected.');
    }

    blank();
    success(`"${book.title}" archived.`);
    warn(`It will be eligible for permanent deletion after ${ARCHIVE_GRACE_DAYS} days.`);
    info(`Use ${c.primary('/archive restore')} to bring it back.`);
    blank();
  },
};
