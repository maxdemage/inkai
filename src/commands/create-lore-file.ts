import { input } from '@inquirer/prompts';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Command } from '../types.js';
import { readLoreFiles, writeLoreFiles, getBookDir } from '../book/manager.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { header, success, warn, info, blank, c } from '../ui.js';

function editInExternalEditor(filename: string, content: string): string {
  const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
  const tmpDir = mkdtempSync(join(tmpdir(), 'inkai-'));
  const tmpFile = join(tmpDir, filename);

  writeFileSync(tmpFile, content, 'utf-8');

  spawnSync(editor, [tmpFile], { stdio: 'inherit' });

  const edited = readFileSync(tmpFile, 'utf-8');
  try { unlinkSync(tmpFile); } catch {}
  return edited;
}

export const createLoreFileCommand: Command = {
  name: 'create-lore-file',
  description: 'Create a new custom lore file and open it in your editor',
  aliases: ['new-lore', 'lore-new'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;

    header('Create Lore File');

    // Allow passing name directly: /create-lore-file my-notes
    let rawName = args.length > 0 ? args.join('-').trim() : '';

    if (!rawName) {
      rawName = await input({
        message: 'File name (without .md):',
        validate: (val) => {
          const trimmed = val.trim();
          if (!trimmed) return 'Name is required';
          if (/[/\\.]/.test(trimmed)) return 'Name must not contain / \\ or .';
          return true;
        },
      });
    }

    rawName = rawName.trim();

    // Sanitize: lowercase, spaces → hyphens, strip unsafe chars
    const safeName = rawName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');

    if (!safeName) {
      warn('Invalid file name.');
      return;
    }

    const filename = `${safeName}.md`;

    // Check for collision
    const existing = await readLoreFiles(ctx.config, book.projectName);
    if (existing[filename] !== undefined) {
      warn(`File "${filename}" already exists. Use /edit-lore to edit it.`);
      return;
    }

    blank();
    info(`Creating ${c.highlight(filename)} — opening editor…`);

    const initial = `# ${rawName}\n\n`;
    const content = editInExternalEditor(filename, initial);

    await writeLoreFiles(ctx.config, book.projectName, { [filename]: content });

    if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
      await gitCommit(getBookDir(ctx.config, book.projectName), `Add lore file: ${filename}`);
    }

    blank();
    success(`Created ${c.highlight(filename)} (${content.length} chars)`);
  },
};
