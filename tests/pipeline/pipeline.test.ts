import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InkaiConfig, ChatMessage, ChatOptions } from '../../src/types.js';
import type { PipelineInput, PipelineCallbacks, PipelineResult } from '../../src/pipeline.js';

// ─── Mocks ────────────────────────────────────────────────────

const mockChatWriter = vi.fn<(config: InkaiConfig, messages: ChatMessage[], opts?: ChatOptions) => Promise<string>>();
const mockChatSmall = vi.fn<(config: InkaiConfig, messages: ChatMessage[], opts?: ChatOptions) => Promise<string>>();

vi.mock('../../src/llm/manager.js', () => ({
  chatWriter: (...args: unknown[]) => mockChatWriter(...args as [InkaiConfig, ChatMessage[], ChatOptions?]),
  chatSmall: (...args: unknown[]) => mockChatSmall(...args as [InkaiConfig, ChatMessage[], ChatOptions?]),
}));

vi.mock('../../src/book/manager.js', () => ({
  writeChapter: vi.fn().mockResolvedValue('/tmp/chapter-01.md'),
  updateChapterSummary: vi.fn().mockResolvedValue(undefined),
  getBookDir: vi.fn().mockReturnValue('/tmp/test-book'),
}));

vi.mock('../../src/db.js', () => ({
  updateBook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/git.js', () => ({
  gitCommit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/prompts/templates.js', () => ({
  buildChapterWritingFromPlanPrompt: vi.fn().mockResolvedValue('write prompt'),
  buildChapterQAPrompt: vi.fn().mockResolvedValue('qa prompt'),
  buildSummaryUpdatePrompt: vi.fn().mockResolvedValue('summary prompt'),
}));

const { runChapterPipeline } = await import('../../src/pipeline.js');

// ─── Helpers ──────────────────────────────────────────────────

function makeConfig(): InkaiConfig {
  return {
    providers: {},
    tiers: {
      small: { provider: 'openai', model: 'gpt-4o-mini' },
      medium: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      writer: { provider: 'anthropic', model: 'claude-opus-4-20250514' },
    },
    booksDir: '/tmp/books',
    git: { enabled: false, autoCommit: false },
    backgroundWriting: false,
  };
}

