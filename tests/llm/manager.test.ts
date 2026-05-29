import { describe, it, expect } from 'vitest';
import { chatSmall, chatMedium, chatWriter } from '../../src/llm/manager.js';
import type { InkaiConfig } from '../../src/types.js';

function makeConfig(overrides: Partial<InkaiConfig> = {}): InkaiConfig {
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
    language: 'en',
    ...overrides,
  };
}

describe('LLM manager tier routing', () => {
  it('throws a helpful error when the tier provider has no API key', async () => {
    const config = makeConfig();
    await expect(chatSmall(config, [{ role: 'user', content: 'hi' }])).rejects.toThrow(
      /No API key configured for provider "openai"/,
    );
  });

  it('reports the correct provider for each tier', async () => {
    const config = makeConfig();
    await expect(chatMedium(config, [{ role: 'user', content: 'hi' }])).rejects.toThrow(/anthropic/);
    await expect(chatWriter(config, [{ role: 'user', content: 'hi' }])).rejects.toThrow(/anthropic/);
  });
});
