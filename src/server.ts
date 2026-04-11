import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readFile, stat, open } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { nanoid } from 'nanoid';

import { initDB, getAllBooks, getBookById, updateBook, removeBook } from './db.js';
import { loadConfig, saveConfig } from './config.js';
import {
  createBookProject,
  readLoreFiles,
  writeLoreFiles,
  readChapter,
  writeChapter,
  readReview,
  writeReview,
  readStyleGuide,
  readChapterSummary,
  readWritingInstructions,
  writeWritingInstructions,
  writeChapterPlan,
  getChaptersDir,
  getChapterPlansDir,
  getBookDir,
  setBookStatus,
  readLoreContext,
  readLoreNotes,
  deleteChapter,
} from './book/manager.js';
import {
  listJobs,
  loadJob,
  deleteJob,
  jobLogPath,
  isJobProcessAlive,
  saveJob,
  type ChapterJob,
} from './jobs.js';
import { chatSmall, chatMedium, chatWriter } from './llm/manager.js';
import {
  buildLoreQuestionsRound1Prompt,
  buildLoreQuestionsRound2Prompt,
  buildLoreGenerationPrompt,
  buildChapterSuggestionPrompt,
  buildChapterPlanPrompt,
  buildChapterReviewPrompt,
  buildChapterRewritePrompt,
  buildEnhanceLoreQuestionsPrompt,
  buildEnhanceLoreApplyPrompt,
  buildStoryArcGeneratePrompt,
  buildTimelineGeneratePrompt,
  buildCharactersGeneratePrompt,
} from './prompts/templates.js';
import { parseLLMJson } from './llm/parse.js';
import { selectRelevantLore } from './lore.js';
import { gitCommit, gitInit, isGitAvailable } from './git.js';
import { generateEpub, generateOdt } from './commands/export.js';
import type { InkaiConfig, BookType, LoreQuestion, BookRecord } from './types.js';

const PORT = parseInt(process.env.INKAI_PORT ?? '4242', 10);

// ─── Default questions (fallback when LLM fails) ──────────────────────────────

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

function getDefaultQuestionsRound2(_type: BookType): LoreQuestion[] {
  return [
    { key: 'tone', question: 'What tone or mood are you aiming for?', type: 'text', required: true },
    { key: 'themes', question: 'What major themes should the book explore?', type: 'text', required: false },
    { key: 'audience', question: 'Who is the target audience?', type: 'text', required: false },
    { key: 'additional', question: 'Any additional details the AI should know?', type: 'text', required: false },
  ];
}

// ─── SSE helper ───────────────────────────────────────────────────────────────

function startSSE(res: express.Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  return {
    send(event: string, data: unknown) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    done() {
      res.end();
    },
  };
}

// ─── Book lookup helper ───────────────────────────────────────────────────────

