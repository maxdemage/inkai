import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { confirm, select } from '@inquirer/prompts';
import type { Command } from '../types.js';
import { SUPPORTED_LANGUAGES } from '../prompts/defaults.js';
import { getPromptsDir, resetPromptFiles } from '../prompts/loader.js';
import { saveConfig } from '../config.js';
import { header, success, info, warn, blank, c } from '../ui.js';

export const resetPromptsCommand: Command = {
  name: 'reset-prompts',
  description: 'Reset all local prompt files to built-in defaults',
  aliases: ['prompts-reset'],

  async execute(_args, ctx) {
    header('Reset Prompts');

    // Ask language
    const language = await select({
      message: 'Which language should the prompts use?',
      choices: SUPPORTED_LANGUAGES.map(l => ({
        name: l.name,
        value: l.code,
      })),
      default: ctx.config.language,
    });

    const dir = getPromptsDir();
    warn(`This will overwrite all prompt files in ${c.highlight(dir)} with ${language.toUpperCase()} defaults.`);
    info('Any customisations you made will be lost.');
    blank();

    const ok = await confirm({ message: 'Are you sure?', default: false });
    if (!ok) {
      info('Cancelled.');
      blank();
      return;
    }

    const count = await resetPromptFiles(language);

    // Save chosen language to config
    ctx.config.language = language;
    await saveConfig(ctx.config);

    success(`Reset ${count} prompt file(s) to ${language.toUpperCase()} defaults.`);
    blank();
  },
};
