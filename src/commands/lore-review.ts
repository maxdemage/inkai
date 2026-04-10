import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import { readLoreFiles, readChapterSummary, writeLoreFiles, getBookDir } from '../book/manager.js';
import { updateBook } from '../db.js';
import { chatWriter, chatMedium } from '../llm/manager.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { buildLoreReviewPrompt, buildLoreReviewApplyPrompt } from '../prompts/templates.js';
import { parseLLMJson } from '../llm/parse.js';
import { header, success, info, error, warn, blank, boxMessage, subheader, divider, c } from '../ui.js';

interface FileChange {
  file: string;
  changes: string[];
}

interface ReviewResult {
  fileChanges: FileChange[];
  summary: string;
}

export const loreReviewCommand: Command = {
  name: 'lore-review',
  description: 'Full lore review — find contradictions, gaps, and inconsistencies, then fix them',
  aliases: ['review-lore'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Lore Review');

    const spinner = ora({ text: 'Loading all lore files...', color: 'cyan' }).start();

    const [loreFiles, chapterSummary] = await Promise.all([
      readLoreFiles(ctx.config, book.projectName),
      readChapterSummary(ctx.config, book.projectName),
    ]);

    const fileNames = Object.keys(loreFiles);
    if (fileNames.length === 0) {
      spinner.fail('No lore files found. Create a book first.');
      return;
    }

    const totalChars = Object.values(loreFiles).reduce((sum, c) => sum + c.length, 0);
    spinner.succeed(`Loaded ${fileNames.length} lore files (${Math.ceil(totalChars / 1000)}k chars)`);

    // ─── Step 1: Full review with writer LLM ───────────────

    blank();
    info('Sending ALL lore to the writer LLM for deep review...');

    spinner.start('Reviewing lore (writer LLM — this may take a moment)...');

    let review: ReviewResult;
    try {
      const prompt = await buildLoreReviewPrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        loreFiles,
        chapterSummary,
      });

      const response = await chatWriter(ctx.config, [
        {
          role: 'system',
          content: 'You are a senior book editor and world-building consultant. Review lore for issues only. Always respond with valid JSON.',
        },
        { role: 'user', content: prompt },
      ], { jsonMode: true, maxTokens: 4096, temperature: 0.4 });

      review = parseLLMJson<ReviewResult>(response, 'lore review');
      spinner.succeed('Review complete');
    } catch (err: unknown) {
      spinner.fail('Failed to review: ' + (err instanceof Error ? err.message : String(err)));
      return;
    }

    // ─── Show results ───────────────────────────────────────

    blank();
    boxMessage(review.summary, 'Review Summary');
    blank();

    if (!review.fileChanges || review.fileChanges.length === 0) {
      success('No issues found! Your lore is in great shape.');
      return;
    }

    const totalChanges = review.fileChanges.reduce((sum, fc) => sum + fc.changes.length, 0);
    info(`Found ${totalChanges} suggested change(s) across ${review.fileChanges.length} file(s):`);
    blank();

    for (const fc of review.fileChanges) {
      subheader(fc.file);
      for (const change of fc.changes) {
        console.log(`    ${c.muted('•')} ${c.value(change)}`);
      }
      blank();
    }

    divider();
    blank();

    // ─── Ask to apply ───────────────────────────────────────

    const apply = await confirm({
      message: 'Apply these changes? Each file will be updated individually.',
      default: true,
    });

    if (!apply) {
      info('Changes not applied. You can review them and edit lore manually.');
      return;
    }

    // ─── Step 2: Apply changes file by file with medium LLM ─

    blank();
    let appliedCount = 0;
    let failedCount = 0;

    for (const fc of review.fileChanges) {
      const fileContent = loreFiles[fc.file];
      if (!fileContent) {
        warn(`File ${fc.file} not found in lore — skipping.`);
        failedCount++;
        continue;
      }

      spinner.start(`Updating ${fc.file} (${fc.changes.length} change(s))...`);

      try {
        const prompt = await buildLoreReviewApplyPrompt({
          title: book.title,
          filename: fc.file,
          fileContent,
          changes: fc.changes,
        });

        const updated = await chatMedium(ctx.config, [
          {
            role: 'system',
            content: 'You are an expert lore editor. Apply the requested changes precisely. Output only the complete updated file in markdown.',
          },
          { role: 'user', content: prompt },
        ], { maxTokens: 8192, temperature: 0.3 });

        await writeLoreFiles(ctx.config, book.projectName, { [fc.file]: updated });
        spinner.succeed(`Updated ${fc.file}`);
        appliedCount++;
      } catch (err: unknown) {
        spinner.fail(`Failed to update ${fc.file}: ` + (err instanceof Error ? err.message : String(err)));
        failedCount++;
      }
    }

    // ─── Wrap up ────────────────────────────────────────────

    // Invalidate lore summaries
    await updateBook(book.id, { summaryFresh: false });

    // Git commit
    if (appliedCount > 0 && isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
      const bookDir = getBookDir(ctx.config, book.projectName);
      await gitCommit(bookDir, `Lore review: updated ${appliedCount} file(s)`);
    }

    blank();
    divider();
    blank();

    if (appliedCount > 0) {
      success(`Updated ${appliedCount} lore file(s)`);
    }
    if (failedCount > 0) {
      warn(`${failedCount} file(s) could not be updated`);
    }

    info(`Use ${c.primary('/edit-lore')} to make further manual adjustments.`);
    blank();
  },
};
