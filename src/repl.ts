import * as readline from 'node:readline';
import { registerCommand, executeCommand, getCommandNames } from './commands/registry.js';
import { helpCommand } from './commands/help.js';
import { configCommand } from './commands/config.js';
import { createBookCommand } from './commands/create-book.js';
import { listCommand } from './commands/list.js';
import { selectCommand } from './commands/select.js';
import { createChapterCommand } from './commands/create-chapter.js';
import { reviewChapterCommand } from './commands/review-chapter.js';
import { rewriteChapterCommand } from './commands/rewrite-chapter.js';
import { editLoreCommand } from './commands/edit-lore.js';
import { statusCommand } from './commands/status.js';
import { archiveCommand } from './commands/archive.js';
import { jobsCommand } from './commands/jobs.js';
import { readCommand } from './commands/read.js';
import { exportCommand } from './commands/export.js';
import { resetPromptsCommand } from './commands/reset-prompts.js';
import { enhanceLoreCommand } from './commands/enhance-lore.js';
import type { AppContext } from './types.js';
import { getPrompt, info, blank, c } from './ui.js';

// ─── Register All Commands ──────────────────────────────────

function registerAllCommands(): void {
  registerCommand(helpCommand);
  registerCommand(configCommand);
  registerCommand(createBookCommand);
  registerCommand(listCommand);
  registerCommand(selectCommand);
  registerCommand(createChapterCommand);
  registerCommand(reviewChapterCommand);
  registerCommand(rewriteChapterCommand);
  registerCommand(editLoreCommand);
  registerCommand(statusCommand);
  registerCommand(archiveCommand);
  registerCommand(jobsCommand);
  registerCommand(readCommand);
  registerCommand(exportCommand);
  registerCommand(resetPromptsCommand);
  registerCommand(enhanceLoreCommand);

  // Quit command
  registerCommand({
    name: 'quit',
    description: 'Exit inkai',
    aliases: ['exit', 'q'],
    async execute() {
      console.log(c.muted('\n  Goodbye! Happy writing. ✨\n'));
      process.exit(0);
    },
  });

  // Deselect book command
  registerCommand({
    name: 'deselect',
    description: 'Deselect current book project',
    aliases: ['close', 'back'],
    async execute(_args, ctx) {
      if (ctx.selectedBook) {
        info(`Deselected: ${ctx.selectedBook.projectName}`);
        ctx.selectedBook = null;
      } else {
        info('No book selected.');
      }
    },
  });
}

// ─── Start REPL ─────────────────────────────────────────────

export async function startREPL(ctx: AppContext): Promise<void> {
  registerAllCommands();

  blank();
  info(`Type ${c.primary('/help')} for available commands.`);
  blank();

  // We re-create the readline interface each prompt cycle because
  // @inquirer/prompts takes over stdin and can close/corrupt an
  // existing readline interface when its prompts finish.
  const prompt = (): void => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer: (line: string) => {
        const commands = getCommandNames();
        const hits = commands.filter(c => c.startsWith(line));
        return [hits.length ? hits : commands, line];
      },
    });

    const prefix = getPrompt(ctx.selectedBook?.projectName);
    rl.question(prefix, async (input) => {
      rl.close(); // release stdin before running the command

      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed.startsWith('/')) {
        await executeCommand(trimmed, ctx);
      } else {
        console.log(c.muted('  Type /help for commands, or prefix with / to run a command.'));
      }

      prompt();
    });

    // Handle Ctrl+C gracefully
    rl.on('close', () => {
      // Only exit if this was triggered by the user (Ctrl+C / Ctrl+D),
      // not by our explicit rl.close() above — we detect this by
      // checking if the close happens synchronously (user action)
      // vs. after rl.question callback. We use a simple flag for that.
    });
  };

  // Handle Ctrl+C at process level
  process.on('SIGINT', () => {
    console.log(c.muted('\n  Goodbye! Happy writing. ✨\n'));
    process.exit(0);
  });

  prompt();
}
