import { input } from '@inquirer/prompts';
import ora from 'ora';
import type { Command } from '../types.js';
import { readLoreFiles, writeLoreFiles, getBookDir } from '../book/manager.js';
import { updateBook } from '../db.js';
import { chatMedium, chatWriter } from '../llm/manager.js';
import { multilineInput } from '../multiline.js';
import { gitCommit, isGitAvailable } from '../git.js';
import { buildEnhanceLoreQuestionsPrompt, buildEnhanceLoreApplyPrompt } from '../prompts/templates.js';
import { parseLLMJson } from '../llm/parse.js';
import { header, success, info, error, blank, boxMessage, subheader, c } from '../ui.js';

interface EnhanceQuestion {
  key: string;
  question: string;
  context: string;
  loreFile: string;
}

export const enhanceLoreCommand: Command = {
  name: 'enhance-lore',
  description: 'AI-guided lore enhancement — answer targeted questions to deepen your world',
  aliases: ['enhance'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;

    header('Enhance Lore');

    info('The AI will analyse your lore and ask targeted questions to help you deepen your world, characters, and story.');
    blank();

    const spinner = ora({ text: 'Reading lore files...', color: 'cyan' }).start();

    const loreFiles = await readLoreFiles(ctx.config, book.projectName);
    if (Object.keys(loreFiles).length === 0) {
      spinner.fail('No lore files found. Use /edit-lore or re-create the book.');
      return;
    }

    // ─── Step 1: Generate targeted questions ────────────────

    spinner.text = 'Analysing lore and generating enhancement questions...';

    let questions: EnhanceQuestion[];
    try {
      const prompt = await buildEnhanceLoreQuestionsPrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        loreFiles,
      });

      const response = await chatMedium(ctx.config, [
        { role: 'system', content: 'You are an expert book development consultant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ], { jsonMode: true, temperature: 0.8 });

      const parsed = parseLLMJson<{ questions: EnhanceQuestion[] }>(response, 'enhance lore questions');
      questions = parsed.questions;
      spinner.succeed(`Generated ${questions.length} enhancement questions`);
    } catch (err: unknown) {
      spinner.fail('Failed to generate questions: ' + (err instanceof Error ? err.message : String(err)));
      return;
    }

    // ─── Step 2: Ask the author ─────────────────────────────

    blank();
    boxMessage(
      c.value('Lore Enhancement\n') +
      c.muted('Answer the questions below to enrich your lore. Press Enter to skip any question.'),
      'Enhancement Session'
    );
    blank();

    const answers: Record<string, string> = {};
    let answeredCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      subheader(`Question ${i + 1}/${questions.length}`);
      if (q.context) {
        console.log(c.muted(`    ${q.context}`));
      }
      if (q.loreFile) {
        console.log(c.muted(`    Related file: ${q.loreFile}`));
      }

      try {
        const answer = await multilineInput(q.question);
        if (answer.trim()) {
          answers[q.key] = answer.trim();
          answeredCount++;
        }
      } catch {
        // User cancelled
      }
      blank();
    }

    if (answeredCount === 0) {
      info('No answers provided. Lore unchanged.');
      blank();
      return;
    }

    // ─── Step 3: Apply enhancements to lore ─────────────────

    spinner.start(`Enhancing lore with ${answeredCount} answer(s) (writer LLM)...`);

    try {
      const prompt = await buildEnhanceLoreApplyPrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        loreFiles,
        answers,
      });

      const response = await chatWriter(ctx.config, [
        { role: 'system', content: 'You are an expert book development assistant. Apply lore enhancements naturally. Return valid JSON.' },
        { role: 'user', content: prompt },
      ], { jsonMode: true, maxTokens: 8192, temperature: 0.5 });

      const parsed = parseLLMJson<{ files: Record<string, string>; changes?: string[] }>(response, 'enhance lore apply');
      await writeLoreFiles(ctx.config, book.projectName, parsed.files);

      const modifiedFiles = Object.keys(parsed.files);
      spinner.succeed(`Enhanced ${modifiedFiles.length} lore file(s)`);

      blank();
      for (const file of modifiedFiles) {
        info(`  Updated: ${c.highlight(file)}`);
      }

      if (parsed.changes && Array.isArray(parsed.changes)) {
        blank();
        subheader('Changes made');
        for (const change of parsed.changes) {
          console.log(c.muted(`    • ${change}`));
        }
      }

      // Git commit
      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, `Enhance lore (${answeredCount} answers)`);
      }

      blank();
      success('Lore enhanced successfully!');

      // Invalidate cached summary
      await updateBook(book.id, { summaryFresh: false });

      info(`Use ${c.primary('/edit-lore')} to review the changes, or ${c.primary('/enhance-lore')} again to go deeper.`);
      blank();

    } catch (err: unknown) {
      spinner.fail('Failed to enhance lore: ' + (err instanceof Error ? err.message : String(err)));
    }
  },
};
