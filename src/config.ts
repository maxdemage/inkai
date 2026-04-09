import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { InkaiConfig } from './types.js';

const INKAI_DIR = join(homedir(), '.inkai');
const CONFIG_PATH = join(INKAI_DIR, 'config.json');
const SESSION_PATH = join(INKAI_DIR, 'session.json');

export interface SessionState {
  lastBook: string | null;
  lastChapter: number;
  timestamp: string;
}

export const DEFAULT_CONFIG: InkaiConfig = {
  providers: {},
  tiers: {
    small:  { provider: 'openai',    model: 'gpt-4o-mini' },
    medium: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    writer: { provider: 'anthropic', model: 'claude-opus-4-20250514' },
  },
  booksDir: join(INKAI_DIR, 'books'),
  git: {
    enabled: false,
    autoCommit: true,
  },
  backgroundWriting: false,
};

export function getInkaiDir(): string {
  return INKAI_DIR;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export async function ensureInkaiDir(): Promise<void> {
  if (!existsSync(INKAI_DIR)) {
    await mkdir(INKAI_DIR, { recursive: true });
  }
}

export async function isConfigured(): Promise<boolean> {
  return existsSync(CONFIG_PATH);
}

export async function loadConfig(): Promise<InkaiConfig> {
  await ensureInkaiDir();

  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = await readFile(CONFIG_PATH, 'utf-8');
  const saved = JSON.parse(raw) as Partial<InkaiConfig>;

  return {
    ...DEFAULT_CONFIG,
    ...saved,
    providers: { ...DEFAULT_CONFIG.providers, ...saved.providers },
    tiers: { ...DEFAULT_CONFIG.tiers, ...saved.tiers },
    git: { ...DEFAULT_CONFIG.git, ...saved.git },
  };
}

export async function saveConfig(config: InkaiConfig): Promise<void> {
  await ensureInkaiDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function hasAnyProvider(config: InkaiConfig): Promise<boolean> {
  const providers = config.providers;
  return !!(
    providers.openai?.apiKey ||
    providers.anthropic?.apiKey ||
    providers.gemini?.apiKey
  );
}

// ─── Session State ────────────────────────────────────────────

export async function loadSession(): Promise<SessionState | null> {
  if (!existsSync(SESSION_PATH)) return null;
  try {
    const raw = await readFile(SESSION_PATH, 'utf-8');
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export async function saveSession(state: SessionState): Promise<void> {
  await ensureInkaiDir();
  await writeFile(SESSION_PATH, JSON.stringify(state, null, 2), 'utf-8');
}
