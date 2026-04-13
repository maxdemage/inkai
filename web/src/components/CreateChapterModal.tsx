import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, ChevronRight, Info } from 'lucide-react';
import Modal from './Modal';
import { api } from '../api';
import { keys } from '../hooks';
import type { BookRecord } from '../types';

interface Props {
  book: BookRecord;
  onClose: () => void;
  onJobStarted: (jobId: string, chapterNumber: number) => void;
}

export default function CreateChapterModal({ book, onClose, onJobStarted }: Props) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<'setup' | 'loading' | 'ready' | 'creating' | 'done' | 'error'>('setup');
  const [suggestion, setSuggestion] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [writingInstructions, setWritingInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');
  const nextChapter = book.chapterCount + 1;

  useEffect(() => {
    // Load AI suggestion and existing writing instructions in parallel
    setPhase('loading');
    Promise.all([
      api.chapters.suggest(book.id).catch(() => ({ suggestion: '' })),
      api.writingInstructions.get(book.id).catch(() => ({ content: null })),
    ]).then(([sugResult, instrResult]) => {
      setSuggestion(sugResult.suggestion);
      if (!instrResult.content && book.chapterCount === 0) {
        setShowInstructions(true);
      }
      if (instrResult.content) {
        setWritingInstructions(instrResult.content);
      }
      setPhase('ready');
    }).catch(() => setPhase('ready'));
  }, [book.id, book.chapterCount]);

  const startCreating = async () => {
    if (!guidelines.trim()) {
      setError('Please provide guidelines for this chapter.');
      return;
    }
    setError('');
    setPhase('creating');
    try {
      const result = await api.chapters.create(book.id, {
        guidelines: guidelines.trim(),
        writingInstructions: writingInstructions.trim() || undefined,
      });
      setPlan(result.plan);
      qc.invalidateQueries({ queryKey: keys.jobs });
      qc.invalidateQueries({ queryKey: keys.chapters(book.id) });
      onJobStarted(result.jobId, result.chapterNumber);
      setPhase('done');
    } catch (e) {
      setError(String(e));
      setPhase('error');
    }
  };

  return (
    <Modal
      title={`Write Chapter ${nextChapter}`}
      onClose={phase === 'creating' ? undefined : onClose}
      size="lg"
    >
      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-10 app-text-muted">
          <Loader2 size={24} className="animate-spin text-[color:var(--accent)]" />
          <p className="text-sm">Loading context & AI suggestion…</p>
        </div>
      )}

      {(phase === 'ready' || phase === 'error') && (
        <div className="space-y-4">
          {/* AI suggestion */}
          {suggestion && (
            <div className="app-accent-soft rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--accent-strong)] uppercase tracking-wider">
                <Sparkles size={12} /> AI Suggestion
              </div>
              <p className="text-sm app-text leading-relaxed">{suggestion}</p>
              <button
                onClick={() => setGuidelines(suggestion)}
                className="text-xs app-link transition-colors"
              >
                Use this suggestion →
              </button>
            </div>
          )}

          {/* Guidelines */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium app-text">
              Chapter guidelines
              <span className="app-text-danger ml-0.5">*</span>
            </label>
            <p className="text-xs app-text-faint">What should happen in this chapter? Key events, who's involved, tone.</p>
            <textarea
              className="w-full app-input rounded-lg px-3 py-2.5 text-sm resize-none"
              rows={5}
              value={guidelines}
              onChange={e => setGuidelines(e.target.value)}
              placeholder="In this chapter, the protagonist discovers the hidden map inside the old lighthouse. They meet the mysterious sailor who warns them about the curse…"
            />
          </div>

          {/* Writing instructions */}
          <div className="space-y-1.5">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-1.5 text-xs app-text-muted hover:text-[color:var(--text)] transition-colors"
            >
              <Info size={12} />
              {showInstructions ? 'Hide' : 'Show'} writing instructions
              {writingInstructions && ' (set)'}
            </button>
            {showInstructions && (
              <>
                <p className="text-xs app-text-faint">
                  Guide the AI on chapter length, style, POV, pacing, etc. Saved for all future chapters.
                </p>
                <textarea
                  className="w-full app-input rounded-lg px-3 py-2.5 text-sm resize-none"
                  rows={4}
                  value={writingInstructions}
                  onChange={e => setWritingInstructions(e.target.value)}
                  placeholder="Write chapters of about 3000 words. Use third-person limited POV. Each chapter should end with a hook. Maintain a melancholic atmospheric tone…"
                />
              </>
            )}
          </div>

          {error && (
            <p className="text-sm app-text-danger px-1">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={startCreating} className="btn-primary flex items-center gap-2">
              <Sparkles size={14} /> Start Writing
            </button>
          </div>
        </div>
      )}

      {phase === 'creating' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 size={30} className="animate-spin text-[color:var(--accent)]" />
          <div className="text-center">
            <p className="text-sm font-medium app-text-primary">Planning Chapter {nextChapter}…</p>
            <p className="text-xs app-text-faint mt-1">Building a detailed plan, then spawning background writer</p>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 app-text-success">
            <ChevronRight size={16} />
            <span className="text-sm font-medium">Chapter {nextChapter} is being written in the background</span>
          </div>
          {plan && (
            <div className="app-panel-strong rounded-xl p-4">
              <p className="text-xs font-semibold app-text-muted uppercase tracking-wider mb-2">Chapter Plan</p>
              <div className="text-sm app-text whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{plan}</div>
            </div>
          )}
          <p className="text-xs app-text-faint">
            Check the <strong className="app-text">Jobs</strong> tab to monitor progress. The chapter will appear when writing completes.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-primary">Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
