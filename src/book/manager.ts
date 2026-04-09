import { join } from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import type { BookRecord, BookType, BookStatus, InkaiConfig } from '../types.js';
import { addBook, getBookByName, updateBook } from '../db.js';

export function getBookDir(config: InkaiConfig, projectName: string): string {
  return join(config.booksDir, projectName);
}

export function getLoreDir(config: InkaiConfig, projectName: string): string {
  return join(getBookDir(config, projectName), 'lore');
}

export function getChaptersDir(config: InkaiConfig, projectName: string): string {
  return join(getBookDir(config, projectName), 'chapters');
}

export function getChapterPlansDir(config: InkaiConfig, projectName: string): string {
  return join(getBookDir(config, projectName), 'chapters-plan');
}

export function getLoreSummariesDir(config: InkaiConfig, projectName: string): string {
  return join(getLoreDir(config, projectName), '.summaries');
}

export async function createBookProject(
  config: InkaiConfig,
  info: {
    projectName: string;
    title: string;
    type: BookType;
    genre: string;
    subgenre: string;
    authors: string[];
    purpose: string;
  }
): Promise<BookRecord> {
  const existing = await getBookByName(info.projectName);
  if (existing) {
    throw new Error(`A book project named "${info.projectName}" already exists.`);
  }

  const bookDir = getBookDir(config, info.projectName);
  const loreDir = getLoreDir(config, info.projectName);
  const chaptersDir = getChaptersDir(config, info.projectName);
  const plansDir = getChapterPlansDir(config, info.projectName);

  await mkdir(bookDir, { recursive: true });
  await mkdir(loreDir, { recursive: true });
  await mkdir(chaptersDir, { recursive: true });
  await mkdir(plansDir, { recursive: true });

  const record: BookRecord = {
    id: nanoid(),
    projectName: info.projectName,
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    authors: info.authors,
    purpose: info.purpose,
    status: 'new',
    chapterCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await addBook(record);
  return record;
}

export async function writeLoreFiles(
  config: InkaiConfig,
  projectName: string,
  files: Record<string, string>
): Promise<void> {
  const loreDir = getLoreDir(config, projectName);
  await mkdir(loreDir, { recursive: true });

  for (const [filename, content] of Object.entries(files)) {
    await writeFile(join(loreDir, filename), content, 'utf-8');
  }
}

export async function readLoreFiles(
  config: InkaiConfig,
  projectName: string
): Promise<Record<string, string>> {
  const loreDir = getLoreDir(config, projectName);
  if (!existsSync(loreDir)) return {};

  const files = await readdir(loreDir);
  const result: Record<string, string> = {};

  for (const file of files) {
    if (file.endsWith('.md')) {
      result[file] = await readFile(join(loreDir, file), 'utf-8');
    }
  }

  return result;
}

export async function readLoreContext(config: InkaiConfig, projectName: string): Promise<string> {
  const files = await readLoreFiles(config, projectName);
  return Object.entries(files)
    .filter(([name]) => name !== 'summary-of-chapters.md')
    .map(([name, content]) => `=== ${name} ===\n${content}`)
    .join('\n\n');
}

// ─── Lore Summaries ───────────────────────────────────────────

export function hashLoreContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

export async function readLoreSummary(
  config: InkaiConfig,
  projectName: string,
  filename: string
): Promise<{ hash: string; summary: string } | null> {
  const summariesDir = getLoreSummariesDir(config, projectName);
  const filePath = join(summariesDir, filename);
  if (!existsSync(filePath)) return null;

  const content = await readFile(filePath, 'utf-8');
  const hashMatch = content.match(/^<!-- hash:(\w+) -->\n/);
  if (!hashMatch) return null;

  return {
    hash: hashMatch[1],
    summary: content.slice(hashMatch[0].length),
  };
}

export async function writeLoreSummary(
  config: InkaiConfig,
  projectName: string,
  filename: string,
  summary: string,
  contentHash: string
): Promise<void> {
  const summariesDir = getLoreSummariesDir(config, projectName);
  await mkdir(summariesDir, { recursive: true });
  const content = `<!-- hash:${contentHash} -->\n${summary}`;
  await writeFile(join(summariesDir, filename), content, 'utf-8');
}

export async function readAllLoreSummaries(
  config: InkaiConfig,
  projectName: string
): Promise<Record<string, string>> {
  const summariesDir = getLoreSummariesDir(config, projectName);
  if (!existsSync(summariesDir)) return {};

  const files = await readdir(summariesDir);
  const result: Record<string, string> = {};

  for (const file of files) {
    if (file.endsWith('.md')) {
      const data = await readLoreSummary(config, projectName, file);
      if (data) result[file] = data.summary;
    }
  }

  return result;
}

export async function getStaleLoreFiles(
  config: InkaiConfig,
  projectName: string
): Promise<string[]> {
  const loreFiles = await readLoreFiles(config, projectName);
  const stale: string[] = [];

  for (const [filename, content] of Object.entries(loreFiles)) {
    if (filename === 'summary-of-chapters.md') continue;

    const currentHash = hashLoreContent(content);
    const summary = await readLoreSummary(config, projectName, filename);

    if (!summary || summary.hash !== currentHash) {
      stale.push(filename);
    }
  }

  return stale;
}

export async function readLoreSummaryContext(
  config: InkaiConfig,
  projectName: string
): Promise<string> {
  const summaries = await readAllLoreSummaries(config, projectName);
  return Object.entries(summaries)
    .map(([name, summary]) => `=== ${name} ===\n${summary}`)
    .join('\n\n');
}

export async function readStyleGuide(config: InkaiConfig, projectName: string): Promise<string> {
  const loreDir = getLoreDir(config, projectName);
  const stylePath = join(loreDir, 'style-of-writing.md');
  if (existsSync(stylePath)) {
    return await readFile(stylePath, 'utf-8');
  }
  return 'No style guide defined yet.';
}

export async function readChapterSummary(config: InkaiConfig, projectName: string): Promise<string> {
  const loreDir = getLoreDir(config, projectName);
  const summaryPath = join(loreDir, 'summary-of-chapters.md');
  if (existsSync(summaryPath)) {
    return await readFile(summaryPath, 'utf-8');
  }
  return 'No chapters written yet.';
}

export async function setBookStatus(bookId: string, status: BookStatus): Promise<void> {
  await updateBook(bookId, { status });
}

export async function writeChapter(
  config: InkaiConfig,
  projectName: string,
  chapterNumber: number,
  content: string
): Promise<string> {
  const chapDir = getChaptersDir(config, projectName);
  await mkdir(chapDir, { recursive: true });
  const filename = `chapter-${String(chapterNumber).padStart(2, '0')}.md`;
  const filePath = join(chapDir, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

export async function readChapter(
  config: InkaiConfig,
  projectName: string,
  chapterNumber: number
): Promise<string | null> {
  const chapDir = getChaptersDir(config, projectName);
  const filename = `chapter-${String(chapterNumber).padStart(2, '0')}.md`;
  const filePath = join(chapDir, filename);
  if (!existsSync(filePath)) return null;
  return await readFile(filePath, 'utf-8');
}

export async function writeReview(
  config: InkaiConfig,
  projectName: string,
  chapterNumber: number,
  content: string
): Promise<string> {
  const chapDir = getChaptersDir(config, projectName);
  const filename = `review_chapter_${String(chapterNumber).padStart(2, '0')}.md`;
  const filePath = join(chapDir, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

export async function readReview(
  config: InkaiConfig,
  projectName: string,
  chapterNumber: number
): Promise<string | null> {
  const chapDir = getChaptersDir(config, projectName);
  const filename = `review_chapter_${String(chapterNumber).padStart(2, '0')}.md`;
  const filePath = join(chapDir, filename);
  if (!existsSync(filePath)) return null;
  return await readFile(filePath, 'utf-8');
}

export async function updateChapterSummary(
  config: InkaiConfig,
  projectName: string,
  content: string
): Promise<void> {
  const loreDir = getLoreDir(config, projectName);
  await writeFile(join(loreDir, 'summary-of-chapters.md'), content, 'utf-8');
}

// ─── Chapter Plans ────────────────────────────────────────────

export async function writeChapterPlan(
  config: InkaiConfig,
  projectName: string,
  chapterNumber: number,
  content: string
): Promise<string> {
  const plansDir = getChapterPlansDir(config, projectName);
  await mkdir(plansDir, { recursive: true });
  const filename = `plan-chapter-${String(chapterNumber).padStart(2, '0')}.md`;
  const filePath = join(plansDir, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

export async function readChapterPlan(
  config: InkaiConfig,
  projectName: string,
  chapterNumber: number
): Promise<string | null> {
  const plansDir = getChapterPlansDir(config, projectName);
  const filename = `plan-chapter-${String(chapterNumber).padStart(2, '0')}.md`;
  const filePath = join(plansDir, filename);
  if (!existsSync(filePath)) return null;
  return await readFile(filePath, 'utf-8');
}

// ─── Writing Instructions ─────────────────────────────────────

export async function writeWritingInstructions(
  config: InkaiConfig,
  projectName: string,
  content: string
): Promise<void> {
  const bookDir = getBookDir(config, projectName);
  await writeFile(join(bookDir, 'writing-instructions.md'), content, 'utf-8');
}

export async function readWritingInstructions(
  config: InkaiConfig,
  projectName: string
): Promise<string | null> {
  const bookDir = getBookDir(config, projectName);
  const filePath = join(bookDir, 'writing-instructions.md');
  if (!existsSync(filePath)) return null;
  return await readFile(filePath, 'utf-8');
}
