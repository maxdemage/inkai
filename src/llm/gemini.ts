import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, ChatMessage, ChatOptions } from '../types.js';

export class GeminiProvider implements LLMProvider {
  name = 'gemini' as const;
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        ...(options?.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    });

    // Build conversation: system instruction + history + last user message
    const systemMsg = messages.find(m => m.role === 'system');
    const conversationMsgs = messages.filter(m => m.role !== 'system');
    const lastMsg = conversationMsgs.pop();

    const chat = model.startChat({
      ...(systemMsg ? { systemInstruction: { role: 'user' as const, parts: [{ text: systemMsg.content }] } } : {}),
      history: conversationMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessage(lastMsg?.content ?? '');
    return result.response.text();
  }
}
