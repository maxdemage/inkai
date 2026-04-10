import { input, select } from '@inquirer/prompts';
import type { Command, BookType } from '../types.js';
import { BOOK_TYPES } from '../types.js';
import { updateBook } from '../db.js';
import { multilineInput } from '../multiline.js';
import { header, success, info, keyValue, blank, divider, c } from '../ui.js';

const GENRE_CHOICES = [
  { name: 'Fantasy', value: 'fantasy' },
  { name: 'Science Fiction', value: 'sci-fi' },
  { name: 'Mystery / Thriller', value: 'mystery' },
  { name: 'Romance', value: 'romance' },
  { name: 'Horror', value: 'horror' },
  { name: 'Literary Fiction', value: 'literary fiction' },
  { name: 'Historical Fiction', value: 'historical fiction' },
  { name: 'Adventure', value: 'adventure' },
  { name: 'Crime', value: 'crime' },
  { name: 'Comedy / Satire', value: 'comedy' },
  { name: 'Drama', value: 'drama' },
  { name: 'Non-Fiction', value: 'non-fiction' },
  { name: 'Self-Help', value: 'self-help' },
  { name: 'Other (type your own)', value: '__other__' },
];

export const editBasicInfoCommand: Command = {
  name: 'edit-basic-info',
  description: 'Edit basic book information (title, genre, authors, etc.)',
  aliases: ['edit-info', 'basic-info'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Edit Basic Info');
    info('Go through each field — press Enter to keep current value, or type a new one.');
    blank();

    // ─── Title ──────────────────────────────────────────────

    const title = await input({
      message: 'Title:',
      default: book.title,
      validate: (val) => val.trim() ? true : 'Required',
    });

    // ─── Type ───────────────────────────────────────────────

    const type = await select<BookType>({
      message: 'Type:',
      choices: BOOK_TYPES.map(t => ({ name: t.label, value: t.value })),
      default: book.type,
    });

    // ─── Genre ──────────────────────────────────────────────

    // Add current genre to choices if it's custom
    const genreValues = GENRE_CHOICES.map(g => g.value);
    const genreChoices = genreValues.includes(book.genre)
      ? GENRE_CHOICES
      : [{ name: `${book.genre} (current)`, value: book.genre }, ...GENRE_CHOICES];

    const genre = await select({
      message: 'Genre:',
      choices: genreChoices,
      default: genreValues.includes(book.genre) ? book.genre : book.genre,
    });

    const finalGenre = genre === '__other__'
      ? await input({
          message: 'Genre (custom):',
          validate: (val) => val.trim() ? true : 'Required',
        })
      : genre;

    // ─── Sub-genre ──────────────────────────────────────────

    const subgenre = await input({
      message: 'Sub-genre:',
      default: book.subgenre,
    });

    // ─── Authors ────────────────────────────────────────────

    const authorsRaw = await input({
      message: 'Author(s) (comma-separated):',
      default: book.authors.join(', '),
    });
    const authors = authorsRaw.split(',').map(a => a.trim()).filter(Boolean);

    // ─── Purpose ────────────────────────────────────────────

    const purpose = await input({
      message: 'Purpose:',
      default: book.purpose,
    });

    // ─── Summary ────────────────────────────────────────────

    const currentSummary = book.summary || '';
    info(`Current summary: ${c.value(currentSummary || '(none)')}`);
    const summary = await multilineInput('Story summary (leave empty to keep current):');
    const finalSummary = summary.trim() || currentSummary;

    // ─── Apply changes ──────────────────────────────────────

    const updates: Record<string, unknown> = {};
    let changed = false;

    if (title.trim() !== book.title) { updates.title = title.trim(); changed = true; }
    if (type !== book.type) { updates.type = type; changed = true; }
    if (finalGenre.trim() !== book.genre) { updates.genre = finalGenre.trim(); changed = true; }
    if (subgenre.trim() !== book.subgenre) { updates.subgenre = subgenre.trim(); changed = true; }
    if (authors.join(', ') !== book.authors.join(', ')) { updates.authors = authors; changed = true; }
    if (purpose.trim() !== book.purpose) { updates.purpose = purpose.trim(); changed = true; }
    if (finalSummary !== (book.summary || '')) { updates.summary = finalSummary; changed = true; }

    if (!changed) {
      blank();
      info('No changes made.');
      return;
    }

    await updateBook(book.id, updates);

    // Update the in-memory selectedBook
    Object.assign(ctx.selectedBook!, updates);

    blank();
    divider();
    blank();
    success('Book info updated:');
    blank();
    keyValue('Title', ctx.selectedBook!.title);
    keyValue('Type', ctx.selectedBook!.type);
    keyValue('Genre', `${ctx.selectedBook!.genre}${ctx.selectedBook!.subgenre ? ` / ${ctx.selectedBook!.subgenre}` : ''}`);
    keyValue('Authors', ctx.selectedBook!.authors.join(', '));
    keyValue('Purpose', ctx.selectedBook!.purpose);
    if (ctx.selectedBook!.summary) keyValue('Summary', ctx.selectedBook!.summary);
  },
};
