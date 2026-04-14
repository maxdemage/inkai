import { input } from '@inquirer/prompts';
import type { Command } from '../types.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { getBookDir } from '../book/manager.js';
import { loadConfig } from '../config.js';
import { header, success, warn, info, blank, c } from '../ui.js';

export const gitCommitCommand: Command = {
  name: 'commit',
  description: 'Manually commit current changes to git',
  aliases: ['git-commit', 'git'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;

    if (!isGitAvailable()) {
      warn('Git is not available on this system.');
      return;
    }

    const config = await loadConfig();
    const bookDir = getBookDir(config, book.projectName);

    header('Git Commit');
    info(`Book: ${c.value(book.title)}`);
    blank();

    // Allow passing message directly as args: /commit My message here
    let message = args.length > 0 ? args.join(' ').trim() : '';

    if (!message) {
      message = await input({
        message: 'Commit message:',
        default: `Manual commit — ${new Date().toLocaleString()}`,
        validate: (val) => val.trim() ? true : 'Message is required',
      });
    }

    message = message.trim();

    try {
      await gitCommit(bookDir, message);
      blank();
      success(`Committed: "${message}"`);
    } catch (err) {
      warn(`Commit failed: ${String(err)}`);
    }
  },
};
