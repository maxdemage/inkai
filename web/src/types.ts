export type BookType = 'novel' | 'prose' | 'biography' | 'report' | 'poetry' | 'screenplay';
export type BookStatus = 'new' | 'initial-processing' | 'work-in-progress' | 'completed' | 'archived' | 'on-hold' | 'review' | 'limbo';
export type JobStatus = 'pending' | 'running' | 'done' | 'failed';
export type LLMProviderName = 'openai' | 'anthropic' | 'gemini';
export type LLMTier = 'small' | 'medium' | 'writer';

export type ReviewType = 'grammar' | 'standard' | 'full';
export type ReviewPersona = 'chill' | 'strict' | 'dry';

export const REVIEW_TYPES: { value: ReviewType; label: string; description: string }[] = [
  { value: 'grammar',  label: 'Grammar & Writing',   description: 'Spelling, grammar, punctuation, sentence structure only' },
  { value: 'standard', label: 'Style & Consistency', description: 'Writing style, lore accuracy, character consistency' },
  { value: 'full',     label: 'Full Review',          description: 'Complete editorial review — structure, prose, consistency, suggestions' },
];

export const REVIEW_PERSONAS: { value: ReviewPersona; label: string; description: string }[] = [
  { value: 'chill',  label: 'Chill',  description: 'Warm and encouraging — builds on what works' },
  { value: 'strict', label: 'Strict', description: 'High standards, no sugarcoating' },
  { value: 'dry',    label: 'Dry/AI', description: 'Clinical, analytical, no emotional framing' },
];

export interface BookRecord {
  id: string;
  projectName: string;
  title: string;
  type: BookType;
  genre: string;
  subgenre: string;
  authors: string[];
  purpose: string;
  summary: string;
  status: BookStatus;
  chapterCount: number;
  cachedSummary?: string;
  summaryFresh?: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface ChapterMeta {
  number: number;
  hasChapter: boolean;
  hasReview: boolean;
  hasPlan: boolean;
  wordCount: number;
}

export interface ChapterJob {
  id: string;
  status: JobStatus;
  bookId: string;
  projectName: string;
  bookTitle: string;
  chapterNumber: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  pid?: number;
  processAlive?: boolean;
}

export interface LoreQuestion {
  key: string;
  question: string;
  type: 'text' | 'multiline' | 'choice';
  choices?: string[];
  required: boolean;
}

export interface ProviderConfig { apiKey: string; }
export interface TierConfig { provider: LLMProviderName; model: string; }

export interface InkaiConfig {
  providers: Partial<Record<LLMProviderName, ProviderConfig>>;
  tiers: Record<LLMTier, TierConfig>;
  booksDir: string;
  git: { enabled: boolean; autoCommit: boolean; };
  backgroundWriting: boolean;
  language: string;
}

// ── Git ────────────────────────────────────────────────────────
export interface GitLogEntry { hash: string; date: string; message: string; }
export interface GitStatusResult {
  available: boolean;
  changed: string[];
  log: GitLogEntry[];
}

// ── Mini Agent ──────────────────────────────────────────────────
export interface GuiAgentSayStep      { type: 'say';      message: string; }
export interface GuiAgentAskStep      { type: 'ask';      key: string; question: string; }
export interface GuiAgentNavigateStep { type: 'navigate'; to: string; description: string; }
export interface GuiAgentSseStep      { type: 'sse';      endpoint: string; bodyParam?: string; answerKey?: string; }

export type GuiAgentStep = GuiAgentSayStep | GuiAgentAskStep | GuiAgentNavigateStep | GuiAgentSseStep;

export interface GuiAgentPlan { intent: string; steps: GuiAgentStep[]; }

export const BOOK_TYPES: { value: BookType; label: string }[] = [
  { value: 'novel', label: 'Novel' },
  { value: 'prose', label: 'Prose / Short Stories' },
  { value: 'biography', label: 'Biography / Memoir' },
  { value: 'report', label: 'Report / Non-Fiction' },
  { value: 'poetry', label: 'Poetry Collection' },
  { value: 'screenplay', label: 'Screenplay / Script' },
];

export const GENRES = [
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Science Fiction', value: 'sci-fi' },
  { label: 'Mystery / Thriller', value: 'mystery' },
  { label: 'Romance', value: 'romance' },
  { label: 'Horror', value: 'horror' },
  { label: 'Literary Fiction', value: 'literary fiction' },
  { label: 'Historical Fiction', value: 'historical fiction' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'Crime', value: 'crime' },
  { label: 'Comedy / Satire', value: 'comedy' },
  { label: 'Drama', value: 'drama' },
  { label: 'Non-Fiction', value: 'non-fiction' },
  { label: 'Self-Help', value: 'self-help' },
  { label: 'Other', value: '__other__' },
];
