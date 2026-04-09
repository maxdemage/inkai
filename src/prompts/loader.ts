import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getInkaiDir } from '../config.js';
import { PROMPT_DEFAULTS } from './defaults.js';
import { getPromptDefaults } from './i18n/index.js';

const PROMPTS_DIR = join(getInkaiDir(), 'prompts');

export function getPromptsDir(): string {
  return PROMPTS_DIR;
}

/** Write default prompt files that don't already exist, using the given language. */
export async function initPromptFiles(language = 'en'): Promise<void> {
  if (!existsSync(PROMPTS_DIR)) {
    await mkdir(PROMPTS_DIR, { recursive: true });
  }

  const defaults = getPromptDefaults(language);
  for (const [name, content] of Object.entries(defaults)) {
    const filePath = join(PROMPTS_DIR, `${name}.md`);
    if (!existsSync(filePath)) {
      await writeFile(filePath, content, 'utf-8');
    }
  }
}

/** Reset all prompt files to defaults for the given language. */
export async function resetPromptFiles(language = 'en'): Promise<number> {
  if (!existsSync(PROMPTS_DIR)) {
    await mkdir(PROMPTS_DIR, { recursive: true });
  }

  const defaults = getPromptDefaults(language);
  for (const [name, content] of Object.entries(defaults)) {
    await writeFile(join(PROMPTS_DIR, `${name}.md`), content, 'utf-8');
  }
  return Object.keys(defaults).length;
}

/** Load a prompt template by name, interpolate variables. Falls back to built-in default. */
export async function loadTemplate(name: string, vars: Record<string, string>): Promise<string> {
  const filePath = join(PROMPTS_DIR, `${name}.md`);

  let template: string;
  if (existsSync(filePath)) {
    template = await readFile(filePath, 'utf-8');
  } else {
    template = PROMPT_DEFAULTS[name] ?? '';
  }

  return interpolate(template, vars);
}

/** Simple template interpolation: {{#if var}}...{{/if}} and {{var}}. */
function interpolate(template: string, vars: Record<string, string>): string {
  // Handle {{#if var}}...{{/if}} blocks
  let result = template.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, content: string) => {
      return vars[key] ? interpolate(content, vars) : '';
    },
  );

  // Handle {{variable}} substitution
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? '';
  });

  return result;
}
