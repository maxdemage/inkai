import { input, select } from '@inquirer/prompts';
import ora from 'ora';
import type { Command, BookType, LoreQuestion } from '../types.js';
import { BOOK_TYPES } from '../types.js';
import { chatSmall, chatWriter } from '../llm/manager.js';
import { multilineInput } from '../multiline.js';
import { createBookProject, writeLoreFiles, setBookStatus } from '../book/manager.js';
import { gitInit, gitCommit, isGitAvailable } from '../git.js';
import { getBookDir } from '../book/manager.js';
import { buildLoreQuestionsRound1Prompt, buildLoreQuestionsRound2Prompt, buildLoreGenerationPrompt } from '../prompts/templates.js';
import { parseLLMJson } from '../llm/parse.js';
import { header, success, info, error, blank, c, boxMessage, divider, subheader } from '../ui.js';

export const createBookCommand: Command = {
  name: 'create-book',
  description: 'Create a new book project',
  aliases: ['new', 'create'],

  async execute(_args, ctx) {
    header('Create New Book');

    info('We\'ll start by gathering some details about your book — basics first, then deeper questions so the AI can understand your vision.');
    blank();

    // ─── Basic Questions ────────────────────────────────────

    const projectName = await input({
      message: 'Project name (permanent, no spaces):',
      validate: (val) => {
        if (!val.trim()) return 'Required';
        if (!/^[a-z0-9][a-z0-9-]*$/.test(val.trim())) return 'Use lowercase letters, numbers, and hyphens only';
        return true;
      },
      transformer: (val) => val.toLowerCase().replace(/\s+/g, '-'),
    });

    const title = await input({
      message: 'Book title:',
      validate: (val) => val.trim() ? true : 'Required',
    });

    const type = await select<BookType>({
      message: 'Type of book:',
      choices: BOOK_TYPES.map(t => ({ name: t.label, value: t.value })),
    });

    const genre = await select({
      message: 'Genre:',
      choices: [
        { name: 'Fantasy', value: 'fantasy' },
        { name: 'Science Fiction', value: 'sci-fi' },
        { name: 'Mystery / Thriller', value: 'mystery' },
        { name: 'Romance', value: 'romance' },
        { name: 'Horror', value: 'horror' },
        { name: 'Literary Fiction', value: 'literary fiction' },
        { name: 'Historical Fiction', value: 'historical fiction' },
        { name: 'Adventure', value: 'adventure' },
        { name: 'Crime', value: 'crime' },
        { name: 'Comedy / Satire', value: 'comedy' },
        { name: 'Drama', value: 'drama' },
        { name: 'Non-Fiction', value: 'non-fiction' },
        { name: 'Self-Help', value: 'self-help' },
        { name: 'Other (type your own)', value: '__other__' },
      ],
    });

    const finalGenre = genre === '__other__'
      ? await input({
          message: 'Genre (custom):',
          validate: (val) => val.trim() ? true : 'Required',
        })
      : genre;

    const subgenre = await input({
      message: 'Sub-genre (e.g., dark fantasy, cyberpunk, cozy mystery):',
      default: '',
    });

    const authorsRaw = await input({
      message: 'Author(s) (comma-separated):',
      default: 'Anonymous',
    });
    const authors = authorsRaw.split(',').map(a => a.trim()).filter(Boolean);

    const purpose = await input({
      message: 'Purpose (e.g., entertainment, education, personal memoir):',
      default: 'Entertainment',
    });

    info('Provide a short summary of the story — what is this book about?');
    const summary = await multilineInput('Story summary:');

    // ─── Create Project ─────────────────────────────────────

    const spinner = ora({ text: 'Creating project...', color: 'cyan' }).start();

    let book;
    try {
      book = await createBookProject(ctx.config, {
        projectName: projectName.trim().toLowerCase().replace(/\s+/g, '-'),
        title: title.trim(),
        type,
        genre: finalGenre.trim(),
        subgenre: subgenre.trim(),
        authors,
        purpose: purpose.trim(),
        summary: summary.trim(),
      });
      spinner.succeed('Project created');
    } catch (err: unknown) {
      spinner.fail(err instanceof Error ? err.message : String(err));
      return;
    }

    // ─── Initialize git if available ────────────────────────

    if (isGitAvailable() && ctx.config.git.enabled) {
      const bookDir = getBookDir(ctx.config, book.projectName);
      await gitInit(bookDir);
    }

    // ─── ROUND 1: Foundational questions ───────────────────

    spinner.start('Generating foundational questions...');

    let round1Questions: LoreQuestion[];
    try {
      const prompt = await buildLoreQuestionsRound1Prompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        purpose: book.purpose,
        summary: book.summary,
      });

      const response = await chatSmall(ctx.config, [
        { role: 'system', content: 'You are a book development assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ], { jsonMode: true, temperature: 0.8 });

      const parsed = parseLLMJson<{ questions: LoreQuestion[] }>(response, 'round 1 questions');
      round1Questions = parsed.questions;
      spinner.succeed(`Generated ${round1Questions.length} foundational questions`);
    } catch (err: unknown) {
      spinner.fail('Failed to generate questions: ' + (err instanceof Error ? err.message : String(err)));
      info('Continuing with default questions...');
      round1Questions = getDefaultQuestionsRound1(type);
    }

    blank();
    boxMessage(
      c.value('Round 1: Story Foundation\n') +
      c.muted('Let\'s establish the core of your book — story, characters, world.'),
      'Development Questions'
    );
    blank();

    const answers: Record<string, string> = {};

    for (const q of round1Questions) {
      try {
        let answer: string;
        if (q.type === 'multiline') {
          answer = await multilineInput(q.question);
        } else {
          answer = await input({
            message: q.question,
            validate: q.required ? (val) => val.trim() ? true : 'This question is required' : undefined,
          });
        }
        if (answer.trim()) {
          answers[q.key] = answer.trim();
        }
      } catch {
        // User cancelled, skip this question
      }
    }

    // ─── ROUND 2: Deeper follow-up questions ────────────────

    blank();
    divider();
    blank();

    spinner.start('Generating deeper follow-up questions based on your answers...');

    let round2Questions: LoreQuestion[];
    try {
      const prompt = await buildLoreQuestionsRound2Prompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        purpose: book.purpose,
        summary: book.summary,
        round1Answers: answers,
      });

      const response = await chatSmall(ctx.config, [
        { role: 'system', content: 'You are a book development assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ], { jsonMode: true, temperature: 0.8 });

      const parsed = parseLLMJson<{ questions: LoreQuestion[] }>(response, 'round 2 questions');
      round2Questions = parsed.questions;
      spinner.succeed(`Generated ${round2Questions.length} follow-up questions`);
    } catch (err: unknown) {
      spinner.warn('Could not generate follow-up questions: ' + (err instanceof Error ? err.message : String(err)));
      round2Questions = getDefaultQuestionsRound2(type);
    }

    blank();
    boxMessage(
      c.value('Round 2: Refining the Details\n') +
      c.muted('Now let\'s dig deeper — genre identity, tone, themes, and audience.'),
      'Development Questions'
    );
    blank();

    for (const q of round2Questions) {
      try {
        let answer: string;
        if (q.type === 'multiline') {
          answer = await multilineInput(q.question);
        } else {
          answer = await input({
            message: q.question,
            validate: q.required ? (val) => val.trim() ? true : 'This question is required' : undefined,
          });
        }
        if (answer.trim()) {
          answers[q.key] = answer.trim();
        }
      } catch {
        // User cancelled, skip this question
      }
    }

    // ─── Generate lore files ────────────────────────────────

    spinner.start('Generating lore files (this may take a moment)...');
    await setBookStatus(book.id, 'initial-processing');

    try {
      const prompt = await buildLoreGenerationPrompt({
        title: book.title,
        type: book.type,
        genre: book.genre,
        subgenre: book.subgenre,
        authors: book.authors,
        purpose: book.purpose,
        summary: book.summary,
        answers,
      });

      const response = await chatWriter(ctx.config, [
        { role: 'system', content: 'You are an expert book development assistant. Always respond with valid JSON containing lore files.' },
        { role: 'user', content: prompt },
      ], { jsonMode: true, maxTokens: 8192, temperature: 0.7 });

      const parsed = parseLLMJson<{ files: Record<string, string> }>(response, 'lore generation');
      await writeLoreFiles(ctx.config, book.projectName, parsed.files);

      const fileCount = Object.keys(parsed.files).length;
      spinner.succeed(`Generated ${fileCount} lore files`);

      // Git commit
      if (isGitAvailable() && ctx.config.git.enabled && ctx.config.git.autoCommit) {
        const bookDir = getBookDir(ctx.config, book.projectName);
        await gitCommit(bookDir, `Initial lore generation for "${book.title}"`);
      }

      await setBookStatus(book.id, 'work-in-progress');
    } catch (err: unknown) {
      spinner.fail('Failed to generate lore: ' + (err instanceof Error ? err.message : String(err)));
      error('You can try regenerating lore later with /edit-lore after selecting this book.');
      await setBookStatus(book.id, 'new');
    }

    // ─── Done ───────────────────────────────────────────────

    blank();
    success(`Book "${book.title}" created as project: ${c.highlight(book.projectName)}`);
    info(`Use ${c.primary('/select ' + book.projectName)} to start working on it.`);
    blank();
  },
};

function getDefaultQuestionsRound1(type: BookType): LoreQuestion[] {
  const questions: LoreQuestion[] = [
    { key: 'story_goal', question: 'What is the main goal or premise of this story?', type: 'text', required: true },
    { key: 'protagonist', question: 'Who is the main character or subject?', type: 'text', required: true },
    { key: 'setting', question: 'Describe the world/setting:', type: 'text', required: true },
    { key: 'conflict', question: 'What is the central conflict or problem?', type: 'text', required: true },
  ];

  if (['novel', 'prose', 'screenplay'].includes(type)) {
    questions.push({ key: 'time_period', question: 'What time period?', type: 'text', required: false });
  }

  return questions;
}

function getDefaultQuestionsRound2(type: BookType): LoreQuestion[] {
  return [
    { key: 'tone', question: 'What tone or mood are you aiming for?', type: 'text', required: true },
    { key: 'themes', question: 'What major themes should the book explore?', type: 'text', required: false },
    { key: 'audience', question: 'Who is the target audience?', type: 'text', required: false },
    { key: 'additional', question: 'Any additional details or things the AI should know?', type: 'text', required: false },
  ];
}
