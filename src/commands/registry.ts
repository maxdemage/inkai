import type { Command, AppContext } from '../types.js';
import { error } from '../ui.js';

const commands = new Map<string, Command>();

export function registerCommand(cmd: Command): void {
  commands.set(cmd.name, cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      commands.set(alias, cmd);
    }
  }
}

export function getCommand(name: string): Command | undefined {
  return commands.get(name);
}

export function getAllCommands(): Command[] {
  // De-duplicate (aliases point to same command)
  const unique = new Map<string, Command>();
  for (const cmd of commands.values()) {
    unique.set(cmd.name, cmd);
  }
  return Array.from(unique.values());
}

export function getCommandNames(): string[] {
  return Array.from(commands.keys()).map(n => `/${n}`);
}

export async function executeCommand(input: string, ctx: AppContext): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return false;

  const parts = trimmed.slice(1).split(/\s+/);
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const cmd = getCommand(cmdName);
  if (!cmd) {
    error(`Unknown command: /${cmdName}. Type /help for available commands.`);
    return true;
  }

  if (cmd.requiresBook && !ctx.selectedBook) {
    error(`This command requires a selected book. Use /select first.`);
    return true;
  }

  try {
    await cmd.execute(args, ctx);
  } catch (err: any) {
    error(err.message || 'Command failed.');
  }

  return true;
}
