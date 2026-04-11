import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from './Modal';
import SSEProgress from './SSEProgress';
import { keys } from '../hooks';
import type { BookRecord } from '../types';

type GenerationType = 'story-arc' | 'timeline' | 'characters';

interface Props {
  book: BookRecord;
  type: GenerationType;
  onClose: () => void;
}

const CONFIG: Record<GenerationType, {
  title: string;
  description: string;
  guidanceLabel?: string;
  guidancePlaceholder?: string;
}> = {
  'story-arc': {
    title: 'Generate Story Arc',
    description: 'AI will synthesize all your lore and chapter history into a structured story arc with plot beats, character development arcs, and thematic threads.',
    guidanceLabel: 'Author guidance (optional)',
    guidancePlaceholder: 'Any specific direction for the arc? e.g. "Focus on the redemption theme" or "The ending should be ambiguous"',
  },
  'timeline': {
    title: 'Generate Timeline',
    description: 'AI will build a chronological timeline from all lore files, chapter summaries, and notes — flagging any impossible sequencing.',
  },
  'characters': {
    title: 'Generate Character Sheets',
    description: 'AI will build detailed character sheets with arc state, relationships, tensions, and motivations from all available story data.',
  },
};

export default function GenerateContentModal({ book, type, onClose }: Props) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<'confirm' | 'generating' | 'done' | 'error'>('confirm');
  const [authorGuidance, setAuthorGuidance] = useState('');
  const [error, setError] = useState('');
  const cfg = CONFIG[type];

  const start = () => setPhase('generating');

  const body: Record<string, unknown> = {};
  if (type === 'story-arc' && authorGuidance.trim()) {
    body.authorGuidance = authorGuidance.trim();
  }

  return (
    <Modal title={cfg.title} onClose={phase === 'generating' ? undefined : onClose} size="md">
      {phase === 'confirm' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed">{cfg.description}</p>

          {cfg.guidanceLabel && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">{cfg.guidanceLabel}</label>
              <textarea
                className="w-full bg-ink-700 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors resize-none"
                rows={3}
                value={authorGuidance}
                onChange={e => setAuthorGuidance(e.target.value)}
                placeholder={cfg.guidancePlaceholder}
              />
            </div>
          )}

          <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-300">
              This will overwrite the existing {type === 'story-arc' ? 'story-arc.md' : type === 'timeline' ? 'timeline.md' : 'characters.md'} lore file if it exists.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={start} className="btn-primary">Generate</button>
          </div>
        </div>
      )}

      {phase === 'generating' && (
        <div className="space-y-4">
          <SSEProgress
            path={`/books/${book.id}/${type}`}
            method="POST"
            body={body}
            onDone={() => {
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
        <div className="space-y-4 text-center py-4">
          <div className="text-4xl">✅</div>
          <p className="text-sm font-medium text-white">Generated successfully!</p>
          <p className="text-xs text-slate-400">Saved to your book's lore files.</p>
          <button onClick={onClose} className="btn-primary">Done</button>
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
