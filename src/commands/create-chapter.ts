import { input, select, confirm } from '@inquirer/prompts';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { nanoid } from 'nanoid';
import ora from 'ora';
import type { Command } from '../types.js';
import {
  readLoreContext,
  readStyleGuide,
  readChapterSummary,
  readChapter,
  writeChapter,
  writeChapterPlan,
  readWritingInstructions,
  writeWritingInstructions,
  updateChapterSummary,
  getChapterCount,
  getBookDir,
} from '../book/manager.js';
import { updateBook } from '../db.js';
import { chatSmall, chatMedium, chatWriter } from '../llm/manager.js';
import { multilineInput } from '../multiline.js';
import { gitCommit } from '../git.js';
import { saveJob, type ChapterJob } from '../jobs.js';
import {
  buildChapterSuggestionPrompt,
  buildChapterPlanPrompt,
  buildChapterWritingFromPlanPrompt,
  buildChapterQAPrompt,
  buildSummaryUpdatePrompt,
} from '../prompts/templates.js';
import { header, success, info, warn, error, blank, boxMessage, divider, c, progressStep } from '../ui.js';

const TOTAL_STEPS = 6;

export const createChapterCommand: Command = {
  name: 'create-chapter',
  description: 'Write the next chapter',
  aliases: ['write', 'chapter'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;
    const currentCount = await getChapterCount(ctx.config, book.projectName);
    const nextChapter = currentCount + 1;

    header(`Write Chapter ${nextChapter}`);

    const spinner = ora({ text: 'Loading book context...', color: 'cyan' }).start();

    // ─── Load context ───────────────────────────────────────

    const [loreContext, styleGuide, chapterSummary, writingInstructions] = await Promise.all([
      readLoreContext(ctx.config, book.projectName),
      readStyleGuide(ctx.config, book.projectName),
      readChapterSummary(ctx.config, book.projectName),
      readWritingInstructions(ctx.config, book.projectName),
    ]);

    // Read previous chapter if it exists
    let previousChapter: string | null = null;
    if (currentCount > 0) {
      previousChapter = await readChapter(ctx.config, book.projectName, currentCount);
    }

    spinner.succeed('Context loaded');

    // ─── First chapter? Ask about writing process ───────────

    if (currentCount === 0 && !writingInstructions) {
      blank();
      boxMessage(
        c.value('This is your first chapter! Let\'s set up how you\'d like the writing process to work.\n') +
        c.muted('These instructions will guide the AI writer for all future chapters.\n') +
        c.muted('You can change them later with /config.'),
        'Writing Process Setup'
      );
      blank();

      const wantCustom = await confirm({
        message: 'Would you like to customize the writing process? (No = use defaults)',
        default: false,
      });

      if (wantCustom) {
        info('Describe how you want the AI to approach writing chapters.');
        info('Examples: chapter length, dialogue style, pacing, perspective rules, etc.');
        blank();

        const instructions = await multilineInput('Writing process instructions:');
        if (instructions.trim()) {
          await writeWritingInstructions(ctx.config, book.projectName, instructions.trim());
          success('Writing instructions saved.');
        }
      } else {
        info('Using default writing process. You can customize later.');
      }
      blank();
      divider();
      blank();
    }

    // Re-read in case we just wrote them
    const finalInstructions = await readWritingInstructions(ctx.config, book.projectName);

    // ─── Step 1: Get guidelines ─────────────────────────────

    progressStep(1, TOTAL_STEPS, 'Getting chapter direction');
    blank();

    const approach = await select({
      message: 'How would you like to start this chapter?',
      choices: [
        { name: 'See AI suggestion first, then decide', value: 'suggest' },
        { name: 'Write my own guidelines', value: 'own' },
      ],
    });

    let guidelines: string;

    if (approach === 'suggest') {
      spinner.start('Generating chapter suggestion...');
      let suggestion = '';
      try {
        suggestion = await chatSmall(ctx.config, [
          { role: 'system', content: 'You are a book planning assistant. Be concise and creative.' },
          { role: 'user', content: await buildChapterSuggestionPrompt(loreContext, chapterSummary, nextChapter) },
        ], { maxTokens: 600 });
        spinner.succeed('Suggestion ready');
      } catch {
        spinner.warn('Could not generate suggestion — write your own instead');
      }

      if (suggestion) {
        blank();
        boxMessage(suggestion, 'Suggested Direction');
        blank();

        const useSuggestion = await confirm({
          message: 'Use this suggestion as the chapter direction?',
          default: true,
        });

        if (useSuggestion) {
          guidelines = suggestion;
          const extraNotes = await input({
            message: 'Any additional notes or changes? (Enter to skip):',
          });
          if (extraNotes.trim()) {
            guidelines += '\n\nAdditional author notes: ' + extraNotes.trim();
          }
        } else {
          guidelines = await multilineInput('Write your guidelines for this chapter:');
        }
      } else {
        guidelines = await multilineInput('Write your guidelines for this chapter:');
      }
    } else {
      guidelines = await multilineInput('Write your guidelines for this chapter:');
    }

    if (!guidelines.trim()) {
      error('No guidelines provided. Aborting.');
      return;
    }

    // ─── Step 2: Create chapter plan ────────────────────────

    blank();
    progressStep(2, TOTAL_STEPS, 'Creating chapter plan');

    spinner.start(`Planning Chapter ${nextChapter} (medium LLM)...`);

    let chapterPlan: string;
    try {
      chapterPlan = await chatMedium(ctx.config, [
        { role: 'system', content: 'You are a senior book planner. Create detailed, structured chapter plans in markdown. Output only the plan.' },
        { role: 'user', content: await buildChapterPlanPrompt(
          loreContext,
          styleGuide,
          chapterSummary,
          previousChapter,
          nextChapter,
          guidelines,
          finalInstructions
        ) },
      ], { maxTokens: 2000, temperature: 0.6 });

      const planPath = await writeChapterPlan(ctx.config, book.projectName, nextChapter, chapterPlan);
      spinner.succeed('Chapter plan created');
      info(`Plan saved: ${c.muted(planPath)}`);
    } catch (err: any) {
      spinner.fail('Failed to create plan: ' + err.message);
      return;
    }

    // Show plan to author
    blank();
    boxMessage(chapterPlan, `Plan: Chapter ${nextChapter}`);
    blank();

    const proceedWithPlan = await confirm({
      message: 'Proceed with this plan?',
      default: true,
    });

    if (!proceedWithPlan) {
      info('Chapter creation cancelled. The plan is saved — you can restart and modify it.');
      return;
    }

    // ─── Background mode? ───────────────────────────────────

    if (ctx.config.backgroundWriting) {
      const runBg = await confirm({
        message: 'Run writing in the background? (you can close inkai safely)',
        default: true,
      });

      if (runBg) {
        const job: ChapterJob = {
          id: nanoid(10),
          status: 'pending',
          bookId: book.id,
          projectName: book.projectName,
          bookTitle: book.title,
          chapterNumber: nextChapter,
          configSnapshot: JSON.stringify(ctx.config),
          loreContext,
          styleGuide,
          chapterSummary,
          chapterPlan,
          writingInstructions: finalInstructions,
        };
        await saveJob(job);

        // Spawn detached worker — survives parent exit
        const workerPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'worker.js');
        const child = spawn(process.execPath, [workerPath, job.id], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();

        blank();
        success(`Chapter ${nextChapter} dispatched to background worker!`);
        info(`Job ID: ${c.muted(job.id)}`);
        info(`Use ${c.primary('/jobs')} to check progress.`);
        info('You can safely exit inkai — the writer will keep running.');
        blank();
        return;
      }
    }

    // ─── Step 3: Read lore (fresh context for writer) ───────

    blank();
    progressStep(3, TOTAL_STEPS, 'Preparing writer context');

    // ─── Step 4: Write the chapter (fresh writer agent) ─────

    progressStep(4, TOTAL_STEPS, 'Writing chapter');

    spinner.start(`Writing Chapter ${nextChapter} (writer LLM — this may take a while)...`);

    let chapterContent: string;
    try {
      // Fresh context: writer only sees lore + style + plan (no previous conversation)
      chapterContent = await chatWriter(ctx.config, [
        {
          role: 'system',
          content: 'You are an expert fiction writer. You receive a lore bible, style guide, and a detailed chapter plan. Write the complete chapter following the plan precisely. Output only the chapter in markdown.',
        },
        {
          role: 'user',
          content: await buildChapterWritingFromPlanPrompt(
            loreContext,
            styleGuide,
            chapterPlan,
            nextChapter,
            finalInstructions
          ),
        },
      ], { maxTokens: 8192, temperature: 0.8 });

      spinner.succeed(`Chapter ${nextChapter} draft written`);
    } catch (err: any) {
      spinner.fail('Failed to write chapter: ' + err.message);
      return;
    }

    // ─── Step 5: QA agent (fresh context) ───────────────────

    blank();
    progressStep(5, TOTAL_STEPS, 'Quality check');

    spinner.start('QA agent reviewing chapter (writer LLM)...');

    try {
      // Fresh context: QA agent only sees lore + style + plan + draft
      const qaResponse = await chatWriter(ctx.config, [
        {
          role: 'system',
          content: 'You are a quality assurance editor. Check the chapter against lore and plan. Fix issues directly. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: await buildChapterQAPrompt(
            loreContext,
            styleGuide,
            chapterPlan,
            chapterContent,
            nextChapter
          ),
        },
      ], { jsonMode: true, maxTokens: 8192, temperature: 0.3 });

      try {
        const qaResult = JSON.parse(qaResponse);

        if (qaResult.changes_made && qaResult.chapter) {
          chapterContent = qaResult.chapter;
          spinner.succeed('QA complete — issues found and fixed');

          if (qaResult.issues_found?.length) {
            blank();
            info('Issues fixed by QA:');
            for (const issue of qaResult.issues_found) {
              console.log(`    ${c.muted('•')} ${c.value(issue)}`);
            }
          }
        } else {
          spinner.succeed('QA complete — no issues found');
        }
      } catch {
        // If JSON parsing fails, use original draft
        spinner.warn('QA response was not parseable — using original draft');
      }
    } catch (err: any) {
      spinner.warn('QA check failed: ' + err.message + ' — using original draft');
    }

    // ─── Step 6: Save and summarize ─────────────────────────

    blank();
    progressStep(6, TOTAL_STEPS, 'Saving and summarizing');

    // Write chapter
    const filePath = await writeChapter(ctx.config, book.projectName, nextChapter, chapterContent);
    info(`Chapter saved: ${c.muted(filePath)}`);

    // Update chapter summary
    spinner.start('Updating chapter summary...');
    try {
      const updatedSummary = await chatSmall(ctx.config, [
        { role: 'system', content: 'You are a book assistant. Update the summary document. Output only markdown.' },
        { role: 'user', content: await buildSummaryUpdatePrompt(chapterSummary, chapterContent, nextChapter) },
      ], { maxTokens: 2000 });

      await updateChapterSummary(ctx.config, book.projectName, updatedSummary);
      spinner.succeed('Summary updated');
    } catch {
      spinner.warn('Could not update summary — you can do it manually');
    }

    // Update book record
    await updateBook(book.id, { chapterCount: nextChapter });
    book.chapterCount = nextChapter;

    // Git commit
    if (ctx.config.git.enabled && ctx.config.git.autoCommit) {
      const bookDir = getBookDir(ctx.config, book.projectName);
      await gitCommit(bookDir, `Write Chapter ${nextChapter}`);
    }

    // ─── Done ───────────────────────────────────────────────

    blank();
    divider();
    blank();
    success(`Chapter ${nextChapter} complete!`);
    info(`Plan: ${c.muted(`chapters-plan/plan-chapter-${String(nextChapter).padStart(2, '0')}.md`)}`);
    info(`Chapter: ${c.muted(`chapters/chapter-${String(nextChapter).padStart(2, '0')}.md`)}`);
    info(`Use ${c.primary(`/review-chapter ${nextChapter}`)} for a detailed literary review.`);
    blank();
  },
};
