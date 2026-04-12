import type { BookType, ReviewType, ReviewPersona } from '../types.js';
import { loadTemplate } from './loader.js';

// ─── Helpers ─────────────────────────────────────────────────

function formatAnswers(answers: Record<string, string>): string {
  return Object.entries(answers)
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');
}

function formatLoreFiles(loreFiles: Record<string, string>, truncate?: number): string {
  return Object.entries(loreFiles)
    .map(([name, content]) => `=== ${name} ===\n${truncate ? content.slice(0, truncate) + '...' : content}`)
    .join('\n\n');
}

function getOptionalFilesDescription(type: BookType): string {
  const files: string[] = [];

  if (['novel', 'prose', 'screenplay'].includes(type)) {
    files.push('- "characters.md": Detailed character profiles, motivations, arcs, relationships.');
    files.push('- "timeline.md": Chronological timeline of events (past and planned).');
  }

  if (['novel', 'prose'].includes(type)) {
    files.push('- "magic-system.md": If fantasy/sci-fi — rules of magic, powers, or special systems.');
    files.push('- "technology-tree.md": If sci-fi/tech — technology levels, inventions, constraints.');
  }

  if (type === 'biography') {
    files.push('- "timeline.md": Chronological events in the subject\'s life.');
    files.push('- "characters.md": Key people in the subject\'s life.');
  }

  files.push('- "notes.md": Miscellaneous notes, ideas, and reminders.');

  return files.join('\n');
}

// ─── Lore Questions — Round 1 ────────────────────────────────

export async function buildLoreQuestionsRound1Prompt(info: {
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  purpose: string;
  summary: string;
}): Promise<string> {
  return loadTemplate('lore-questions-round1', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    purpose: info.purpose,
    summary: info.summary,
  });
}

// ─── Lore Questions — Round 2 ────────────────────────────────

export async function buildLoreQuestionsRound2Prompt(info: {
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  purpose: string;
  summary: string;
  round1Answers: Record<string, string>;
}): Promise<string> {
  return loadTemplate('lore-questions-round2', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    purpose: info.purpose,
    summary: info.summary,
    answersText: formatAnswers(info.round1Answers),
  });
}

// ─── Lore Generation ─────────────────────────────────────────

export async function buildLoreGenerationPrompt(info: {
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  authors: string[];
  purpose: string;
  summary: string;
  answers: Record<string, string>;
}): Promise<string> {
  return loadTemplate('lore-generation', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    authors: info.authors.join(', '),
    purpose: info.purpose,
    summary: info.summary,
    answersText: formatAnswers(info.answers),
    optionalFilesDescription: getOptionalFilesDescription(info.type),
  });
}

// ─── Chapter Suggestion ──────────────────────────────────────

export async function buildChapterSuggestionPrompt(
  loreContext: string,
  summaryContext: string,
  chapterNumber: number,
): Promise<string> {
  return loadTemplate('chapter-suggestion', {
    loreContext,
    summaryContext,
    chapterNumber: String(chapterNumber),
  });
}

// ─── Chapter Plan ────────────────────────────────────────────

export async function buildChapterPlanPrompt(
  loreContext: string,
  styleContext: string,
  summaryContext: string,
  previousChapter: string | null,
  chapterNumber: number,
  guidelines: string,
  writingInstructions: string | null,
): Promise<string> {
  return loadTemplate('chapter-plan', {
    loreContext,
    styleContext,
    summaryContext,
    previousChapter: previousChapter ?? '',
    previousChapterNumber: String(chapterNumber - 1),
    chapterNumber: String(chapterNumber),
    guidelines,
    writingInstructions: writingInstructions ?? '',
  });
}

// ─── Chapter Writing From Plan ───────────────────────────────

export async function buildChapterWritingFromPlanPrompt(
  loreContext: string,
  styleContext: string,
  chapterPlan: string,
  chapterNumber: number,
  writingInstructions: string | null,
): Promise<string> {
  return loadTemplate('chapter-writing-from-plan', {
    loreContext,
    styleContext,
    chapterPlan,
    chapterNumber: String(chapterNumber),
    writingInstructions: writingInstructions ?? '',
  });
}

