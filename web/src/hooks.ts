import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const keys = {
  books: ['books'] as const,
  book: (id: string) => ['books', id] as const,
  chapters: (bookId: string) => ['chapters', bookId] as const,
  chapter: (bookId: string, n: number) => ['chapter', bookId, n] as const,
  review: (bookId: string, n: number) => ['review', bookId, n] as const,
  chapterNotes: (bookId: string, n: number) => ['chapter-notes', bookId, n] as const,
  lore: (bookId: string) => ['lore', bookId] as const,
  writingInstructions: (bookId: string) => ['writing-instructions', bookId] as const,
  gitStatus: (bookId: string) => ['git', bookId] as const,
  jobs: ['jobs'] as const,
  job: (id: string) => ['jobs', id] as const,
  config: ['config'] as const,
};

export const useBooks = () => useQuery({ queryKey: keys.books, queryFn: api.books.list });

export const useBook = (id: string) =>
  useQuery({ queryKey: keys.book(id), queryFn: () => api.books.get(id), enabled: !!id });

export const useChapters = (bookId: string) =>
  useQuery({ queryKey: keys.chapters(bookId), queryFn: () => api.chapters.list(bookId), enabled: !!bookId });

export const useChapter = (bookId: string, n: number) =>
  useQuery({ queryKey: keys.chapter(bookId, n), queryFn: () => api.chapters.get(bookId, n), enabled: !!bookId && n > 0 });

export const useReview = (bookId: string, n: number, enabled = false) =>
  useQuery({ queryKey: keys.review(bookId, n), queryFn: () => api.chapters.getReview(bookId, n), enabled });

export const useChapterNotes = (bookId: string, n: number) =>
  useQuery({
    queryKey: keys.chapterNotes(bookId, n),
    queryFn: () => api.chapters.getNotes(bookId, n).then(r => r.content).catch(() => ''),
    enabled: !!bookId && n > 0,
  });

export function useUpdateChapterNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, number, content }: { bookId: string; number: number; content: string }) =>
      api.chapters.updateNotes(bookId, number, content),
    onSuccess: (_r, { bookId, number }) => {
      qc.invalidateQueries({ queryKey: keys.chapterNotes(bookId, number) });
      qc.invalidateQueries({ queryKey: keys.chapters(bookId) });
    },
  });
}

export const useLore = (bookId: string) =>
  useQuery({ queryKey: keys.lore(bookId), queryFn: () => api.lore.list(bookId), enabled: !!bookId });

export const useWritingInstructions = (bookId: string) =>
  useQuery({ queryKey: keys.writingInstructions(bookId), queryFn: () => api.writingInstructions.get(bookId), enabled: !!bookId });

export const useJobs = (refetchInterval?: number) =>
  useQuery({ queryKey: keys.jobs, queryFn: api.jobs.list, refetchInterval });

export const useJob = (id: string, refetchInterval?: number) =>
  useQuery({ queryKey: keys.job(id), queryFn: () => api.jobs.get(id), enabled: !!id, refetchInterval });

export const useConfig = () =>
  useQuery({ queryKey: keys.config, queryFn: api.config.get });

export const useGitStatus = (bookId: string, enabled = false) =>
  useQuery({ queryKey: keys.gitStatus(bookId), queryFn: () => api.git.status(bookId), enabled, staleTime: 10_000 });

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<import('./types').BookRecord> }) =>
      api.books.update(id, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: keys.books });
      qc.invalidateQueries({ queryKey: keys.book(id) });
    },
  });
}

export function useArchiveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.books.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.books }),
  });
}

export function useUnarchiveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.books.unarchive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.books }),
  });
}

export function useUpdateLore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, filename, content }: { bookId: string; filename: string; content: string }) =>
      api.lore.update(bookId, filename, content),
    onSuccess: (_r, { bookId }) => qc.invalidateQueries({ queryKey: keys.lore(bookId) }),
  });
}

export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, number, content }: { bookId: string; number: number; content: string }) =>
      api.chapters.update(bookId, number, content),
    onSuccess: (_r, { bookId, number }) => {
      qc.invalidateQueries({ queryKey: keys.chapter(bookId, number) });
      qc.invalidateQueries({ queryKey: keys.chapters(bookId) });
    },
  });
}

export function useDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, number }: { bookId: string; number: number }) =>
      api.chapters.delete(bookId, number),
    onSuccess: (_r, { bookId }) => {
      qc.invalidateQueries({ queryKey: keys.book(bookId) });
      qc.invalidateQueries({ queryKey: keys.chapters(bookId) });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.jobs.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.jobs }),
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('./types').InkaiConfig>) => api.config.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.config }),
  });
}
