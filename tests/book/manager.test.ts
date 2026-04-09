import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import type { InkaiConfig } from '../../src/types.js';

// Import the pure path helpers and file I/O functions.
// We use a temp directory as booksDir to avoid touching real data.
import {
  getBookDir,
  getLoreDir,
  getChaptersDir,
  getChapterPlansDir,
  getLoreSummariesDir,
  writeLoreFiles,
  readLoreFiles,
  readLoreContext,
  readStyleGuide,
  readChapterSummary,
  writeChapter,
  readChapter,
  writeChapterPlan,
  readChapterPlan,
  writeReview,
  readReview,
  updateChapterSummary,
  writeWritingInstructions,
  readWritingInstructions,
  hashLoreContent,
  writeLoreSummary,
  readLoreSummary,
  readAllLoreSummaries,
  getStaleLoreFiles,
  readLoreSummaryContext,
} from '../../src/book/manager.js';

function makeConfig(booksDir: string): InkaiConfig {
  return {
    providers: {},
    tiers: {
      small: { provider: 'openai', model: 'gpt-4o-mini' },
      medium: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      writer: { provider: 'anthropic', model: 'claude-opus-4-20250514' },
    },
    booksDir,
    git: { enabled: false, autoCommit: false },
    backgroundWriting: false,
  };
}

