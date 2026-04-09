// Prompt i18n registry — maps language codes to prompt defaults.

import { EN_DEFAULTS } from './en.js';
import { PL_DEFAULTS } from './pl.js';

export interface SupportedLanguage {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'pl', name: 'Polski (Polish)' },
];

const LANGUAGE_MAP: Record<string, Record<string, string>> = {
  en: EN_DEFAULTS,
  pl: PL_DEFAULTS,
};

/** Get prompt defaults for a given language code. Falls back to English. */
export function getPromptDefaults(language: string): Record<string, string> {
  return LANGUAGE_MAP[language] ?? EN_DEFAULTS;
}
