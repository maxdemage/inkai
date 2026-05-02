import { input } from '@inquirer/prompts';
import ora from 'ora';
import type { Command, BookType } from '../types.js';
import { chatSmall, chatWriter } from '../llm/manager.js';
import { multilineInput } from '../multiline.js';
import { createBookProject, writeLoreFiles, setBookStatus } from '../book/manager.js';
import { gitInit, gitCommit, isGitAvailable } from '../git.js';
import { getBookDir } from '../book/manager.js';
import { buildIdeaExtractPrompt, buildIdeaLorePrompt } from '../prompts/templates.js';
import { parseLLMJson } from '../llm/parse.js';
import { header, success, info, blank, c, boxMessage } from '../ui.js';

interface ExtractedInfo {
  projectName: string;
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  purpose: string;
  summary: string;
}

export const createBookFromIdeaCommand: Command = {
  name: 'create-book-from-idea',
  description: 'Create a new book project from a raw idea (AI extracts all metadata)',
  aliases: ['idea', 'quick-book'],

  async execute(_args, ctx) {
    header('Quick Start — Book from Idea');

    info('Give your book a working title, then pour your thoughts into the idea field.');
    info('The AI will extract genre, type, structure, lore — all from your idea.');
    blank();

    const title = await input({
      message: 'Working title:',
      validate: (val) => val.trim() ? true : 'Required',
    });

    blank();
    info('Now describe your idea. Write as much or as little as you want — stream of consciousness is fine.');
    const idea = await multilineInput('Your idea:');

    if (!idea.trim()) {
      info('No idea provided. Aborting.');
      return;
    }

    blank();

    // ─── Step 1: Extract structured info ────────────────────

    const spinner = ora({ text: 'Analysing your idea…', color: 'cyan' }).start();

    let extracted: ExtractedInfo;
    try {
      const extractPrompt = await buildIdeaExtractPrompt(title.trim(), idea.trim());
      const extractRaw = await chatSmall(ctx.config, [
        { role: 'system', content: 'You are a book development assistant. Always respond with valid JSON.' },
        { role: 'user', content: extractPrompt },
      ], { jsonMode: true, temperature: 0.5 });

      extracted = parseLLMJson<ExtractedInfo>(extractRaw, 'idea extraction');

      // Sanitise projectName
      extracted.projectName = extracted.projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'my-book';

      spinner.succeed(`Detected: ${c.value(extracted.type)}, ${c.value(extracted.genre)}`);
    } catch (err: unknown) {
      spinner.fail('Failed to analyse idea: ' + (err instanceof Error ? err.message : String(err)));
      return;
    }

    blank();
    boxMessage(
      c.value(`${extracted.title}\n`) +
      c.muted(`Type: ${extracted.type} · Genre: ${extracted.genre}`) +
      (extracted.subgenre ? c.muted(` / ${extracted.subgenre}`) : '') + '\n' +
      c.muted(`Purpose: ${extracted.purpose}\n\n`) +
      extracted.summary,
      'Detected Book Info'
    );
    blank();

    // ─── Step 2: Create project ──────────────────────────────

    spinner.start('Creating project…');

    let book;
    try {
      book = await createBookProject(ctx.config, {
        projectName: extracted.projectName,
        title: extracted.title.trim() || title.trim(),
        type: extracted.type,
        genre: extracted.genre.trim(),
        subgenre: (extracted.subgenre ?? '').trim(),
        authors: ['Anonymous'],
        purpose: (extracted.purpose ?? 'Entertainment').trim(),
        summary: (extracted.summary ?? '').trim(),
      });
      spinner.succeed('Project created');
    } catch (err: unknown) {
      spinner.fail(err instanceof Error ? err.message : String(err));
      return;
    }

    // ─── Step 3: Git init ────────────────────────────────────

    if (isGitAvailable() && ctx.config.git.enabled) {
      const bookDir = getBookDir(ctx.config, book.projectName);
      await gitInit(bookDir);
    }

    // ─── Step 4: Save idea.md ────────────────────────────────

    spinner.start('Saving your idea…');
    try {
      await writeLoreFiles(ctx.config, book.projectName, {
        'idea.md': `# Your Idea\n\n${idea.trim()}\n`,
      });
      spinner.succeed('Idea saved to lore/idea.md');
    } catch (err: unknown) {
      spinner.warn('Could not save idea.md: ' + (err instanceof Error ? err.message : String(err)));
    }

    // ─── Step 5: Generate lore ───────────────────────────────

    spinner.start('Generating lore files (this may take a moment)…');
    await setBookStatus(book.id, 'initial-processing');

    try {
      const lorePrompt = await buildIdeaLorePrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        authors: book.authors,
        purpose: book.purpose,
        summary: book.summary,
        idea: idea.trim(),
      });

      const loreRaw = await chatWriter(ctx.config, [
        { role: 'system', content: 'You are an expert book development assistant. Always respond with valid JSON containing lore files.' },
        { role: 'user', content: lorePrompt },
      ], { jsonMode: true, maxTokens: 8192, temperature: 0.7 });

      const parsed = parseLLMJson<{ files: Record<string, string> }>(loreRaw, 'idea lore generation');
      await writeLoreFiles(ctx.config, book.projectName, parsed.files);

      const fileCount = Object.keys(parsed.files).length;
      spinner.succeed(`Generated ${fileCount} lore files`);

      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, `Initial lore for "${book.title}" (from idea)`);
      }

      await setBookStatus(book.id, 'work-in-progress');
    } catch (err: unknown) {
      spinner.fail('Failed to generate lore: ' + (err instanceof Error ? err.message : String(err)));
      info('You can try regenerating lore later with /edit-lore after selecting this book.');
      await setBookStatus(book.id, 'new');
    }

    // ─── Done ────────────────────────────────────────────────

    blank();
    success(`Book "${book.title}" created as project: ${c.highlight(book.projectName)}`);
    info(`Use ${c.primary('/select ' + book.projectName)} to start working on it.`);
    blank();
  },
};