// ─── Chapter QA ──────────────────────────────────────────────

export async function buildChapterQAPrompt(
  loreContext: string,
  styleContext: string,
  chapterPlan: string,
  chapterContent: string,
  chapterNumber: number,
): Promise<string> {
  return loadTemplate('chapter-qa', {
    loreContext,
    styleContext,
    chapterPlan,
    chapterContent,
    chapterNumber: String(chapterNumber),
  });
}

// ─── Chapter Writing (legacy) ────────────────────────────────

export async function buildChapterWritingPrompt(
  loreContext: string,
  styleContext: string,
  summaryContext: string,
  chapterNumber: number,
  direction: string,
): Promise<string> {
  return loadTemplate('chapter-writing', {
    loreContext,
    styleContext,
    summaryContext,
    chapterNumber: String(chapterNumber),
    direction,
  });
}

// ─── Chapter Review ──────────────────────────────────────────

export async function buildChapterReviewPrompt(
  loreContext: string,
  styleContext: string,
  chapterContent: string,
  chapterNumber: number,
  reviewType: ReviewType = 'full',
  reviewPersona?: ReviewPersona,
): Promise<{ system: string; user: string }> {
  const templateName = `review-type-${reviewType}`;
  const user = await loadTemplate(templateName, {
    loreContext,
    styleContext,
    chapterContent,
    chapterNumber: String(chapterNumber),
  });

  let system = 'You are an expert literary editor. Provide thorough, constructive feedback in markdown.';
  if (reviewPersona) {
    const personaText = await loadTemplate(`review-persona-${reviewPersona}`, {});
    if (personaText.trim()) system = personaText.trim();
  }

  return { system, user };
}

// ─── Chapter Rewrite ─────────────────────────────────────────

export async function buildChapterRewritePrompt(
  loreContext: string,
  styleContext: string,
  originalChapter: string,
  reviewContent: string,
  chapterNumber: number,
): Promise<string> {
  return loadTemplate('chapter-rewrite', {
    loreContext,
    styleContext,
    originalChapter,
    reviewContent,
    chapterNumber: String(chapterNumber),
  });
}

// ─── Summary Update ──────────────────────────────────────────

export async function buildSummaryUpdatePrompt(
  existingSummary: string,
  newChapterContent: string,
  chapterNumber: number,
): Promise<string> {
  return loadTemplate('summary-update', {
    existingSummary,
    newChapterContent,
    chapterNumber: String(chapterNumber),
  });
}

// ─── Lore Summary ────────────────────────────────────────────

export async function buildLoreSummaryPrompt(loreFiles: Record<string, string>): Promise<string> {
  return loadTemplate('lore-summary', {
    loreText: formatLoreFiles(loreFiles),
  });
}

// ─── Lore Edit ───────────────────────────────────────────────

export async function buildLoreEditPrompt(loreFiles: Record<string, string>, authorRequest: string): Promise<string> {
  return loadTemplate('lore-edit', {
    loreText: formatLoreFiles(loreFiles),
    authorRequest,
  });
}

// ─── Book Summary ────────────────────────────────────────────

export async function buildBookSummaryPrompt(loreFiles: Record<string, string>, chapterCount: number): Promise<string> {
  return loadTemplate('book-summary', {
    loreText: formatLoreFiles(loreFiles, 500),
    chapterCount: String(chapterCount),
  });
}

// ─── Enhance Lore — Questions ────────────────────────────────

export async function buildEnhanceLoreQuestionsPrompt(info: {
  title: string;
  type: string;
  genre: string;
  subgenre: string;
  loreFiles: Record<string, string>;
}): Promise<string> {
  return loadTemplate('enhance-lore-questions', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    loreText: formatLoreFiles(info.loreFiles),
  });
}

// ─── Enhance Lore — Apply ────────────────────────────────────

export async function buildEnhanceLoreApplyPrompt(info: {
  title: string;
  type: string;
  genre: string;
  subgenre: string;
  loreFiles: Record<string, string>;
  answers: Record<string, string>;
}): Promise<string> {
  return loadTemplate('enhance-lore-apply', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    loreText: formatLoreFiles(info.loreFiles),
    answersText: formatAnswers(info.answers),
  });
}

