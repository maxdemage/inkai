import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import {
  readLoreContext,
  readChapterSummary,
  readLoreFiles,
  readLoreNotes,
  writeLoreFiles,
  getBookDir,
} from '../book/manager.js';
import { updateBook } from '../db.js';
import { chatWriter } from '../llm/manager.js';
import { multilineInput } from '../multiline.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { buildCharactersGeneratePrompt, buildCharactersEditPrompt } from '../prompts/templates.js';
import { header, success, info, blank, boxMessage, divider, c } from '../ui.js';

export const charactersCommand: Command = {
  name: 'characters',
  description: 'Show, generate, or edit character sheets with arc state and tensions',
  aliases: ['chars'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Characters');

    const spinner = ora({ text: 'Loading book context...', color: 'cyan' }).start();

    const [loreFiles, loreContext, chapterSummary, notesContext] = await Promise.all([
      readLoreFiles(ctx.config, book.projectName),
      readLoreContext(ctx.config, book.projectName),
      readChapterSummary(ctx.config, book.projectName),
      readLoreNotes(ctx.config, book.projectName),
    ]);

    spinner.succeed('Context loaded');

    const hasExisting = !!loreFiles['characters.md'];

    // ─── Generate if missing ────────────────────────────────

    if (!hasExisting) {
      blank();
      info('No characters.md found. Generating character sheets from your lore and chapters...');

      spinner.start('Generating character sheets (writer LLM)...');

      try {
        const content = await generateCharacters(ctx, book, loreContext, chapterSummary, notesContext);
        await writeLoreFiles(ctx.config, book.projectName, { 'characters.md': content });
        await updateBook(book.id, { summaryFresh: false });
        spinner.succeed('Character sheets generated');

        await commitIfEnabled(ctx, book.projectName, 'Generate characters.md');

        blank();
        boxMessage(content, 'Characters');
        blank();
        success('Saved to lore/characters.md');
      } catch (err: unknown) {
        spinner.fail('Failed to generate: ' + (err instanceof Error ? err.message : String(err)));
        return;
      }
    } else {
      // ─── Show existing ────────────────────────────────────
      blank();
      boxMessage(loreFiles['characters.md'], 'Characters');
    }

    // ─── Ask about changes ──────────────────────────────────

    blank();

    const wantChanges = await confirm({
      message: 'Do you want to make changes to the characters?',
      default: false,
    });

    if (!wantChanges) {
      info('Characters unchanged.');
      return;
    }

    blank();
    info('Describe what you want to change — add a character, update arcs, fix details, etc.');
    blank();
    const authorChanges = await multilineInput('Describe changes:');

    if (!authorChanges.trim()) {
      info('No changes described. Characters unchanged.');
      return;
    }

    // ─── Apply changes via LLM ──────────────────────────────

    // Re-read in case it was just generated
    const currentCharacters = (await readLoreFiles(ctx.config, book.projectName))['characters.md'] || '';

    spinner.start('Applying changes (writer LLM)...');

    try {
      const prompt = await buildCharactersEditPrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        currentCharacters,
        loreContext,
        authorChanges: authorChanges.trim(),
      });

      const updated = await chatWriter(ctx.config, [
        {
          role: 'system',
          content: 'You are an expert character editor. Apply the requested changes and return the complete updated document in markdown.',
        },
        { role: 'user', content: prompt },
      ], { maxTokens: 8192, temperature: 0.5 });

      await writeLoreFiles(ctx.config, book.projectName, { 'characters.md': updated });
      await updateBook(book.id, { summaryFresh: false });
      spinner.succeed('Characters updated');

      await commitIfEnabled(ctx, book.projectName, 'Update characters.md');

      blank();
      divider();
      blank();
      boxMessage(updated, 'Updated Characters');
      blank();
      success('Characters saved to lore/characters.md');
    } catch (err: unknown) {
      spinner.fail('Failed to update: ' + (err instanceof Error ? err.message : String(err)));
    }
  },
};

async function generateCharacters(
  ctx: { config: import('../types.js').InkaiConfig },
  book: import('../types.js').BookRecord,
  loreContext: string,
  chapterSummary: string,
  notesContext: string,
): Promise<string> {
  const prompt = await buildCharactersGeneratePrompt({
    title: book.title,
    type: book.type,
    genre: book.genre,
    subgenre: book.subgenre,
    loreContext,
    chapterSummary,
    notesContext,
  });

  return chatWriter(ctx.config, [
    {
      role: 'system',
      content: 'You are an expert character analyst. Generate structured character sheets in markdown.',
    },
    { role: 'user', content: prompt },
  ], { maxTokens: 8192, temperature: 0.6 });
}

async function commitIfEnabled(
  ctx: { config: import('../types.js').InkaiConfig },
  projectName: string,
  message: string,
): Promise<void> {
  if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
    const bookDir = getBookDir(ctx.config, projectName);
    await gitCommit(bookDir, message);
  }
}
