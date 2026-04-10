import { input, select, confirm } from '@inquirer/prompts';
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
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
  writeChapterPlan,
  readWritingInstructions,
  writeWritingInstructions,
} from '../book/manager.js';
import { chatSmall, chatMedium } from '../llm/manager.js';
import { multilineInput } from '../multiline.js';
import { saveJob, jobLogPath, isJobProcessAlive, type ChapterJob } from '../jobs.js';
import {
  buildChapterSuggestionPrompt,
  buildChapterPlanPrompt,
} from '../prompts/templates.js';
import { runChapterPipeline } from '../pipeline.js';
import { selectRelevantLore } from '../lore.js';
import { header, success, info, warn, error, blank, boxMessage, divider, c, progressStep } from '../ui.js';

const TOTAL_STEPS = 7;

export const createChapterCommand: Command = {
  name: 'create-chapter',
  description: 'Write the next chapter',
  aliases: ['write', 'chapter'],
  requiresBook: true,

  async execute(_args, ctx) {
    const book = ctx.selectedBook!;
    const currentCount = book.chapterCount;
    const nextChapter = currentCount + 1;

    header(`Write Chapter ${nextChapter}`);

    const spinner = ora({ text: 'Loading book context...', color: 'cyan' }).start();

    // ─── Load context ───────────────────────────────────────

    const [styleGuide, chapterSummary, writingInstructions] = await Promise.all([
      readStyleGuide(ctx.config, book.projectName),
      readChapterSummary(ctx.config, book.projectName),
      readWritingInstructions(ctx.config, book.projectName),
    ]);

    // Smart lore: ensure summaries are fresh, then select relevant files
    const loreContext = await selectRelevantLore(
      ctx.config, book.projectName,
      `Writing chapter ${nextChapter}. Summary so far:\n${chapterSummary}`,
      {
        onSummaryGenerateStart(count) {
          spinner.text = `Generating lore summaries (${count} files)...`;
        },
        onSummaryGenerateProgress(filename) {
          spinner.text = `Summarizing ${filename}...`;
        },
        onSelectionStart() {
          spinner.text = 'Selecting relevant lore...';
        },
      },
    );

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
      ], { maxTokens: 4096, temperature: 0.6 });

      const planPath = await writeChapterPlan(ctx.config, book.projectName, nextChapter, chapterPlan);
      spinner.succeed('Chapter plan created');
      info(`Plan saved: ${c.muted(planPath)}`);
    } catch (err: unknown) {
      spinner.fail('Failed to create plan: ' + (err instanceof Error ? err.message : String(err)));
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

    const runBg = await confirm({
      message: 'Detach this job? (runs in background — you can close inkai safely)',
      default: false,
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
          fullLoreContext: await readLoreContext(ctx.config, book.projectName),
          styleGuide,
          chapterSummary,
          chapterPlan,
          writingInstructions: finalInstructions,
        };
        await saveJob(job);

        // Spawn detached worker — survives parent exit
        // Redirect stdout/stderr to a log file for debugging
        const workerPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'worker.js');
        const logFile = jobLogPath(job.id);
        const logFd = openSync(logFile, 'a');
        const child = spawn(process.execPath, [workerPath, job.id], {
          detached: true,
          stdio: ['ignore', logFd, logFd],
        });
        const childPid = child.pid;
        child.unref();

        // Give the process a moment to start, then verify it's alive
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!isJobProcessAlive(childPid)) {
          job.status = 'failed';
          job.error = `Worker process exited immediately. Check log: ${logFile}`;
          job.finishedAt = new Date().toISOString();
          await saveJob(job);
          error(`Background worker crashed on startup. See log: ${c.muted(logFile)}`);
          return;
        }

        blank();
        success(`Chapter ${nextChapter} dispatched to background worker!`);
        info(`Job ID: ${c.muted(job.id)}`);
        info(`Log: ${c.muted(logFile)}`);
        info(`Use ${c.primary('/jobs')} to check progress.`);
        info('You can safely exit inkai — the writer will keep running.');
        blank();
        return;
    }

    // ─── Step 3: Read lore (fresh context for writer) ───────

    blank();
    progressStep(3, TOTAL_STEPS, 'Preparing writer context');

    // Load full lore for QA consistency checks
    const fullLoreContext = await readLoreContext(ctx.config, book.projectName);

    // ─── Steps 4-6: Write → QA → Save (shared pipeline) ────

    progressStep(4, TOTAL_STEPS, 'Writing chapter');

    let result;
    try {
      result = await runChapterPipeline({
        config: ctx.config,
        projectName: book.projectName,
        bookId: book.id,
        chapterNumber: nextChapter,
        loreContext,
        fullLoreContext,
        styleGuide,
        chapterSummary,
        chapterPlan,
        writingInstructions: finalInstructions,
      }, {
        onWriteStart() {
          spinner.start(`Writing Chapter ${nextChapter} (writer LLM — this may take a while)...`);
        },
        onWriteComplete() {
          spinner.succeed(`Chapter ${nextChapter} draft written`);
          blank();
          progressStep(5, TOTAL_STEPS, 'Quality check');
        },
        onQAStart() {
          spinner.start('QA agent reviewing chapter (writer LLM)...');
        },
        onQAComplete(qa) {
          if (qa.changesMade) {
            spinner.succeed('QA complete — issues found and fixed');
            if (qa.issues?.length) {
              blank();
              info('Issues fixed by QA:');
              for (const issue of qa.issues) {
                console.log(`    ${c.muted('•')} ${c.value(issue)}`);
              }
            }
          } else {
            spinner.succeed('QA complete — no issues found');
          }
        },
        onQAParseError() {
          spinner.warn('QA response was not parseable — using original draft');
        },
        onQAError(err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          spinner.warn('QA check failed: ' + msg + ' — using original draft');
        },
        onSaveStart() {
          blank();
          progressStep(6, TOTAL_STEPS, 'Saving and summarizing');
        },
        onSaveComplete(filePath) {
          info(`Chapter saved: ${c.muted(filePath)}`);
          spinner.start('Updating chapter summary...');
        },
        onSummaryComplete() {
          spinner.succeed('Summary updated');
        },
        onSummaryError() {
          spinner.warn('Could not update summary — you can do it manually');
        },
        onLoreExtractStart() {
          blank();
          progressStep(7, TOTAL_STEPS, 'Extracting lore notes');
          spinner.start('Extracting key facts from chapter...');
        },
        onLoreExtractComplete(notes) {
          if (notes.length > 0) {
            spinner.succeed(`Extracted ${notes.length} lore notes to notes.md`);
          } else {
            spinner.succeed('No new lore notes to extract');
          }
        },
        onLoreExtractError(err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          spinner.warn('Lore extraction failed: ' + msg + ' — you can add notes manually');
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      spinner.fail('Failed to write chapter: ' + msg);
      return;
    }

    book.chapterCount = nextChapter;

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
