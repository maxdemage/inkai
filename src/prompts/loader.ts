import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getInkaiDir } from '../config.js';
import { PROMPT_DEFAULTS } from './defaults.js';

const PROMPTS_DIR = join(getInkaiDir(), 'prompts');

export function getPromptsDir(): string {
  return PROMPTS_DIR;
}

/** Write default prompt files that don't already exist. */
export async function initPromptFiles(): Promise<void> {
  if (!existsSync(PROMPTS_DIR)) {
    await mkdir(PROMPTS_DIR, { recursive: true });
  }

  for (const [name, content] of Object.entries(PROMPT_DEFAULTS)) {
    const filePath = join(PROMPTS_DIR, `${name}.md`);
    if (!existsSync(filePath)) {
      await writeFile(filePath, content, 'utf-8');
    }
  }
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
