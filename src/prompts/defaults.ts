// Default prompt templates — re-exports from i18n system.
// The actual content lives in ./i18n/en.ts, ./i18n/pl.ts, etc.
// PROMPT_DEFAULTS is kept for backward compatibility (English defaults).

export { EN_DEFAULTS as PROMPT_DEFAULTS } from './i18n/en.js';
export { getPromptDefaults, SUPPORTED_LANGUAGES } from './i18n/index.js';
export type { SupportedLanguage } from './i18n/index.js';

