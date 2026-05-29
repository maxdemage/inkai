import OpenAI from 'openai';
import type { LLMProvider, ChatMessage, ChatOptions } from '../types.js';
import { withRetry } from './retry.js';
import { recordUsage } from './usage.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai' as const;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const response = await withRetry(
      () => this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      { maxRetries: options?.maxRetries, timeoutMs: options?.timeoutMs },
    );

    if (response.usage) {
      recordUsage(this.name, this.model, response.usage.prompt_tokens, response.usage.completion_tokens);
    }

    return response.choices[0]?.message?.content ?? '';
  }
}