async function requireBook(id: string, res: express.Response): Promise<BookRecord | null> {
  const book = await getBookById(id);
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return null;
  }
  return book;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function startServer(webDistPath?: string): Promise<void> {
  await initDB();

  const app = express();
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '10mb' }));

  // Serve built frontend if it exists
  if (webDistPath && existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/health', (_req, res) => res.json({ ok: true, version: '0.4.0' }));

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKS — list & detail
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/books', async (_req, res) => {
    try {
      res.json(await getAllBooks());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/books/:id', async (req, res) => {
    try {
      const book = await requireBook(req.params.id, res);
      if (book) res.json(book);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.patch('/api/books/:id', async (req, res) => {
    try {
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const { title, type, genre, subgenre, authors, purpose, summary, status } = req.body;
      const updates: Record<string, unknown> = {};
      if (title     !== undefined) updates.title     = title;
      if (type      !== undefined) updates.type      = type;
      if (genre     !== undefined) updates.genre     = genre;
      if (subgenre  !== undefined) updates.subgenre  = subgenre;
      if (authors   !== undefined) updates.authors   = authors;
      if (purpose   !== undefined) updates.purpose   = purpose;
      if (summary   !== undefined) updates.summary   = summary;
      if (status    !== undefined) updates.status    = status;
      await updateBook(book.id, updates);
      res.json(await getBookById(book.id));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/books/:id/archive', async (req, res) => {
    try {
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      await updateBook(book.id, { status: 'archived', archivedAt: new Date().toISOString() });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/books/:id/unarchive', async (req, res) => {
    try {
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      await updateBook(book.id, { status: 'work-in-progress', archivedAt: undefined });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKS — create wizard (3 steps + final SSE)
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 1: basic info → round 1 questions
  app.post('/api/books/wizard/start', async (req, res) => {
    try {
      const config = await loadConfig();
      const { title, type, genre, subgenre, purpose, summary } = req.body;
      let questions: LoreQuestion[];
      try {
        const prompt = await buildLoreQuestionsRound1Prompt({ title, type, genre, subgenre, purpose, summary });
        const raw = await chatSmall(config, [
          { role: 'system', content: 'You are a book development assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ], { jsonMode: true, temperature: 0.8 });
        questions = parseLLMJson<{ questions: LoreQuestion[] }>(raw, 'r1 questions').questions;
      } catch {
        questions = getDefaultQuestionsRound1(type as BookType);
      }
      res.json({ questions });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Step 2: round 1 answers → round 2 questions
  app.post('/api/books/wizard/round2', async (req, res) => {
    try {
      const config = await loadConfig();
      const { title, type, genre, subgenre, purpose, summary, round1Answers } = req.body;
      let questions: LoreQuestion[];
      try {
        const prompt = await buildLoreQuestionsRound2Prompt({ title, type, genre, subgenre, purpose, summary, round1Answers });
        const raw = await chatSmall(config, [
          { role: 'system', content: 'You are a book development assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ], { jsonMode: true, temperature: 0.8 });
        questions = parseLLMJson<{ questions: LoreQuestion[] }>(raw, 'r2 questions').questions;
      } catch {
        questions = getDefaultQuestionsRound2(type as BookType);
      }
      res.json({ questions });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Final: create book + generate lore (SSE stream)
  app.post('/api/books', async (req, res) => {
    const sse = startSSE(res);
    try {
      const config = await loadConfig();
      const { projectName, title, type, genre, subgenre, authors, purpose, summary, answers } = req.body;

      sse.send('progress', { message: 'Creating project...' });

      const book = await createBookProject(config, {
        projectName: (projectName as string).trim().toLowerCase().replace(/\s+/g, '-'),
        title: (title as string).trim(),
        type: type as BookType,
        genre: (genre as string).trim(),
        subgenre: (subgenre as string)?.trim() ?? '',
        authors: Array.isArray(authors) ? authors : [(authors as string)],
        purpose: (purpose as string).trim(),
        summary: (summary as string).trim(),
      });

      if (isGitAvailable() && config.git.enabled) {
        await gitInit(getBookDir(config, book.projectName));
      }

      sse.send('progress', { message: 'Generating lore files (this may take a moment)...' });
      await setBookStatus(book.id, 'initial-processing');

      try {
        const prompt = await buildLoreGenerationPrompt({
          title: book.title, type: book.type, genre: book.genre, subgenre: book.subgenre,
          authors: book.authors, purpose: book.purpose, summary: book.summary,
          answers: answers ?? {},
        });
        const raw = await chatWriter(config, [
          { role: 'system', content: 'You are an expert book development assistant. Always respond with valid JSON containing lore files.' },
          { role: 'user', content: prompt },
        ], { jsonMode: true, maxTokens: 8192, temperature: 0.7 });

        const { files } = parseLLMJson<{ files: Record<string, string> }>(raw, 'lore generation');
        await writeLoreFiles(config, book.projectName, files);
        sse.send('progress', { message: `Generated ${Object.keys(files).length} lore files.` });

        if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
          await gitCommit(getBookDir(config, book.projectName), `Initial lore for "${book.title}"`);
        }

        await setBookStatus(book.id, 'work-in-progress');
        sse.send('done', { book });
      } catch (err) {
        await setBookStatus(book.id, 'new');
        sse.send('error', { message: 'Lore generation failed: ' + String(err), book });
      }
    } catch (err) {
      sse.send('error', { message: String(err) });
    }
    sse.done();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTERS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/books/:id/chapters', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;

      const chapDir = getChaptersDir(config, book.projectName);
      const plansDir = getChapterPlansDir(config, book.projectName);
      const chapters = [];

      for (let i = 1; i <= book.chapterCount; i++) {
        const n = String(i).padStart(2, '0');
        const chapterFile = join(chapDir, `chapter-${n}.md`);
        const reviewFile = join(chapDir, `review_chapter_${n}.md`);
        const planFile = join(plansDir, `plan-chapter-${n}.md`);

        let wordCount = 0;
        const hasChapter = existsSync(chapterFile);
        if (hasChapter) {
          const content = await readFile(chapterFile, 'utf-8');
          wordCount = content.split(/\s+/).filter(Boolean).length;
        }

        chapters.push({
          number: i,
          hasChapter,
          hasReview: existsSync(reviewFile),
          hasPlan: existsSync(planFile),
          wordCount,
        });
      }

      res.json(chapters);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/books/:id/chapters/:n', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const n = parseInt(req.params.n, 10);
      const content = await readChapter(config, book.projectName, n);
      if (content === null) { res.status(404).json({ error: 'Chapter not found' }); return; }
      res.json({ number: n, content });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/books/:id/chapters/:n', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const n = parseInt(req.params.n, 10);
      const { content } = req.body;
      if (typeof content !== 'string') { res.status(400).json({ error: 'content required' }); return; }
      await writeChapter(config, book.projectName, n, content);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete('/api/books/:id/chapters/:n', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const n = parseInt(req.params.n, 10);
      if (isNaN(n) || n < 1 || n > book.chapterCount) {
        res.status(400).json({ error: 'Invalid chapter number' }); return;
      }
      await deleteChapter(config, book.id, book.projectName, n, book.chapterCount);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/books/:id/chapters/:n/review', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const n = parseInt(req.params.n, 10);
      const content = await readReview(config, book.projectName, n);
      if (content === null) { res.status(404).json({ error: 'No review found' }); return; }
      res.json({ number: n, content });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // AI suggestion for next chapter
  app.post('/api/books/:id/chapters/suggest', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const nextChapter = book.chapterCount + 1;
      const [loreContext, chapterSummary] = await Promise.all([
        selectRelevantLore(config, book.projectName, `Writing chapter ${nextChapter}`, {}),
        readChapterSummary(config, book.projectName),
      ]);
      const suggestion = await chatSmall(config, [
        { role: 'system', content: 'You are a book planning assistant. Be concise and creative.' },
        { role: 'user', content: await buildChapterSuggestionPrompt(loreContext, chapterSummary, nextChapter) },
      ], { maxTokens: 600 });
      res.json({ suggestion });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Create chapter → background job
  app.post('/api/books/:id/chapters', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const { guidelines, writingInstructions: customInstructions } = req.body;
      if (!guidelines?.trim()) { res.status(400).json({ error: 'guidelines required' }); return; }

      const nextChapter = book.chapterCount + 1;

      const [styleGuide, chapterSummary, existingInstructions] = await Promise.all([
        readStyleGuide(config, book.projectName),
        readChapterSummary(config, book.projectName),
        readWritingInstructions(config, book.projectName),
      ]);

      // Save custom writing instructions if provided
      if (customInstructions?.trim() && !existingInstructions) {
        await writeWritingInstructions(config, book.projectName, customInstructions.trim());
      }
      const finalInstructions = customInstructions?.trim() || existingInstructions;

      const loreContext = await selectRelevantLore(
        config, book.projectName,
        `Writing chapter ${nextChapter}. Summary so far:\n${chapterSummary}`,
        {},
      );

      // Build chapter plan synchronously first (medium LLM, fast enough)
      let chapterPlan: string;
      try {
        chapterPlan = await chatMedium(config, [
          { role: 'system', content: 'You are a senior book planner. Create detailed chapter plans in markdown. Output only the plan.' },
          { role: 'user', content: await buildChapterPlanPrompt(
            loreContext, styleGuide, chapterSummary, null,
            nextChapter, guidelines, finalInstructions,
          ) },
        ], { maxTokens: 4096, temperature: 0.6 });
        await writeChapterPlan(config, book.projectName, nextChapter, chapterPlan);
      } catch (err) {
        res.status(500).json({ error: 'Failed to create chapter plan: ' + String(err) });
        return;
      }

      // Spawn background worker
      const job: ChapterJob = {
        id: nanoid(10),
        status: 'pending',
        bookId: book.id,
        projectName: book.projectName,
        bookTitle: book.title,
        chapterNumber: nextChapter,
        configSnapshot: JSON.stringify(config),
        loreContext,
        fullLoreContext: await readLoreContext(config, book.projectName),
        styleGuide,
        chapterSummary,
        chapterPlan,
        writingInstructions: finalInstructions,
      };
      await saveJob(job);

      const workerPath = join(dirname(fileURLToPath(import.meta.url)), 'worker.js');
      const logFd = openSync(jobLogPath(job.id), 'a');
      const child = spawn(process.execPath, [workerPath, job.id], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
      });
      child.unref();

      res.json({ jobId: job.id, chapterNumber: nextChapter, plan: chapterPlan });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Review chapter (SSE)
  app.post('/api/books/:id/chapters/:n/review', async (req, res) => {
    const sse = startSSE(res);
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const n = parseInt(req.params.n, 10);

      const chapterContent = await readChapter(config, book.projectName, n);
      if (!chapterContent) { sse.send('error', { message: `Chapter ${n} not found` }); sse.done(); return; }

      sse.send('progress', { message: 'Loading context...' });
      const [loreContext, styleGuide] = await Promise.all([
        readLoreContext(config, book.projectName),
        readStyleGuide(config, book.projectName),
      ]);

      sse.send('progress', { message: `Reviewing chapter ${n} (writer LLM)...` });
      const review = await chatWriter(config, [
        { role: 'system', content: 'You are an expert literary editor. Provide thorough, constructive feedback in markdown.' },
        { role: 'user', content: await buildChapterReviewPrompt(loreContext, styleGuide, chapterContent, n) },
      ], { maxTokens: 4096, temperature: 0.5 });

      await writeReview(config, book.projectName, n, review);
      if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
        await gitCommit(getBookDir(config, book.projectName), `Review Chapter ${n}`);
      }
      sse.send('done', { review });
    } catch (err) {
      sse.send('error', { message: String(err) });
    }
    sse.done();
  });

  // Rewrite chapter (SSE)
  app.post('/api/books/:id/chapters/:n/rewrite', async (req, res) => {
    const sse = startSSE(res);
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const n = parseInt(req.params.n, 10);

      sse.send('progress', { message: 'Loading chapter and review...' });
      const original = await readChapter(config, book.projectName, n);
      if (!original) { sse.send('error', { message: `Chapter ${n} not found` }); sse.done(); return; }

      const [loreContext, styleGuide] = await Promise.all([
        readLoreContext(config, book.projectName),
        readStyleGuide(config, book.projectName),
      ]);

      let review = await readReview(config, book.projectName, n);
      if (!review) {
        sse.send('progress', { message: 'No review found — generating review first...' });
        review = await chatWriter(config, [
          { role: 'system', content: 'You are an expert literary editor. Provide thorough, constructive feedback in markdown.' },
          { role: 'user', content: await buildChapterReviewPrompt(loreContext, styleGuide, original, n) },
        ], { maxTokens: 4096, temperature: 0.5 });
        await writeReview(config, book.projectName, n, review);
      }

      sse.send('progress', { message: `Rewriting chapter ${n} (writer LLM)...` });
      const rewritten = await chatWriter(config, [
        { role: 'system', content: 'You are an expert fiction writer. Rewrite incorporating all review feedback. Output only chapter content in markdown.' },
        { role: 'user', content: await buildChapterRewritePrompt(loreContext, styleGuide, original, review, n) },
      ], { maxTokens: 8192, temperature: 0.7 });

      await writeChapter(config, book.projectName, n, rewritten);
      if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
        await gitCommit(getBookDir(config, book.projectName), `Rewrite Chapter ${n}`);
      }
      sse.send('done', { content: rewritten });
    } catch (err) {
      sse.send('error', { message: String(err) });
    }
    sse.done();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LORE
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/books/:id/lore', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      res.json(await readLoreFiles(config, book.projectName));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/books/:id/lore/:filename', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const { filename } = req.params;
      // Prevent path traversal
      if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('..')) {
        res.status(400).json({ error: 'Invalid filename' }); return;
      }
      const { content } = req.body;
      if (typeof content !== 'string') { res.status(400).json({ error: 'content required' }); return; }
      await writeLoreFiles(config, book.projectName, { [filename]: content });
      if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
        await gitCommit(getBookDir(config, book.projectName), `Edit lore: ${filename}`);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Enhance lore: get questions
  app.post('/api/books/:id/enhance-lore/questions', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const loreFiles = await readLoreFiles(config, book.projectName);
      const prompt = await buildEnhanceLoreQuestionsPrompt({
        title: book.title, type: book.type, genre: book.genre, subgenre: book.subgenre, loreFiles,
      });
      const raw = await chatMedium(config, [
        { role: 'system', content: 'You are an expert book development consultant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ], { jsonMode: true, temperature: 0.8 });
      const parsed = parseLLMJson<{ questions: Array<{ key: string; question: string; context: string; loreFile: string }> }>(raw, 'enhance questions');
      res.json({ questions: parsed.questions });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Enhance lore: apply answers (SSE)
  app.post('/api/books/:id/enhance-lore/apply', async (req, res) => {
    const sse = startSSE(res);
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const { answers } = req.body;
      sse.send('progress', { message: 'Reading lore files...' });
      const loreFiles = await readLoreFiles(config, book.projectName);
      sse.send('progress', { message: 'Applying enhancements (writer LLM)...' });
      const prompt = await buildEnhanceLoreApplyPrompt({
        title: book.title, type: book.type, genre: book.genre, subgenre: book.subgenre, loreFiles, answers,
      });
      const raw = await chatWriter(config, [
        { role: 'system', content: 'You are an expert book development assistant. Apply enhancements naturally. Return valid JSON.' },
        { role: 'user', content: prompt },
      ], { jsonMode: true, maxTokens: 8192, temperature: 0.5 });
      const parsed = parseLLMJson<{ files: Record<string, string>; changes?: string[] }>(raw, 'enhance apply');
      await writeLoreFiles(config, book.projectName, parsed.files);
      if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
        await gitCommit(getBookDir(config, book.projectName), `Enhance lore for "${book.title}"`);
      }
      sse.send('done', { modifiedFiles: Object.keys(parsed.files), changes: parsed.changes ?? [] });
    } catch (err) {
      sse.send('error', { message: String(err) });
    }
    sse.done();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITING INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/books/:id/writing-instructions', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const content = await readWritingInstructions(config, book.projectName);
      res.json({ content });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/books/:id/writing-instructions', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const { content } = req.body;
      if (typeof content !== 'string') { res.status(400).json({ error: 'content required' }); return; }
      await writeWritingInstructions(config, book.projectName, content);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/books/:id/export', async (req, res) => {
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const format = req.query.format === 'odt' ? 'odt' : 'epub';

      const chapters: string[] = [];
      for (let i = 1; i <= book.chapterCount; i++) {
        const content = await readChapter(config, book.projectName, i);
        if (content) chapters.push(content);
      }

      if (chapters.length === 0) {
        res.status(400).json({ error: 'No chapters to export' });
        return;
      }

      const buffer = format === 'epub'
        ? await generateEpub(book.title, book.authors, chapters)
        : await generateOdt(book.title, book.authors, chapters);

      const filename = `${book.projectName}.${format}`;
      const contentType = format === 'epub'
        ? 'application/epub+zip'
        : 'application/vnd.oasis.opendocument.text';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AI GENERATION: STORY ARC / TIMELINE / CHARACTERS
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/books/:id/story-arc', async (req, res) => {
    const sse = startSSE(res);
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      const { authorGuidance } = req.body;
      sse.send('progress', { message: 'Loading book context...' });
      const [loreContext, chapterSummary] = await Promise.all([
        readLoreContext(config, book.projectName),
        readChapterSummary(config, book.projectName),
      ]);
      sse.send('progress', { message: 'Generating story arc (writer LLM)...' });
      const content = await chatWriter(config, [
        { role: 'system', content: 'You are an expert story architect. Output only markdown.' },
        { role: 'user', content: await buildStoryArcGeneratePrompt({
          title: book.title, type: book.type, genre: book.genre, subgenre: book.subgenre,
          purpose: book.purpose, summary: book.summary, loreContext, chapterSummary,
          authorGuidance: authorGuidance || '',
        }) },
      ], { maxTokens: 8192, temperature: 0.6 });
      await writeLoreFiles(config, book.projectName, { 'story-arc.md': content });
      if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
        await gitCommit(getBookDir(config, book.projectName), `Generate story arc for "${book.title}"`);
      }
      await updateBook(book.id, { summaryFresh: false });
      sse.send('done', { content });
    } catch (err) {
      sse.send('error', { message: String(err) });
    }
    sse.done();
  });

  app.post('/api/books/:id/timeline', async (req, res) => {
    const sse = startSSE(res);
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      sse.send('progress', { message: 'Loading book context...' });
      const [loreFiles, chapterSummary, notesContext] = await Promise.all([
        readLoreFiles(config, book.projectName),
        readChapterSummary(config, book.projectName),
        readLoreNotes(config, book.projectName),
      ]);
      sse.send('progress', { message: 'Building timeline (writer LLM)...' });
      const content = await chatWriter(config, [
        { role: 'system', content: 'You are an expert story chronologist. Build a precise timeline and flag sequencing issues. Output only markdown.' },
        { role: 'user', content: await buildTimelineGeneratePrompt({
          title: book.title, type: book.type, genre: book.genre, subgenre: book.subgenre,
          loreFiles, chapterSummary, notesContext,
        }) },
      ], { maxTokens: 8192, temperature: 0.4 });
      await writeLoreFiles(config, book.projectName, { 'timeline.md': content });
      if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
        await gitCommit(getBookDir(config, book.projectName), `Generate timeline for "${book.title}"`);
      }
      await updateBook(book.id, { summaryFresh: false });
      sse.send('done', { content });
    } catch (err) {
      sse.send('error', { message: String(err) });
    }
    sse.done();
  });

  app.post('/api/books/:id/characters', async (req, res) => {
    const sse = startSSE(res);
    try {
      const config = await loadConfig();
      const book = await requireBook(req.params.id, res);
      if (!book) return;
      sse.send('progress', { message: 'Loading book context...' });
      const [loreContext, chapterSummary, notesContext] = await Promise.all([
        readLoreContext(config, book.projectName),
        readChapterSummary(config, book.projectName),
        readLoreNotes(config, book.projectName),
      ]);
      sse.send('progress', { message: 'Generating character sheets (writer LLM)...' });
      const content = await chatWriter(config, [
        { role: 'system', content: 'You are an expert character developer. Create detailed character sheets with arc state and tensions. Output only markdown.' },
        { role: 'user', content: await buildCharactersGeneratePrompt({
          title: book.title, type: book.type, genre: book.genre, subgenre: book.subgenre,
          loreContext, chapterSummary, notesContext,
        }) },
      ], { maxTokens: 8192, temperature: 0.5 });
      await writeLoreFiles(config, book.projectName, { 'characters.md': content });
      if (isGitAvailable() && config.git.enabled && config.git.autoCommit) {
        await gitCommit(getBookDir(config, book.projectName), `Generate characters for "${book.title}"`);
      }
      await updateBook(book.id, { summaryFresh: false });
      sse.send('done', { content });
    } catch (err) {
      sse.send('error', { message: String(err) });
    }
    sse.done();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JOBS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/jobs', async (_req, res) => {
    try {
      const jobs = await listJobs();
      res.json(jobs.map(j => ({ ...j, processAlive: isJobProcessAlive(j.pid) })));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const job = await loadJob(req.params.id);
      if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
      res.json({ ...job, processAlive: isJobProcessAlive(job.pid) });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Stream job log via SSE
  app.get('/api/jobs/:id/log', async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const logFile = jobLogPath(req.params.id);
    let lastSize = 0;

    // Send existing log first
    if (existsSync(logFile)) {
      const existing = await readFile(logFile, 'utf-8');
      if (existing) {
        res.write(`event: log\ndata: ${JSON.stringify({ text: existing })}\n\n`);
        lastSize = Buffer.byteLength(existing, 'utf-8');
      }
    }

    const poll = setInterval(async () => {
      try {
        const job = await loadJob(req.params.id);
        if (!job) {
          clearInterval(poll);
          res.write(`event: done\ndata: ${JSON.stringify({ status: 'not-found' })}\n\n`);
          res.end();
          return;
        }

        if (existsSync(logFile)) {
          const fileStat = await stat(logFile);
          if (fileStat.size > lastSize) {
            const fd = await open(logFile, 'r');
            const buf = Buffer.alloc(fileStat.size - lastSize);
            await fd.read(buf, 0, buf.length, lastSize);
            await fd.close();
            lastSize = fileStat.size;
            res.write(`event: log\ndata: ${JSON.stringify({ text: buf.toString('utf-8') })}\n\n`);
          }
        }

        if (job.status === 'done' || job.status === 'failed') {
          clearInterval(poll);
          res.write(`event: done\ndata: ${JSON.stringify({ status: job.status })}\n\n`);
          res.end();
        }
      } catch {
        // ignore transient errors
      }
    }, 1000);

    req.on('close', () => clearInterval(poll));
  });

  app.delete('/api/jobs/:id', async (req, res) => {
    try {
      await deleteJob(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/config', async (_req, res) => {
    try {
      const config = await loadConfig();
      // Mask API keys before sending
      const safe = JSON.parse(JSON.stringify(config)) as InkaiConfig;
      for (const prov of Object.keys(safe.providers)) {
        const p = safe.providers[prov as keyof typeof safe.providers];
        if (p?.apiKey) p.apiKey = '***';
      }
      res.json(safe);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/config', async (req, res) => {
    try {
      const current = await loadConfig();
      const updates = req.body as Partial<InkaiConfig>;
      const merged: InkaiConfig = {
        ...current,
        ...updates,
        providers: { ...current.providers },
        tiers: { ...current.tiers, ...(updates.tiers ?? {}) },
        git: { ...current.git, ...(updates.git ?? {}) },
      };
      // Only overwrite API keys if a real value was sent (not '***')
      if (updates.providers) {
        for (const [name, conf] of Object.entries(updates.providers)) {
          if (conf?.apiKey && conf.apiKey !== '***') {
            (merged.providers as Record<string, { apiKey: string }>)[name] = { apiKey: conf.apiKey };
          }
        }
      }
      await saveConfig(merged);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ─── SPA fallback ─────────────────────────────────────────────────────────

  if (webDistPath && existsSync(webDistPath)) {
    app.get('/{*path}', (_req, res) => {
      res.sendFile(join(webDistPath, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  inkai web server  →  http://localhost:${PORT}\n`);
  });
}
