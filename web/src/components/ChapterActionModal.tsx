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
  const [authorNotes, setAuthorNotes] = useState('');

  const isReview = action === 'review';

  const body: Record<string, unknown> = {};
  if (isReview) {
    body.reviewType = reviewType;
    if (reviewPersona) body.reviewPersona = reviewPersona;
  } else {
    if (authorNotes.trim()) body.authorNotes = authorNotes.trim();
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
          <p className="text-sm app-text-muted">
            {isReview
              ? `AI will review Chapter ${chapterNumber} against your lore and style guide.`
              : `AI will rewrite Chapter ${chapterNumber} incorporating all critical feedback from the review. The current version will be overwritten.`
            }
          </p>

          {isReview && (
            <>
              {/* Review type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold app-text-muted uppercase tracking-wider">Review type</label>
                <div className="space-y-1.5">
                  {REVIEW_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setReviewType(t.value)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${reviewType === t.value ? 'app-accent-soft' : 'app-ghost-button app-divider'}`}
                    >
                      <span className="font-medium">{t.label}</span>
                      <span className="text-xs app-text-faint ml-2">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reviewer persona */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold app-text-muted uppercase tracking-wider">Reviewer persona</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setReviewPersona('')}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition-colors ${reviewPersona === '' ? 'app-accent-soft' : 'app-ghost-button app-divider app-text-muted'}`}
                  >
                    Default
                  </button>
                  {REVIEW_PERSONAS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setReviewPersona(p.value)}
                      title={p.description}
                      className={`px-3 py-1.5 rounded-xl border text-xs transition-colors ${reviewPersona === p.value ? 'app-accent-soft' : 'app-ghost-button app-divider app-text-muted'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {reviewPersona && (
                  <p className="text-xs app-text-faint">{REVIEW_PERSONAS.find(p => p.value === reviewPersona)?.description}</p>
                )}
              </div>
            </>
          )}

          {!isReview && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold app-text-muted uppercase tracking-wider">Additional instructions <span className="normal-case app-text-faint font-normal">(optional)</span></label>
                <textarea
                  className="w-full app-input rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  rows={3}
                  value={authorNotes}
                  onChange={e => setAuthorNotes(e.target.value)}
                  placeholder="e.g. Make the dialogue more tense. Expand the fight scene. End on a cliffhanger."
                />
              </div>
              <div className="app-warning rounded-lg p-3">
                <p className="text-xs">
                  If no review exists yet, a review will be generated first, then the rewrite will proceed.
                </p>
              </div>
            </>
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
          <p className="text-sm font-medium app-text-primary">
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
          <p className="text-sm app-text-danger">{error}</p>
          <div className="flex gap-3">
            <button onClick={() => setPhase('confirm')} className="btn-ghost">Try Again</button>
            <button onClick={onClose} className="btn-ghost">Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
