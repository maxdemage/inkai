import type { BookRecord, ChapterMeta, ChapterJob, InkaiConfig, LoreQuestion } from './types';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ── Books ─────────────────────────────────────────────────────────
export const api = {
  books: {
    list: () => req<BookRecord[]>('/books'),
    get: (id: string) => req<BookRecord>(`/books/${id}`),
    update: (id: string, data: Partial<BookRecord>) =>
      req<BookRecord>(`/books/${id}`, { method: 'PATCH', ...json(data) }),
    archive: (id: string) =>
      req<{ ok: boolean }>(`/books/${id}/archive`, { method: 'POST' }),
    unarchive: (id: string) =>
      req<{ ok: boolean }>(`/books/${id}/unarchive`, { method: 'POST' }),
    wizardStart: (data: {
      title: string; type: string; genre: string; subgenre: string;
      purpose: string; summary: string;
    }) => req<{ questions: LoreQuestion[] }>('/books/wizard/start', { method: 'POST', ...json(data) }),
    wizardRound2: (data: {
      title: string; type: string; genre: string; subgenre: string;
      purpose: string; summary: string; round1Answers: Record<string, string>;
    }) => req<{ questions: LoreQuestion[] }>('/books/wizard/round2', { method: 'POST', ...json(data) }),
  },

  chapters: {
    list: (bookId: string) => req<ChapterMeta[]>(`/books/${bookId}/chapters`),
    get: (bookId: string, n: number) =>
      req<{ number: number; content: string }>(`/books/${bookId}/chapters/${n}`),
    update: (bookId: string, n: number, content: string) =>
      req<{ ok: boolean }>(`/books/${bookId}/chapters/${n}`, { method: 'PUT', ...json({ content }) }),
    getReview: (bookId: string, n: number) =>
      req<{ number: number; content: string }>(`/books/${bookId}/chapters/${n}/review`),
    suggest: (bookId: string) =>
      req<{ suggestion: string }>(`/books/${bookId}/chapters/suggest`, { method: 'POST' }),
    create: (bookId: string, data: { guidelines: string; writingInstructions?: string }) =>
      req<{ jobId: string; chapterNumber: number; plan: string }>(
        `/books/${bookId}/chapters`, { method: 'POST', ...json(data) }),
  },

  lore: {
    list: (bookId: string) => req<Record<string, string>>(`/books/${bookId}/lore`),
    update: (bookId: string, filename: string, content: string) =>
      req<{ ok: boolean }>(`/books/${bookId}/lore/${filename}`, { method: 'PUT', ...json({ content }) }),
    enhanceQuestions: (bookId: string) =>
      req<{ questions: Array<{ key: string; question: string; context: string; loreFile: string }> }>(
        `/books/${bookId}/enhance-lore/questions`, { method: 'POST' }),
  },

  writingInstructions: {
    get: (bookId: string) => req<{ content: string | null }>(`/books/${bookId}/writing-instructions`),
    update: (bookId: string, content: string) =>
      req<{ ok: boolean }>(`/books/${bookId}/writing-instructions`, { method: 'PUT', ...json({ content }) }),
  },

  jobs: {
    list: () => req<ChapterJob[]>('/jobs'),
    get: (id: string) => req<ChapterJob>(`/jobs/${id}`),
    delete: (id: string) => req<{ ok: boolean }>(`/jobs/${id}`, { method: 'DELETE' }),
  },

  config: {
    get: () => req<InkaiConfig>('/config'),
    update: (data: Partial<InkaiConfig>) =>
      req<{ ok: boolean }>('/config', { method: 'PUT', ...json(data) }),
  },
};

// ── SSE streaming helper ────────────────────────────────────────

export interface SSEHandle {
  on(event: string, cb: (data: unknown) => void): SSEHandle;
  cancel(): void;
}

export function streamSSE(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
): SSEHandle {
  const listeners = new Map<string, Array<(data: unknown) => void>>();
  const ctrl = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        let ev = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) { ev = line.slice(7).trim(); }
          else if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6)) as unknown;
              listeners.get(ev)?.forEach(cb => cb(d));
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        listeners.get('error')?.forEach(cb => cb({ message: String(e) }));
      }
    }
  })();

  const handle: SSEHandle = {
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
      return handle;
    },
    cancel() { ctrl.abort(); },
  };
  return handle;
}
