import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, ChatMessage, ChatOptions } from '../types.js';
import { withRetry } from './retry.js';
import { recordUsage } from './usage.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic' as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    // Separate system message from conversation
    const systemMsg = messages.find(m => m.role === 'system');
    const conversationMsgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemContent = [
      systemMsg?.content,
      options?.jsonMode ? 'Respond with valid JSON only. Do not include any prose or markdown.' : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await withRetry(
      () => this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        ...(systemContent ? { system: systemContent } : {}),
        messages: conversationMsgs,
      }),
      { maxRetries: options?.maxRetries, timeoutMs: options?.timeoutMs },
    );

    if (response.usage) {
      recordUsage(this.name, this.model, response.usage.input_tokens, response.usage.output_tokens);
    }

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text ?? '';
  }
}
