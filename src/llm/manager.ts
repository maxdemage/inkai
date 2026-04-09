import type { LLMProvider, LLMTier, ChatMessage, ChatOptions, InkaiConfig, LLMProviderName } from '../types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';

const providerCache = new Map<string, LLMProvider>();

function createProvider(providerName: LLMProviderName, apiKey: string, model: string): LLMProvider {
  const cacheKey = `${providerName}:${model}`;
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  let provider: LLMProvider;
  switch (providerName) {
    case 'openai':
      provider = new OpenAIProvider(apiKey, model);
      break;
    case 'anthropic':
      provider = new AnthropicProvider(apiKey, model);
      break;
    case 'gemini':
      provider = new GeminiProvider(apiKey, model);
      break;
  }

  providerCache.set(cacheKey, provider);
  return provider;
}

function getProviderForTier(config: InkaiConfig, tier: LLMTier): LLMProvider {
  const tierConfig = config.tiers[tier];
  const providerConfig = config.providers[tierConfig.provider];

  if (!providerConfig?.apiKey) {
    throw new Error(
      `No API key configured for provider "${tierConfig.provider}" (used by ${tier} tier). ` +
      `Run /config to set it up.`
    );
  }

  return createProvider(tierConfig.provider, providerConfig.apiKey, tierConfig.model);
}

export async function chatSmall(config: InkaiConfig, messages: ChatMessage[], options?: ChatOptions): Promise<string> {
  const provider = getProviderForTier(config, 'small');
  return provider.chat(messages, options);
}

export async function chatMedium(config: InkaiConfig, messages: ChatMessage[], options?: ChatOptions): Promise<string> {
  const provider = getProviderForTier(config, 'medium');
  return provider.chat(messages, options);
}

export async function chatWriter(config: InkaiConfig, messages: ChatMessage[], options?: ChatOptions): Promise<string> {
  const provider = getProviderForTier(config, 'writer');
  return provider.chat(messages, { maxTokens: 8192, ...options });
}

export function clearProviderCache(): void {
  providerCache.clear();
}
