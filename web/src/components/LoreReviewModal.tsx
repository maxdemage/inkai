import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import SSEProgress from './SSEProgress';
import { keys } from '../hooks';
import type { BookRecord } from '../types';

interface FileChange {
  file: string;
  changes: string[];
}

interface ReviewResult {
  fileChanges: FileChange[];
  summary: string;
}

interface Props {
  book: BookRecord;
  onClose: () => void;
}

export default function LoreReviewModal({ book, onClose }: Props) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<'confirm' | 'reviewing' | 'done' | 'error'>('confirm');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [updatedFiles, setUpdatedFiles] = useState<string[]>([]);
  const [error, setError] = useState('');

  return (
    <Modal
      title="Lore Review"
      onClose={phase === 'reviewing' ? undefined : onClose}
      size="md"
    >
      {phase === 'confirm' && (
        <div className="space-y-4">
          <p className="text-sm app-text-muted leading-relaxed">
            AI will review all your lore files for contradictions, gaps, and inconsistencies —
            then apply fixes file by file using the medium LLM.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={() => setPhase('reviewing')}
              className="btn-primary flex items-center gap-2"
            >
              <ShieldCheck size={14} /> Run Lore Review
            </button>
          </div>
        </div>
      )}

      {phase === 'reviewing' && (
        <div className="space-y-4">
          <p className="text-sm app-text-muted">Reviewing all lore files and applying corrections…</p>
          <SSEProgress
            path={`/books/${book.id}/lore-review`}
            method="POST"
            onDone={(d) => {
              const data = d as { review: ReviewResult; updatedFiles: Record<string, string> };
              setReview(data.review);
              setUpdatedFiles(Object.keys(data.updatedFiles ?? {}));
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

      {phase === 'done' && review && (
        <div className="space-y-4 py-2">
          <div className="text-center">
            <div className="text-3xl mb-2">{review.fileChanges?.length ? '🔍' : '✅'}</div>
            <p className="text-sm font-medium app-text-primary">
              {review.fileChanges?.length
                ? `Updated ${updatedFiles.length} lore file(s)`
                : 'No issues found — lore is in great shape!'}
            </p>
          </div>

          {review.summary && (
            <div className="app-panel rounded-xl px-4 py-3 text-sm app-text-muted leading-relaxed">
              {review.summary}
            </div>
          )}

          {review.fileChanges?.length > 0 && (
            <div className="space-y-2">
              {review.fileChanges.map(fc => (
                <div key={fc.file} className="app-panel rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-[color:var(--accent)] mb-1">{fc.file}</p>
                  <ul className="space-y-0.5">
                    {fc.changes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs app-text-muted">
                        <span className="app-text-faint shrink-0">·</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="btn-primary">Done</button>
          </div>
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
