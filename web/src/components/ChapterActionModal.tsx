import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from './Modal';
import SSEProgress from './SSEProgress';
import { keys } from '../hooks';
import type { BookRecord, ReviewType, ReviewPersona } from '../types';
import { REVIEW_TYPES, REVIEW_PERSONAS } from '../types';

type ActionType = 'review' | 'rewrite';

interface Props {
  book: BookRecord;
  chapterNumber: number;
  action: ActionType;
  onClose: () => void;
  onDone?: () => void;
}

export default function ChapterActionModal({ book, chapterNumber, action, onClose, onDone }: Props) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<'confirm' | 'running' | 'done' | 'error'>('confirm');
  const [error, setError] = useState('');
  const [reviewType, setReviewType] = useState<ReviewType>('full');
  const [reviewPersona, setReviewPersona] = useState<ReviewPersona | ''>('');

  const isReview = action === 'review';

  const body: Record<string, unknown> = {};
  if (isReview) {
    body.reviewType = reviewType;
    if (reviewPersona) body.reviewPersona = reviewPersona;
  }

  const start = () => setPhase('running');

  return (
    <Modal
      title={isReview ? `Review Chapter ${chapterNumber}` : `Rewrite Chapter ${chapterNumber}`}
      onClose={phase === 'running' ? undefined : onClose}
      size="md"
    >
      {phase === 'confirm' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            {isReview
              ? `AI will review Chapter ${chapterNumber} against your lore and style guide.`
              : `AI will rewrite Chapter ${chapterNumber} incorporating all critical feedback from the review. The current version will be overwritten.`
            }
          </p>

          {isReview && (
            <>
              {/* Review type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Review type</label>
                <div className="space-y-1.5">
                  {REVIEW_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setReviewType(t.value)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${reviewType === t.value ? 'bg-violet-600/20 border-violet-500/40 text-violet-200' : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:bg-white/[0.06]'}`}
                    >
                      <span className="font-medium">{t.label}</span>
                      <span className="text-xs text-slate-500 ml-2">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reviewer persona */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Reviewer persona</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setReviewPersona('')}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition-colors ${reviewPersona === '' ? 'bg-violet-600/20 border-violet-500/40 text-violet-200' : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:bg-white/[0.06]'}`}
                  >
                    Default
                  </button>
                  {REVIEW_PERSONAS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setReviewPersona(p.value)}
                      title={p.description}
                      className={`px-3 py-1.5 rounded-xl border text-xs transition-colors ${reviewPersona === p.value ? 'bg-violet-600/20 border-violet-500/40 text-violet-200' : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:bg-white/[0.06]'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {reviewPersona && (
                  <p className="text-xs text-slate-500">{REVIEW_PERSONAS.find(p => p.value === reviewPersona)?.description}</p>
                )}
              </div>
            </>
          )}

          {!isReview && (
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-300">
                If no review exists yet, a review will be generated first, then the rewrite will proceed.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={start} className="btn-primary">
              {isReview ? 'Start Review' : 'Start Rewrite'}
            </button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <SSEProgress
          path={`/books/${book.id}/chapters/${chapterNumber}/${action}`}
          method="POST"
          body={body}
          onDone={() => {
            qc.invalidateQueries({ queryKey: keys.chapters(book.id) });
            qc.invalidateQueries({ queryKey: keys.review(book.id, chapterNumber) });
            qc.invalidateQueries({ queryKey: keys.chapter(book.id, chapterNumber) });
            onDone?.();
            setPhase('done');
          }}
          onError={(msg) => {
            setError(msg);
            setPhase('error');
          }}
        />
      )}

      {phase === 'done' && (
        <div className="space-y-3 text-center py-4">
          <div className="text-4xl">{isReview ? '📝' : '✨'}</div>
          <p className="text-sm font-medium text-white">
            {isReview ? 'Review complete!' : 'Rewrite complete!'}
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={onClose} className="btn-ghost">Close</button>
            <button onClick={onDone ?? onClose} className="btn-primary">
              {isReview ? 'Read Review' : 'Read Chapter'}
            </button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-4 py-2">
          <p className="text-sm text-red-300">{error}</p>
          <div className="flex gap-3">
            <button onClick={() => setPhase('confirm')} className="btn-ghost">Try Again</button>
            <button onClick={onClose} className="btn-ghost">Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
