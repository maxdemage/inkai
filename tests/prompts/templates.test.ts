import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PROMPT_DEFAULTS } from '../../src/prompts/defaults.js';

// Mock the loader's filesystem access so we can test template rendering
// without touching ~/.inkai/prompts/
vi.mock('../../src/config.js', () => ({
  getInkaiDir: () => '/tmp/inkai-test',
}));

// Force loadTemplate to always use built-in defaults (no fs reads)
vi.mock('node:fs', () => ({
  existsSync: () => false,
}));

// We still need the real readFile signature for the mock to be valid
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn().mockResolvedValue([]),
}));

// Import after mocks are set up
const { loadTemplate } = await import('../../src/prompts/loader.js');

describe('prompt template interpolation', () => {
  it('substitutes simple {{var}} placeholders', async () => {
    const result = await loadTemplate('lore-questions-round1', {
      title: 'The Dark Tower',
      type: 'novel',
      genre: 'fantasy',
      subgenre: 'dark fantasy',
      purpose: 'entertainment',
    });

    expect(result).toContain('The Dark Tower');
    expect(result).toContain('novel');
    expect(result).toContain('fantasy');
    expect(result).toContain('dark fantasy');
    expect(result).toContain('entertainment');
    // Variables should be replaced — no raw {{title}} remaining
    expect(result).not.toContain('{{title}}');
    expect(result).not.toContain('{{type}}');
  });

  it('returns empty string for unknown template name', async () => {
    const result = await loadTemplate('nonexistent-template', {});
    expect(result).toBe('');
  });

  it('leaves missing variables as empty string', async () => {
    const result = await loadTemplate('lore-questions-round1', {
      title: 'Test',
      // deliberately omitting other vars
    });
    expect(result).toContain('Test');
    // Missing vars should be replaced with empty string, not left as {{varName}}
    expect(result).not.toMatch(/\{\{\w+\}\}/);
  });
});

describe('prompt template conditionals', () => {
  it('includes content when {{#if var}} is truthy', async () => {
    const result = await loadTemplate('chapter-writing-from-plan', {
      loreContext: 'Lore here',
      styleContext: 'Style here',
      chapterPlan: 'Plan here',
      chapterNumber: '5',
      writingInstructions: 'Write in first person',
    });

    expect(result).toContain('Lore here');
    expect(result).toContain('Plan here');
    expect(result).toContain('Write in first person');
  });

  it('omits conditional block when variable is empty', async () => {
    const result = await loadTemplate('chapter-writing-from-plan', {
      loreContext: 'Lore here',
      styleContext: 'Style here',
      chapterPlan: 'Plan here',
      chapterNumber: '5',
      writingInstructions: '',
    });

    expect(result).toContain('Lore here');
    // The conditional block around writingInstructions should be absent
    expect(result).not.toContain('{{#if');
    expect(result).not.toContain('{{/if}}');
  });
});

describe('PROMPT_DEFAULTS', () => {
  it('has all required template keys', () => {
    const requiredKeys = [
      'lore-questions-round1',
      'lore-questions-round2',
      'lore-generation',
      'chapter-suggestion',
      'chapter-plan',
      'chapter-writing-from-plan',
      'chapter-qa',
    ];

    for (const key of requiredKeys) {
      expect(PROMPT_DEFAULTS).toHaveProperty(key);
      expect(PROMPT_DEFAULTS[key].length).toBeGreaterThan(0);
    }
  });

  it('templates contain expected variable placeholders', () => {
    expect(PROMPT_DEFAULTS['chapter-suggestion']).toContain('{{loreContext}}');
    expect(PROMPT_DEFAULTS['chapter-suggestion']).toContain('{{chapterNumber}}');

    expect(PROMPT_DEFAULTS['chapter-plan']).toContain('{{loreContext}}');
    expect(PROMPT_DEFAULTS['chapter-plan']).toContain('{{chapterNumber}}');
    expect(PROMPT_DEFAULTS['chapter-plan']).toContain('{{guidelines}}');

    expect(PROMPT_DEFAULTS['chapter-qa']).toContain('{{chapterContent}}');
    expect(PROMPT_DEFAULTS['chapter-qa']).toContain('{{chapterPlan}}');
  });
});
