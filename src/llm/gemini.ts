import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { LLMProvider, ChatMessage, ChatOptions } from '../types.js';

// Fiction writing needs relaxed safety — stories often include conflict, violence, and mature themes
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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
      safetySettings: SAFETY_SETTINGS,
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

    try {
      const result = await chat.sendMessage(lastMsg?.content ?? '');
      const response = result.response;

      // Check if prompt was blocked
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Gemini blocked the request (${response.promptFeedback.blockReason}). Try rephrasing your lore or chapter content.`);
      }

      return response.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('PROHIBITED_CONTENT') || msg.includes('blocked') || msg.includes('SAFETY')) {
        throw new Error('Gemini safety filter blocked this content. Fiction with conflict or mature themes may trigger this — consider using a different LLM provider for this tier.');
      }
      throw err;
    }
  }
}
