import * as readline from 'node:readline';
import { registerCommand, executeCommand, getCommandNames, getAllCommands } from './commands/registry.js';
import { archiveCommand } from './commands/archive.js';
import { changeStatusCommand } from './commands/change-status.js';
import { charactersCommand } from './commands/characters.js';
import { configCommand } from './commands/config.js';
import { createBookCommand } from './commands/create-book.js';
import { createChapterCommand } from './commands/create-chapter.js';
import { deleteChapterCommand } from './commands/delete-chapter.js';
import { editBasicInfoCommand } from './commands/edit-basic-info.js';
import { editLoreCommand } from './commands/edit-lore.js';
import { enhanceLoreCommand } from './commands/enhance-lore.js';
import { exportCommand } from './commands/export.js';
import { helpCommand } from './commands/help.js';
import { jobsCommand } from './commands/jobs.js';
import { listCommand } from './commands/list.js';
import { listChaptersCommand } from './commands/list-chapters.js';
import { loreReviewCommand } from './commands/lore-review.js';
import { readCommand } from './commands/read.js';
import { readReviewCommand } from './commands/read-review.js';
import { renameCommand } from './commands/rename.js';
import { resetPromptsCommand } from './commands/reset-prompts.js';
import { reviewChapterCommand } from './commands/review-chapter.js';
import { rewriteChapterCommand } from './commands/rewrite-chapter.js';
import { selectCommand } from './commands/select.js';
import { statusCommand } from './commands/status.js';
import { storyArcCommand } from './commands/story-arc.js';
import { summaryCommand } from './commands/summary.js';
import { timelineCommand } from './commands/timeline.js';
import { serveCommand } from './commands/serve.js';
import { getAllBooks } from './db.js';
import { chatSmall } from './llm/manager.js';
import { parseLLMJson } from './llm/parse.js';
import type { AppContext } from './types.js';
import { getPrompt, info, blank, c } from './ui.js';

// ─── Register All Commands ──────────────────────────────────