// ─── Lore File Summary ──────────────────────────────────────

export async function buildLoreFileSummaryPrompt(
  filename: string,
  content: string,
): Promise<string> {
  return loadTemplate('lore-file-summary', { filename, content });
}

// ─── Lore Relevance Selection ────────────────────────────────

export async function buildLoreRelevancePrompt(
  loreSummaryContext: string,
  fileNames: string[],
  taskDescription: string,
): Promise<string> {
  return loadTemplate('lore-relevance', {
    loreSummaryContext,
    fileList: fileNames.join('\n'),
    taskDescription,
  });
}

// ─── Chapter Lore Extraction ─────────────────────────────────

export async function buildChapterLoreExtractionPrompt(
  chapterContent: string,
  chapterNumber: number,
  existingNotes: string,
): Promise<string> {
  return loadTemplate('chapter-lore-extraction', {
    chapterContent,
    chapterNumber: String(chapterNumber),
    existingNotes: existingNotes || '(no existing notes)',
  });
}

// ─── Story Arc Generation ────────────────────────────────────

export async function buildStoryArcGeneratePrompt(info: {
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  purpose: string;
  summary: string;
  loreContext: string;
  chapterSummary: string;
  authorGuidance: string;
}): Promise<string> {
  return loadTemplate('story-arc-generate', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    purpose: info.purpose,
    summary: info.summary || '',
    loreContext: info.loreContext,
    chapterSummary: info.chapterSummary || 'No chapters written yet.',
    authorGuidance: info.authorGuidance || 'None — generate based on existing lore and story information.',
  });
}

// ─── Characters Generation ─────────────────────────────────

export async function buildCharactersGeneratePrompt(info: {
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  loreContext: string;
  chapterSummary: string;
  notesContext: string;
  authorGuidance?: string;
}): Promise<string> {
  return loadTemplate('characters-generate', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    loreContext: info.loreContext,
    chapterSummary: info.chapterSummary || 'No chapters written yet.',
    notesContext: info.notesContext || '(no notes)',
    authorGuidance: info.authorGuidance || '',
  });
}

// ─── Characters Edit ─────────────────────────────────────

export async function buildCharactersEditPrompt(info: {
  title: string;
  type: BookType;
  genre: string;
  currentCharacters: string;
  loreContext: string;
  authorChanges: string;
}): Promise<string> {
  return loadTemplate('characters-edit', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    currentCharacters: info.currentCharacters,
    loreContext: info.loreContext,
    authorChanges: info.authorChanges,
  });
}

// ─── Lore Review ────────────────────────────────────────

export async function buildLoreReviewPrompt(info: {
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  loreFiles: Record<string, string>;
  chapterSummary: string;
}): Promise<string> {
  return loadTemplate('lore-review', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    loreText: formatLoreFiles(info.loreFiles),
    chapterSummary: info.chapterSummary || 'No chapters written yet.',
  });
}

// ─── Lore Review Apply ──────────────────────────────────

export async function buildLoreReviewApplyPrompt(info: {
  title: string;
  filename: string;
  fileContent: string;
  changes: string[];
}): Promise<string> {
  return loadTemplate('lore-review-apply', {
    title: info.title,
    filename: info.filename,
    fileContent: info.fileContent,
    changes: info.changes.map((c, i) => `${i + 1}. ${c}`).join('\n'),
  });
}

// ─── Timeline Generation ──────────────────────────────────

export async function buildTimelineGeneratePrompt(info: {
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  loreFiles: Record<string, string>;
  chapterSummary: string;
  notesContext: string;
}): Promise<string> {
  return loadTemplate('timeline-generate', {
    title: info.title,
    type: info.type,
    genre: info.genre,
    subgenre: info.subgenre,
    loreText: formatLoreFiles(info.loreFiles),
    chapterSummary: info.chapterSummary || 'No chapters written yet.',
    notesContext: info.notesContext || '(no notes)',
  });
}