let tempDir: string;
let config: InkaiConfig;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'inkai-test-'));
  config = makeConfig(tempDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ─── Path helpers ──────────────────────────────────────────────

describe('path helpers', () => {
  it('getBookDir returns booksDir/projectName', () => {
    expect(getBookDir(config, 'my-book')).toBe(join(tempDir, 'my-book'));
  });

  it('getLoreDir nests under book dir', () => {
    expect(getLoreDir(config, 'my-book')).toBe(join(tempDir, 'my-book', 'lore'));
  });

  it('getChaptersDir nests under book dir', () => {
    expect(getChaptersDir(config, 'my-book')).toBe(join(tempDir, 'my-book', 'chapters'));
  });

  it('getChapterPlansDir nests under book dir', () => {
    expect(getChapterPlansDir(config, 'my-book')).toBe(join(tempDir, 'my-book', 'chapters-plan'));
  });
});

// ─── Lore file I/O ─────────────────────────────────────────────

describe('lore files', () => {
  it('writeLoreFiles + readLoreFiles round-trips', async () => {
    const files = {
      'basic-lore.md': '# Basic Lore\nSome content',
      'characters.md': '# Characters\nAlice, Bob',
    };

    await writeLoreFiles(config, 'test-proj', files);
    const read = await readLoreFiles(config, 'test-proj');

    expect(read['basic-lore.md']).toBe(files['basic-lore.md']);
    expect(read['characters.md']).toBe(files['characters.md']);
  });

  it('readLoreFiles returns {} for missing project', async () => {
    const result = await readLoreFiles(config, 'nonexistent');
    expect(result).toEqual({});
  });

  it('readLoreFiles only reads .md files', async () => {
    await writeLoreFiles(config, 'test-proj', {
      'notes.md': 'notes',
    });
    // Write a non-md file manually
    const { writeFile: wf, mkdir: mkd } = await import('node:fs/promises');
    await wf(join(getLoreDir(config, 'test-proj'), 'data.json'), '{}', 'utf-8');

    const read = await readLoreFiles(config, 'test-proj');
    expect(read).toHaveProperty('notes.md');
    expect(read).not.toHaveProperty('data.json');
  });
});

// ─── Lore context aggregation ──────────────────────────────────

describe('readLoreContext', () => {
  it('concatenates lore files excluding summary-of-chapters.md', async () => {
    await writeLoreFiles(config, 'ctx-proj', {
      'basic-lore.md': 'Lore content',
      'summary-of-chapters.md': 'Chapter summary',
    });

    const ctx = await readLoreContext(config, 'ctx-proj');
    expect(ctx).toContain('Lore content');
    expect(ctx).not.toContain('Chapter summary');
  });
});

// ─── Style guide ────────────────────────────────────────────────

describe('readStyleGuide', () => {
  it('returns style guide content when file exists', async () => {
    await writeLoreFiles(config, 'style-proj', {
      'style-of-writing.md': 'Write in third person omniscient.',
    });

    const style = await readStyleGuide(config, 'style-proj');
    expect(style).toBe('Write in third person omniscient.');
  });

  it('returns fallback when no style guide exists', async () => {
    const style = await readStyleGuide(config, 'no-style');
    expect(style).toBe('No style guide defined yet.');
  });
});

// ─── Chapter summary ────────────────────────────────────────────

describe('chapter summary', () => {
  it('readChapterSummary returns fallback when missing', async () => {
    const summary = await readChapterSummary(config, 'new-proj');
    expect(summary).toBe('No chapters written yet.');
  });

  it('updateChapterSummary + readChapterSummary round-trips', async () => {
    // Create lore dir first
    await writeLoreFiles(config, 'sum-proj', {});
    await updateChapterSummary(config, 'sum-proj', '# Summary\nChapter 1 done.');

    const summary = await readChapterSummary(config, 'sum-proj');
    expect(summary).toBe('# Summary\nChapter 1 done.');
  });
});

// ─── Chapters ───────────────────────────────────────────────────

describe('chapters', () => {
  it('writeChapter creates zero-padded filename', async () => {
    const path = await writeChapter(config, 'ch-proj', 3, '# Chapter 3\nContent.');

    expect(path).toContain('chapter-03.md');
    const content = await readFile(path, 'utf-8');
    expect(content).toBe('# Chapter 3\nContent.');
  });

  it('readChapter returns content for existing chapter', async () => {
    await writeChapter(config, 'ch-proj', 1, 'Content of ch 1');
    const content = await readChapter(config, 'ch-proj', 1);
    expect(content).toBe('Content of ch 1');
  });

  it('readChapter returns null for missing chapter', async () => {
    const content = await readChapter(config, 'ch-proj', 99);
    expect(content).toBeNull();
  });
});

// ─── Chapter plans ──────────────────────────────────────────────

describe('chapter plans', () => {
  it('writeChapterPlan + readChapterPlan round-trips', async () => {
    await writeChapterPlan(config, 'plan-proj', 2, '## Plan for Ch 2\n- Scene 1');
    const plan = await readChapterPlan(config, 'plan-proj', 2);
    expect(plan).toBe('## Plan for Ch 2\n- Scene 1');
  });

  it('readChapterPlan returns null for missing plan', async () => {
    const plan = await readChapterPlan(config, 'plan-proj', 99);
    expect(plan).toBeNull();
  });
});

// ─── Reviews ────────────────────────────────────────────────────

describe('reviews', () => {
  it('writeReview + readReview round-trips', async () => {
    await writeChapter(config, 'rev-proj', 1, 'Chapter text'); // ensure dir exists
    await writeReview(config, 'rev-proj', 1, '## Review\n- Good pacing');
    const review = await readReview(config, 'rev-proj', 1);
    expect(review).toBe('## Review\n- Good pacing');
  });

  it('readReview returns null for missing review', async () => {
    const review = await readReview(config, 'rev-proj', 1);
    expect(review).toBeNull();
  });
});

// ─── Writing instructions ───────────────────────────────────────

describe('writing instructions', () => {
  it('round-trips writing instructions', async () => {
    // Need the book dir to exist
    const { mkdir } = await import('node:fs/promises');
    await mkdir(getBookDir(config, 'wi-proj'), { recursive: true });

    await writeWritingInstructions(config, 'wi-proj', 'Use vivid imagery.');
    const result = await readWritingInstructions(config, 'wi-proj');
    expect(result).toBe('Use vivid imagery.');
  });

  it('returns null when no instructions exist', async () => {
    const result = await readWritingInstructions(config, 'no-wi');
    expect(result).toBeNull();
  });
});

// ─── Lore summaries ─────────────────────────────────────────────

describe('getLoreSummariesDir', () => {
  it('returns .summaries subdir under lore dir', () => {
    expect(getLoreSummariesDir(config, 'my-book')).toBe(
      join(tempDir, 'my-book', 'lore', '.summaries')
    );
  });
});

describe('hashLoreContent', () => {
  it('returns a 12-char hex hash', () => {
    const hash = hashLoreContent('Hello, world!');
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it('returns same hash for same content', () => {
    expect(hashLoreContent('test')).toBe(hashLoreContent('test'));
  });

  it('returns different hash for different content', () => {
    expect(hashLoreContent('a')).not.toBe(hashLoreContent('b'));
  });
});

describe('lore summary I/O', () => {
  it('writeLoreSummary + readLoreSummary round-trips', async () => {
    await writeLoreSummary(config, 'sum-proj', 'basic-lore.md', 'A summary of lore.', 'abc123def456');
    const result = await readLoreSummary(config, 'sum-proj', 'basic-lore.md');

    expect(result).not.toBeNull();
    expect(result!.hash).toBe('abc123def456');
    expect(result!.summary).toBe('A summary of lore.');
  });

  it('readLoreSummary returns null for missing file', async () => {
    const result = await readLoreSummary(config, 'nonexistent', 'basic-lore.md');
    expect(result).toBeNull();
  });

  it('readAllLoreSummaries reads all summaries', async () => {
    await writeLoreSummary(config, 'all-proj', 'basic-lore.md', 'Summary A', 'hash1');
    await writeLoreSummary(config, 'all-proj', 'characters.md', 'Summary B', 'hash2');

    const all = await readAllLoreSummaries(config, 'all-proj');
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['basic-lore.md']).toBe('Summary A');
    expect(all['characters.md']).toBe('Summary B');
  });

  it('readAllLoreSummaries returns {} for missing dir', async () => {
    const result = await readAllLoreSummaries(config, 'nonexistent');
    expect(result).toEqual({});
  });
});

describe('getStaleLoreFiles', () => {
  it('marks files without summaries as stale', async () => {
    await writeLoreFiles(config, 'stale-proj', {
      'basic-lore.md': 'Some lore content',
      'characters.md': 'Character info',
      'summary-of-chapters.md': 'Chapter summary',
    });

    const stale = await getStaleLoreFiles(config, 'stale-proj');
    // summary-of-chapters.md is excluded
    expect(stale).toContain('basic-lore.md');
    expect(stale).toContain('characters.md');
    expect(stale).not.toContain('summary-of-chapters.md');
  });

  it('marks files with outdated hash as stale', async () => {
    await writeLoreFiles(config, 'stale-proj2', {
      'basic-lore.md': 'Original content',
    });

    // Write summary with wrong hash
    await writeLoreSummary(config, 'stale-proj2', 'basic-lore.md', 'Old summary', 'wronghash123');

    const stale = await getStaleLoreFiles(config, 'stale-proj2');
    expect(stale).toContain('basic-lore.md');
  });

  it('skips files with matching hash', async () => {
    const content = 'Fresh lore content';
    await writeLoreFiles(config, 'fresh-proj', {
      'basic-lore.md': content,
    });

    const hash = hashLoreContent(content);
    await writeLoreSummary(config, 'fresh-proj', 'basic-lore.md', 'A summary', hash);

    const stale = await getStaleLoreFiles(config, 'fresh-proj');
    expect(stale).toHaveLength(0);
  });
});

describe('readLoreSummaryContext', () => {
  it('concatenates summaries like readLoreContext', async () => {
    await writeLoreSummary(config, 'ctx-proj', 'basic-lore.md', 'Summary A', 'h1');
    await writeLoreSummary(config, 'ctx-proj', 'characters.md', 'Summary B', 'h2');

    const ctx = await readLoreSummaryContext(config, 'ctx-proj');
    expect(ctx).toContain('=== basic-lore.md ===');
    expect(ctx).toContain('Summary A');
    expect(ctx).toContain('=== characters.md ===');
    expect(ctx).toContain('Summary B');
  });

  it('returns empty string for missing summaries', async () => {
    const ctx = await readLoreSummaryContext(config, 'nonexistent');
    expect(ctx).toBe('');
  });
});
