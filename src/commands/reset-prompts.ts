import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { confirm } from '@inquirer/prompts';
import type { Command } from '../types.js';
import { PROMPT_DEFAULTS } from '../prompts/defaults.js';
import { getPromptsDir } from '../prompts/loader.js';
import { header, success, info, warn, blank, c } from '../ui.js';

export const resetPromptsCommand: Command = {
  name: 'reset-prompts',
  description: 'Reset all local prompt files to built-in defaults',
  aliases: ['prompts-reset'],

  async execute(_args, _ctx) {
    header('Reset Prompts');

    const count = Object.keys(PROMPT_DEFAULTS).length;
    warn(`This will overwrite all ${count} prompt files in ${c.highlight(getPromptsDir())} with built-in defaults.`);
    info('Any customisations you made will be lost.');
    blank();

    const ok = await confirm({ message: 'Are you sure?', default: false });
    if (!ok) {
      info('Cancelled.');
      blank();
      return;
    }

    const dir = getPromptsDir();
    for (const [name, content] of Object.entries(PROMPT_DEFAULTS)) {
      await writeFile(join(dir, `${name}.md`), content, 'utf-8');
    }

    success(`Reset ${count} prompt file(s) to defaults.`);
    blank();
  },
};
