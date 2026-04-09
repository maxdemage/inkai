import type { Command } from '../types.js';
import { getAllCommands } from './registry.js';
import { header, c, blank, divider } from '../ui.js';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands',
  aliases: ['h', '?'],

  async execute(_args, ctx) {
    header('Available Commands');

    const cmds = getAllCommands();
    const globalCmds = cmds.filter(c => !c.requiresBook);
    const bookCmds = cmds.filter(c => c.requiresBook);

    console.log(c.label('  Global Commands:'));
    blank();
    for (const cmd of globalCmds) {
      const aliases = cmd.aliases?.length ? c.muted(` (${cmd.aliases.map(a => '/' + a).join(', ')})`) : '';
      console.log(`    ${c.primary('/' + cmd.name.padEnd(20))} ${c.value(cmd.description)}${aliases}`);
    }

    blank();
    divider();
    blank();

    console.log(c.label('  Book Commands') + c.muted(' (requires /select):'));
    blank();
    for (const cmd of bookCmds) {
      const aliases = cmd.aliases?.length ? c.muted(` (${cmd.aliases.map(a => '/' + a).join(', ')})`) : '';
      console.log(`    ${c.accent('/' + cmd.name.padEnd(20))} ${c.value(cmd.description)}${aliases}`);
    }

    blank();
    console.log(c.muted('  Type /quit or Ctrl+C to exit.'));
    blank();
  },
};
