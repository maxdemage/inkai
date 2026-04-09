import { input } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import { readLoreFiles, writeLoreFiles } from '../book/manager.js';
import { chatMedium, chatWriter } from '../llm/manager.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { getBookDir } from '../book/manager.js';
import { buildLoreSummaryPrompt, buildLoreEditPrompt } from '../prompts/templates.js';
import { header, success, info, error, blank, boxMessage, c } from '../ui.js';

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

    // Get summary from medium LLM
    spinner.text = 'Analyzing current lore...';
    let summary: string;
    try {
      summary = await chatMedium(ctx.config, [
        { role: 'system', content: 'You are a book development assistant. Summarize the lore concisely and ask what the author wants to change.' },
        { role: 'user', content: await buildLoreSummaryPrompt(loreFiles) },
      ], { maxTokens: 1500 });
      spinner.succeed('Lore analyzed');
    } catch (err: any) {
      spinner.fail('Failed to analyze lore: ' + err.message);
      return;
    }

    blank();
    boxMessage(summary, 'Current Lore Overview');
    blank();

    // Get author's edit request
    const editRequest = await input({
      message: 'What would you like to change? (Enter to cancel):',
    });

    if (!editRequest.trim()) {
      info('No changes requested.');
      return;
    }

    // Apply changes with writer LLM
    spinner.start('Applying changes (writer LLM)...');

    try {
      const response = await chatWriter(ctx.config, [
        { role: 'system', content: 'You are an expert book development assistant. Apply requested changes to lore files. Return valid JSON with modified files only.' },
        { role: 'user', content: await buildLoreEditPrompt(loreFiles, editRequest) },
      ], { jsonMode: true, maxTokens: 8192, temperature: 0.5 });

      const parsed = JSON.parse(response);
      await writeLoreFiles(ctx.config, book.projectName, parsed.files);

      const modifiedFiles = Object.keys(parsed.files);
      spinner.succeed(`Updated ${modifiedFiles.length} file(s)`);

      for (const file of modifiedFiles) {
        info(`  Modified: ${c.muted(file)}`);
      }

      // Git commit
      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, `Edit lore: ${editRequest.slice(0, 60)}`);
      }

      blank();
      success('Lore updated successfully!');
      blank();

    } catch (err: any) {
      spinner.fail('Failed to update lore: ' + err.message);
    }
  },
};