function registerAllCommands(): void {
  registerCommand(archiveCommand);
  registerCommand(changeStatusCommand);
  registerCommand(charactersCommand);
  registerCommand(configCommand);
  registerCommand(createBookCommand);
  registerCommand(createChapterCommand);
  registerCommand(editBasicInfoCommand);
  registerCommand(editLoreCommand);
  registerCommand(enhanceLoreCommand);
  registerCommand(exportCommand);
  registerCommand(helpCommand);
  registerCommand(jobsCommand);
  registerCommand(listCommand);
  registerCommand(listChaptersCommand);
  registerCommand(loreReviewCommand);
  registerCommand(readCommand);
  registerCommand(readReviewCommand);
  registerCommand(deleteChapterCommand);
  registerCommand(renameCommand);
  registerCommand(resetPromptsCommand);
  registerCommand(reviewChapterCommand);
  registerCommand(rewriteChapterCommand);
  registerCommand(selectCommand);
  registerCommand(statusCommand);
  registerCommand(storyArcCommand);
  registerCommand(summaryCommand);
  registerCommand(timelineCommand);
  registerCommand(serveCommand);

  // Quit command
  registerCommand({
    name: 'quit',
    description: 'Exit inkai',
    aliases: ['exit', 'q'],
    async execute() {
      console.log(c.muted('\n  🐙 Goodbye! Happy writing. ✨\n'));
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

// ─── Natural Language Fallback ──────────────────────────────

function buildCommandList(ctx: AppContext): string {
  const cmds = getAllCommands();
  return cmds.map(cmd => {
    const aliases = cmd.aliases?.length ? ` (aliases: ${cmd.aliases.map(a => '/' + a).join(', ')})` : '';
    const req = cmd.requiresBook ? ' [requires selected book]' : '';
    return `/${cmd.name} — ${cmd.description}${aliases}${req}`;
  }).join('\n');
}

async function handleNaturalInput(input: string, ctx: AppContext): Promise<string | null> {
  // Check if LLM is configured
  if (!ctx.config.tiers?.small?.provider || !ctx.config.providers[ctx.config.tiers.small.provider]?.apiKey) {
    console.log(c.muted('  Type /help for commands, or prefix with / to run a command.'));
    return null;
  }

  const spinner = (await import('ora')).default({ text: 'Thinking...', color: 'cyan' }).start();

  try {
    const books = await getAllBooks();
    const activeBooks = books.filter(b => b.status !== 'archived');
    const bookList = activeBooks.length > 0
      ? activeBooks.map(b => {
          const age = Math.floor((Date.now() - new Date(b.updatedAt).getTime()) / 86400000);
          const lastActive = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age}d ago`;
          return `- ${b.projectName}: "${b.title}" | ${b.type} (${b.genre}${b.subgenre ? '/' + b.subgenre : ''}) | ${b.chapterCount} chapters | status: ${b.status} | last active: ${lastActive}`;
        }).join('\n')
      : 'No books created yet.';

    const selectedInfo = ctx.selectedBook
      ? `Currently selected book: ${ctx.selectedBook.projectName} ("${ctx.selectedBook.title}", ${ctx.selectedBook.type}, ${ctx.selectedBook.genre}, ${ctx.selectedBook.chapterCount} chapters, status: ${ctx.selectedBook.status})`
      : 'No book currently selected.';

    const systemPrompt = `You are inkai's CLI assistant. The user typed something that isn't a command. Help them figure out what command to use.

Available commands:
${buildCommandList(ctx)}

Books:
${bookList}

${selectedInfo}

Respond with JSON: { "message": "brief helpful explanation", "command": "/suggested-command with-args" }
- "message": 1-2 sentences max, friendly and concise
- "command": the exact command string they should run (with / prefix), or null if no command fits
Keep it short. Don't explain what every command does.`;

    const response = await chatSmall(ctx.config, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ], { jsonMode: true, maxTokens: 200, temperature: 0.3 });

    const parsed = parseLLMJson<{ message: string; command: string | null }>(response, 'CLI assistant');
    spinner.stop();

    blank();
    console.log(`  ${c.value(parsed.message)}`);

    if (parsed.command) {
      blank();
      // Show suggested command and prompt with it pre-filled
      return parsed.command;
    }

    return null;
  } catch {
    spinner.stop();
    console.log(c.muted('  Type /help for commands, or prefix with / to run a command.'));
    return null;
  }
}

// ─── Start REPL ─────────────────────────────────────────────

export async function startREPL(ctx: AppContext): Promise<void> {
  registerAllCommands();

  blank();
  info(`Type ${c.primary('/help')} for available commands.`);
  blank();

  const MAX_HISTORY = 30;
  const commandHistory: string[] = []; // newest-first for readline

  // We re-create the readline interface each prompt cycle because
  // @inquirer/prompts takes over stdin and can close/corrupt an
  // existing readline interface when its prompts finish.
  const prompt = (prefill?: string): void => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      history: [...commandHistory],
      historySize: MAX_HISTORY,
      completer: (line: string) => {
        const commands = getCommandNames();
        const hits = commands.filter(c => c.startsWith(line));
        return [hits.length ? hits : commands, line];
      },
    });

    const prefix = getPrompt(ctx.selectedBook?.projectName);

    // If we have a pre-filled command, write it into the line buffer
    const handleInput = async (input: string): Promise<void> => {
      rl.close();

      const trimmed = input.trim();
      if (!trimmed) {
        prompt();
        return;
      }

      // Add to history (newest-first, no consecutive dups)
      if (commandHistory[0] !== trimmed) {
        commandHistory.unshift(trimmed);
        if (commandHistory.length > MAX_HISTORY) commandHistory.pop();
      }

      if (trimmed.startsWith('/')) {
        await executeCommand(trimmed, ctx);
      } else {
        const suggested = await handleNaturalInput(trimmed, ctx);
        if (suggested) {
          prompt(suggested);
          return;
        }
      }

      prompt();
    };

    if (prefill) {
      rl.question(prefix, handleInput);
      // Simulate typing the prefill into the readline buffer
      rl.write(prefill);
    } else {
      rl.question(prefix, handleInput);
    }

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
