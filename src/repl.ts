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
import { gitCommitCommand } from './commands/git-commit.js';
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
  registerCommand(gitCommitCommand);
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

  // Agent history command
  registerCommand({
    name: 'agent-history',
    description: 'Show mini-agent actions from this session',
    aliases: ['history'],
    async execute() {
      if (agentHistory.length === 0) {
        info('No agent actions in this session yet.');
        return;
      }
      blank();
      for (const entry of [...agentHistory].reverse()) {
        const t = entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log(`  ${c.accent('⚡')} ${c.value(entry.intent)} ${c.muted(`(${t})`)}`);
        for (const s of entry.steps) {
          console.log(`     ${c.muted('›')} ${s}`);
        }
        blank();
      }
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

// ─── Mini-Agent ──────────────────────────────────────────────

type AgentStep =
  | { type: 'say'; message: string }
  | { type: 'ask'; key: string; question: string }
  | { type: 'select-book'; projectName: string }
  | { type: 'run'; command: string; passAnswerKey?: string | null };

interface AgentPlan {
  intent: string;
  steps: AgentStep[];
}

interface AgentHistoryEntry {
  timestamp: Date;
  intent: string;
  steps: string[];
}

const agentHistory: AgentHistoryEntry[] = [];

function buildCommandList(ctx: AppContext): string {
  const cmds = getAllCommands();
  return cmds.map(cmd => {
    const aliases = cmd.aliases?.length ? ` (aliases: ${cmd.aliases.map(a => '/' + a).join(', ')})` : '';
    const req = cmd.requiresBook ? ' [requires selected book]' : '';
    return `/${cmd.name} — ${cmd.description}${aliases}${req}`;
  }).join('\n');
}

async function agentAsk(question: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(`  ${c.primary('?')} ${question} `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runMiniAgent(input: string, ctx: AppContext): Promise<void> {
  if (!ctx.config.tiers?.small?.provider || !ctx.config.providers[ctx.config.tiers.small.provider]?.apiKey) {
    console.log(c.muted('  Type /help for commands, or prefix with / to run a command.'));
    return;
  }

  const spinner = (await import('ora')).default({ text: 'Thinking...', color: 'cyan' }).start();

  let plan: AgentPlan;
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
      ? `Currently selected book: ${ctx.selectedBook.projectName} ("${ctx.selectedBook.title}", ${ctx.selectedBook.type}, ${ctx.selectedBook.genre}, ${ctx.selectedBook.chapterCount} chapters)`
      : 'No book currently selected.';

    const systemPrompt = `You are inkai's mini-agent. The user typed natural language instead of a slash command. Understand their intent and produce a step-by-step plan.

Available commands:
${buildCommandList(ctx)}

Books:
${bookList}

${selectedInfo}

Respond with a JSON plan using this EXACT format:
{
  "intent": "One sentence: what you are doing for the user",
  "steps": [
    { "type": "say", "message": "..." },
    { "type": "select-book", "projectName": "exact-project-name" },
    { "type": "ask", "key": "variable_name", "question": "Question to ask the user?" },
    { "type": "run", "command": "/command-name", "passAnswerKey": "variable_name_or_null" }
  ]
}

Step types:
- "say": Print a short message to the user (acknowledgment or explanation, 1 sentence max)
- "select-book": Auto-select a book by its exact projectName. Use when the user mentions a book that isn't currently selected.
- "ask": Ask the user a focused question. Store their answer under "key". Keep questions short and specific.
- "run": Execute a CLI command. If "passAnswerKey" is set to a key from a prior "ask" step, that answer will be injected into the command so it can skip its own interactive prompt.

Rules:
- If a book is mentioned but not selected, add a "select-book" step first
- Keep plans minimal: 1-4 steps
- "passAnswerKey" must be null (or omitted) if there is no matching prior "ask" step
- If intent is completely unclear, use a single "say" step asking for clarification
- Never invent commands that don't exist in the list above`;

    const response = await chatSmall(ctx.config, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ], { jsonMode: true, maxTokens: 400, temperature: 0.3 });

    plan = parseLLMJson<AgentPlan>(response, 'mini-agent');
    spinner.stop();
  } catch {
    spinner.stop();
    console.log(c.muted('  Type /help for commands, or prefix with / to run a command.'));
    return;
  }

  blank();
  console.log(`  ${c.accent('⚡')} ${c.value(plan.intent)}`);
  blank();

  const vars: Record<string, string> = {};
  const completedSteps: string[] = [];

  for (const step of plan.steps) {
    if (step.type === 'say') {
      console.log(`  ${c.muted('›')} ${step.message}`);
      completedSteps.push(step.message);
      blank();

    } else if (step.type === 'ask') {
      const answer = await agentAsk(step.question);
      vars[step.key] = answer;
      completedSteps.push(`Asked: "${step.question}" → "${answer}"`);
      blank();

    } else if (step.type === 'select-book') {
      await executeCommand(`/select ${step.projectName}`, ctx);
      completedSteps.push(`Selected book: ${step.projectName}`);

    } else if (step.type === 'run') {
      if (step.passAnswerKey && vars[step.passAnswerKey]) {
        ctx.agentInput = vars[step.passAnswerKey];
      }
      await executeCommand(step.command, ctx);
      ctx.agentInput = undefined;
      completedSteps.push(`Ran ${step.command}`);
    }
  }

  agentHistory.push({ timestamp: new Date(), intent: plan.intent, steps: completedSteps });
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
        await runMiniAgent(trimmed, ctx);
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
