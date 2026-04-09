import { select } from '@inquirer/prompts';
import ora from 'ora';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Command } from '../types.js';
import { readLoreFiles, writeLoreFiles } from '../book/manager.js';
import { updateBook } from '../db.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { getBookDir } from '../book/manager.js';
import { enhanceLoreCommand } from './enhance-lore.js';
import { header, success, info, warn, blank, boxMessage, c } from '../ui.js';

/** Rough token estimate: ~4 chars per token for English text. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Opens the given content in the user's $EDITOR (falls back to nano, then vi).
 * Returns the edited content, or null if unchanged or editor failed.
 */
function editInExternalEditor(filename: string, content: string): string | null {
  const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
  const tmpDir = mkdtempSync(join(tmpdir(), 'inkai-'));
  const tmpFile = join(tmpDir, filename);

  writeFileSync(tmpFile, content, 'utf-8');

  const result = spawnSync(editor, [tmpFile], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    try { unlinkSync(tmpFile); } catch {}
    return null;
  }

  const edited = readFileSync(tmpFile, 'utf-8');
  try { unlinkSync(tmpFile); } catch {}

  if (edited === content) return null; // no changes
  return edited;
}

export const editLoreCommand: Command = {
  name: 'edit-lore',
  description: 'Review and modify book lore',
  aliases: ['lore'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Edit Lore');

    const spinner = ora({ text: 'Reading lore files...', color: 'cyan' }).start();

    const loreFiles = await readLoreFiles(ctx.config, book.projectName);
    if (Object.keys(loreFiles).length === 0) {
      spinner.fail('No lore files found. The book may need to be re-created.');
      return;
    }

    spinner.succeed('Lore loaded');

    // Show token cost breakdown
    blank();
    info('Lore files:');
    let totalChars = 0;
    for (const [name, content] of Object.entries(loreFiles)) {
      const tokens = estimateTokens(content);
      totalChars += content.length;
      info(`  ${c.highlight(name)} — ${c.value(`~${tokens.toLocaleString()} tokens`)}`);
    }
    const totalTokens = Math.ceil(totalChars / 4);
    info(`  Total: ${c.value(`~${totalTokens.toLocaleString()} tokens`)} (${(totalChars / 1024).toFixed(1)} KB)`);

    // Display basic-lore.md as the overview
    const overview = loreFiles['basic-lore.md'];
    if (overview) {
      blank();
      boxMessage(overview, 'Current Lore Overview');
    } else {
      blank();
      info('No basic-lore.md found. Available files: ' + Object.keys(loreFiles).join(', '));
    }
    blank();

    // Ask: manual or LLM-assisted
    const mode = await select({
      message: 'How would you like to edit?',
      choices: [
        { name: 'Edit manually (select a file)', value: 'manual' },
        { name: 'AI-assisted enhancement (LLM)', value: 'llm' },
        { name: '← Back', value: 'back' },
      ],
    });

    if (mode === 'back') return;

    if (mode === 'llm') {
      await enhanceLoreCommand.execute(_args, ctx);
      return;
    }

    // ─── Manual edit flow ───────────────────────────────────

    const fileNames = Object.keys(loreFiles);

    const selectedFile = await select({
      message: 'Which file to edit?',
      choices: [
        ...fileNames.map(name => ({
          name: `${name} (~${estimateTokens(loreFiles[name]).toLocaleString()} tokens)`,
          value: name,
        })),
        { name: '← Back', value: '__back__' },
      ],
    });

    if (selectedFile === '__back__') return;

    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
    info(`Opening ${c.highlight(selectedFile)} in ${c.value(editor)}...`);
    blank();

    const newContent = editInExternalEditor(selectedFile, loreFiles[selectedFile]);

    if (newContent === null) {
      blank();
      info('No changes detected.');
      return;
    }

    // Save the file
    await writeLoreFiles(ctx.config, book.projectName, { [selectedFile]: newContent });
    blank();
    success(`Saved ${selectedFile}`);

    // Git commit
    if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
      const bookDir = getBookDir(ctx.config, book.projectName);
      await gitCommit(bookDir, `Manual edit: ${selectedFile}`);
    }

    // Invalidate cached summary
    await updateBook(book.id, { summaryFresh: false });
    blank();
  },
};
