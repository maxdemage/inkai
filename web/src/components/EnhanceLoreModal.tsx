import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import Modal from './Modal';
import SSEProgress from './SSEProgress';
import { api } from '../api';
import { keys } from '../hooks';
import type { BookRecord } from '../types';

interface EnhanceQuestion {
  key: string;
  question: string;
  context: string;
  loreFile: string;
}

interface Props {
  book: BookRecord;
  onClose: () => void;
}

export default function EnhanceLoreModal({ book, onClose }: Props) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<'loading' | 'questions' | 'applying' | 'done' | 'error'>('loading');
  const [questions, setQuestions] = useState<EnhanceQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [changes, setChanges] = useState<string[]>([]);

  useEffect(() => {
    api.lore.enhanceQuestions(book.id)
      .then(({ questions: qs }) => {
        setQuestions(qs);
        setPhase('questions');
      })
      .catch(e => {
        setError(String(e));
        setPhase('error');
      });
  }, [book.id]);

  const applyEnhancements = () => setPhase('applying');

  return (
    <Modal
      title="Enhance Lore"
      onClose={phase === 'applying' ? undefined : onClose}
      size="lg"
    >
      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-10 app-text-muted">
          <Loader2 size={24} className="animate-spin text-[color:var(--accent)]" />
          <p className="text-sm">Analysing your lore and generating targeted questions…</p>
        </div>
      )}

      {phase === 'questions' && (
        <div className="space-y-4">
          <p className="text-sm app-text-muted">
            Answer these AI-generated questions to deepen your world, characters, and story.
            Leave blank to skip.
          </p>

          {questions.map(q => (
            <div key={q.key} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <label className="text-sm font-medium app-text">{q.question}</label>
                <span className="text-xs app-text-faint shrink-0">{q.loreFile}</span>
              </div>
              {q.context && (
                <p className="text-xs app-text-faint italic">{q.context}</p>
              )}
              <textarea
                className="w-full app-input rounded-lg px-3 py-2 text-sm resize-none"
                rows={2}
                value={answers[q.key] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                placeholder="Optional…"
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={applyEnhancements} className="btn-primary flex items-center gap-2">
              <Sparkles size={14} /> Apply Enhancements
            </button>
          </div>
        </div>
      )}

      {phase === 'applying' && (
        <div className="space-y-4">
          <p className="text-sm app-text-muted">Applying your answers to the lore files with AI assistance…</p>
          <SSEProgress
            path={`/books/${book.id}/enhance-lore/apply`}
            method="POST"
            body={{ answers }}
            onDone={(d) => {
              const data = d as { changes?: string[] };
              setChanges(data.changes ?? []);
              qc.invalidateQueries({ queryKey: keys.lore(book.id) });
              setPhase('done');
            }}
            onError={(msg) => {
              setError(msg);
              setPhase('error');
            }}
          />
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4 py-2 text-center">
          <div className="text-4xl">✨</div>
          <p className="text-sm font-medium app-text-primary">Lore enhanced!</p>
          {changes.length > 0 && (
            <ul className="text-sm app-text-muted text-left space-y-1 max-w-sm mx-auto">
              {changes.map((c, i) => <li key={i} className="flex gap-2"><span className="text-[color:var(--accent)]">·</span>{c}</li>)}
            </ul>
          )}
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-4 py-2">
          <p className="text-sm app-text-danger">{error}</p>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      )}
    </Modal>
  );
}