function makeInput(overrides?: Partial<PipelineInput>): PipelineInput {
  return {
    config: makeConfig(),
    projectName: 'test-book',
    bookId: 'book-123',
    chapterNumber: 1,
    loreContext: 'Test lore',
    styleGuide: 'Test style',
    chapterSummary: 'Test summary',
    chapterPlan: 'Test plan',
    writingInstructions: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────

describe('runChapterPipeline', () => {
  it('returns chapter content, file path, and status flags', async () => {
    mockChatWriter
      .mockResolvedValueOnce('# Chapter 1\nFirst draft content.')      // write step
      .mockResolvedValueOnce(JSON.stringify({                          // QA step
        changes_made: false,
        issues_found: [],
      }));
    mockChatSmall.mockResolvedValueOnce('Updated summary.');           // summary step

    const result = await runChapterPipeline(makeInput());

    expect(result.chapterContent).toBe('# Chapter 1\nFirst draft content.');
    expect(result.filePath).toBe('/tmp/chapter-01.md');
    expect(result.qaApplied).toBe(false);
    expect(result.summaryUpdated).toBe(true);
  });

  it('applies QA changes when QA agent returns revised chapter', async () => {
    mockChatWriter
      .mockResolvedValueOnce('Draft with issues.')
      .mockResolvedValueOnce(JSON.stringify({
        changes_made: true,
        chapter: 'Fixed chapter content.',
        issues_found: ['Fixed POV issue'],
      }));
    mockChatSmall.mockResolvedValueOnce('Updated summary.');

    const result = await runChapterPipeline(makeInput());

    expect(result.chapterContent).toBe('Fixed chapter content.');
    expect(result.qaApplied).toBe(true);
  });

  it('fires onWriteStart and onWriteComplete callbacks', async () => {
    mockChatWriter
      .mockResolvedValueOnce('Draft.')
      .mockResolvedValueOnce('{"changes_made": false}');
    mockChatSmall.mockResolvedValueOnce('Summary.');

    const callbacks: PipelineCallbacks = {
      onWriteStart: vi.fn(),
      onWriteComplete: vi.fn(),
      onSaveStart: vi.fn(),
      onSaveComplete: vi.fn(),
    };

    await runChapterPipeline(makeInput(), callbacks);

    expect(callbacks.onWriteStart).toHaveBeenCalledOnce();
    expect(callbacks.onWriteComplete).toHaveBeenCalledOnce();
    expect(callbacks.onSaveStart).toHaveBeenCalledOnce();
    expect(callbacks.onSaveComplete).toHaveBeenCalledWith('/tmp/chapter-01.md');
  });

  it('handles QA parse error gracefully', async () => {
    mockChatWriter
      .mockResolvedValueOnce('Draft.')
      .mockResolvedValueOnce('not valid json at all');     // QA returns garbage
    mockChatSmall.mockResolvedValueOnce('Summary.');

    const callbacks: PipelineCallbacks = {
      onQAParseError: vi.fn(),
    };

    const result = await runChapterPipeline(makeInput(), callbacks);

    // Pipeline should continue despite QA parse failure
    expect(result.chapterContent).toBe('Draft.');
    expect(result.qaApplied).toBe(false);
    expect(callbacks.onQAParseError).toHaveBeenCalledOnce();
  });

  it('handles QA network error gracefully', async () => {
    mockChatWriter
      .mockResolvedValueOnce('Draft.')
      .mockRejectedValueOnce(new Error('Network timeout'));  // QA call fails
    mockChatSmall.mockResolvedValueOnce('Summary.');

    const callbacks: PipelineCallbacks = {
      onQAError: vi.fn(),
    };

    const result = await runChapterPipeline(makeInput(), callbacks);

    expect(result.chapterContent).toBe('Draft.');
    expect(result.qaApplied).toBe(false);
    expect(callbacks.onQAError).toHaveBeenCalledOnce();
  });

  it('handles summary update failure gracefully', async () => {
    mockChatWriter
      .mockResolvedValueOnce('Draft.')
      .mockResolvedValueOnce('{"changes_made": false}');
    mockChatSmall.mockRejectedValueOnce(new Error('API error'));

    const callbacks: PipelineCallbacks = {
      onSummaryError: vi.fn(),
    };

    const result = await runChapterPipeline(makeInput(), callbacks);

    expect(result.summaryUpdated).toBe(false);
    expect(callbacks.onSummaryError).toHaveBeenCalledOnce();
  });

  it('triggers git commit when git is enabled', async () => {
    const { gitCommit } = await import('../../src/git.js');

    mockChatWriter
      .mockResolvedValueOnce('Draft.')
      .mockResolvedValueOnce('{"changes_made": false}');
    mockChatSmall.mockResolvedValueOnce('Summary.');

    const input = makeInput({
      config: {
        ...makeConfig(),
        git: { enabled: true, autoCommit: true },
      },
    });

    await runChapterPipeline(input);

    expect(gitCommit).toHaveBeenCalledWith('/tmp/test-book', 'Write Chapter 1');
  });

  it('uses custom commit message when provided', async () => {
    const { gitCommit } = await import('../../src/git.js');

    mockChatWriter
      .mockResolvedValueOnce('Draft.')
      .mockResolvedValueOnce('{"changes_made": false}');
    mockChatSmall.mockResolvedValueOnce('Summary.');

    const input = makeInput({
      config: {
        ...makeConfig(),
        git: { enabled: true, autoCommit: true },
      },
      commitMessage: 'Custom: wrote chapter 1',
    });

    await runChapterPipeline(input);

    expect(gitCommit).toHaveBeenCalledWith('/tmp/test-book', 'Custom: wrote chapter 1');
  });

  it('skips git commit when git is disabled', async () => {
    const { gitCommit } = await import('../../src/git.js');

    mockChatWriter
      .mockResolvedValueOnce('Draft.')
      .mockResolvedValueOnce('{"changes_made": false}');
    mockChatSmall.mockResolvedValueOnce('Summary.');

    await runChapterPipeline(makeInput());

    expect(gitCommit).not.toHaveBeenCalled();
  });
});
