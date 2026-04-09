// ─── Book Types ───────────────────────────────────────────────

export type BookType = 'novel' | 'prose' | 'biography' | 'report' | 'poetry' | 'screenplay';

export const BOOK_TYPES: { value: BookType; label: string }[] = [
  { value: 'novel', label: 'Novel' },
  { value: 'prose', label: 'Prose / Short Stories' },
  { value: 'biography', label: 'Biography / Memoir' },
  { value: 'report', label: 'Report / Non-Fiction' },
  { value: 'poetry', label: 'Poetry Collection' },
  { value: 'screenplay', label: 'Screenplay / Script' },
];

export type BookStatus = 'new' | 'initial-processing' | 'work-in-progress' | 'completed' | 'archived';

export interface BookRecord {
  id: string;
  projectName: string;
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  authors: string[];
  purpose: string;
  status: BookStatus;
  chapterCount: number;
  cachedSummary?: string;
  summaryFresh?: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

// ─── LLM Types ────────────────────────────────────────────────

export type LLMProviderName = 'openai' | 'anthropic' | 'gemini';
export type LLMTier = 'small' | 'medium' | 'writer';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMProvider {
  name: LLMProviderName;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}

// ─── Config Types ─────────────────────────────────────────────

export interface ProviderConfig {
  apiKey: string;
}

export interface TierConfig {
  provider: LLMProviderName;
  model: string;
}

export interface InkaiConfig {
  providers: Partial<Record<LLMProviderName, ProviderConfig>>;
  tiers: Record<LLMTier, TierConfig>;
  booksDir: string;
  git: {
    enabled: boolean;
    autoCommit: boolean;
  };
  backgroundWriting: boolean;
  language: string;
}

// ─── Database Types ───────────────────────────────────────────

export interface Database {
  books: BookRecord[];
}

// ─── Command Types ────────────────────────────────────────────

export interface AppContext {
  config: InkaiConfig;
  selectedBook: BookRecord | null;
  gitEnabled: boolean;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  requiresBook?: boolean;
  execute(args: string[], ctx: AppContext): Promise<void>;
}

// ─── Lore Question from LLM ──────────────────────────────────

export interface LoreQuestion {
  key: string;
  question: string;
  type: 'text' | 'multiline' | 'choice';
  choices?: string[];
  required: boolean;
}
