import { input, select, password } from '@inquirer/prompts';
import type { Command, LLMProviderName, LLMTier } from '../types.js';
import { loadConfig, saveConfig } from '../config.js';
import { clearProviderCache } from '../llm/manager.js';
import { header, success, info, keyValue, blank, divider, c } from '../ui.js';

const PROVIDER_CHOICES = [
  { name: 'OpenAI', value: 'openai' as LLMProviderName },
  { name: 'Anthropic (Claude)', value: 'anthropic' as LLMProviderName },
  { name: 'Google Gemini', value: 'gemini' as LLMProviderName },
];

const MODEL_SUGGESTIONS: Record<LLMProviderName, Record<LLMTier, string>> = {
  openai: {
    small: 'gpt-4o-mini',
    medium: 'gpt-4o',
    writer: 'gpt-4o',
  },
  anthropic: {
    small: 'claude-sonnet-4-20250514',
    medium: 'claude-sonnet-4-20250514',
    writer: 'claude-opus-4-20250514',
  },
  gemini: {
    small: 'gemini-3.1-flash-lite-preview',
    medium: 'gemini-3.1-pro-preview',
    writer: 'gemini-3.1-pro-preview',
  },
};

export const configCommand: Command = {
  name: 'config',
  description: 'Configure LLM providers and settings',
  aliases: ['settings', 'setup'],

  async execute(_args, ctx) {
    const config = await loadConfig();

    header('Configuration');

    const action = await select({
      message: 'What would you like to configure?',
      choices: [
        { name: 'Set API keys', value: 'keys' },
        { name: 'Configure LLM tiers (small/medium/writer)', value: 'tiers' },
        { name: 'Change books directory', value: 'booksdir' },
        { name: `Toggle background writing (currently ${config.backgroundWriting ? 'ON' : 'OFF'})`, value: 'background' },
        { name: 'View current config', value: 'view' },
        { name: '← Back', value: 'back' },
      ],
    });

    switch (action) {
      case 'keys':
        await configureKeys();
        break;
      case 'tiers':
        await configureTiers();
        break;
      case 'booksdir':
        await configureBooksDir();
        break;
      case 'background':
        await toggleBackground();
        break;
      case 'view':
        await viewConfig();
        break;
      case 'back':
        return;
    }

    async function configureKeys() {
      const provider = await select({
        message: 'Which provider?',
        choices: PROVIDER_CHOICES,
      });

      const currentKey = config.providers[provider]?.apiKey;
      const masked = currentKey ? `${currentKey.slice(0, 8)}...${currentKey.slice(-4)}` : 'not set';
      info(`Current key: ${c.muted(masked)}`);

      const apiKey = await password({
        message: `API key for ${provider}:`,
        mask: '*',
      });

      if (apiKey.trim()) {
        config.providers[provider] = { apiKey: apiKey.trim() };
        await saveConfig(config);
        clearProviderCache();
        Object.assign(ctx.config, config);
        success(`${provider} API key saved.`);
      }
    }

    async function configureTiers() {
      const tier = await select({
        message: 'Which tier?',
        choices: [
          { name: 'Small (fast, cheap — used for questions & summaries)', value: 'small' as LLMTier },
          { name: 'Medium (balanced — used for lore editing)', value: 'medium' as LLMTier },
          { name: 'Writer (best quality — used for writing & reviews)', value: 'writer' as LLMTier },
        ],
      });

      const provider = await select({
        message: `Provider for ${tier} tier:`,
        choices: PROVIDER_CHOICES,
      });

      const suggested = MODEL_SUGGESTIONS[provider][tier];
      const model = await input({
        message: `Model name:`,
        default: suggested,
      });

      config.tiers[tier] = { provider, model };
      await saveConfig(config);
      clearProviderCache();
      Object.assign(ctx.config, config);
      success(`${tier} tier set to ${provider}/${model}`);
    }

    async function configureBooksDir() {
      const dir = await input({
        message: 'Books directory:',
        default: config.booksDir,
      });

      config.booksDir = dir.trim();
      await saveConfig(config);
      Object.assign(ctx.config, config);
      success(`Books directory set to ${dir}`);
    }

    async function viewConfig() {
      blank();
      info('Current Configuration:');
      blank();
      divider();

      for (const [name, providerCfg] of Object.entries(config.providers)) {
        const key = providerCfg?.apiKey;
        const masked = key ? `${key.slice(0, 8)}...${key.slice(-4)}` : c.error('not set');
        keyValue(`${name}`, String(masked));
      }

      divider();

      for (const [tier, tierCfg] of Object.entries(config.tiers)) {
        keyValue(tier, `${tierCfg.provider} / ${tierCfg.model}`);
      }

      divider();
      keyValue('Books dir', config.booksDir);
      keyValue('Git', config.git.enabled ? 'enabled' : 'disabled');
      keyValue('Background writing', config.backgroundWriting ? 'enabled' : 'disabled');
      blank();
    }

    async function toggleBackground() {
      config.backgroundWriting = !config.backgroundWriting;
      await saveConfig(config);
      Object.assign(ctx.config, config);
      success(`Background writing ${config.backgroundWriting ? 'enabled' : 'disabled'}.`);
      if (config.backgroundWriting) {
        info('Chapter writing (steps 4-6) can now run in a detached process.');
        info('Use /jobs to check progress.');
      }
    }
  },
};
