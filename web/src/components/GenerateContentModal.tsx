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
  hasExisting?: boolean;
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
    title: 'Character Sheets',
    description: 'AI will build detailed character sheets with arc state, relationships, tensions, and motivations from all available story data.',
  },
};

export default function GenerateContentModal({ book, type, hasExisting, onClose }: Props) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<'confirm' | 'generating' | 'done' | 'error'>('confirm');
  const [authorGuidance, setAuthorGuidance] = useState('');
  // characters-specific: 'generate' (new from lore) | 'extend' (update existing)
  const [charactersMode, setCharactersMode] = useState<'generate' | 'extend'>('generate');
  const [error, setError] = useState('');
  const cfg = CONFIG[type];

  const isCharacters = type === 'characters';

  const start = () => setPhase('generating');

  const ssePath = isCharacters && charactersMode === 'extend'
    ? `/books/${book.id}/characters/extend`
    : `/books/${book.id}/${type}`;

  const body: Record<string, unknown> = {};
  if (type === 'story-arc' && authorGuidance.trim()) {
    body.authorGuidance = authorGuidance.trim();
  }
  if (isCharacters) {
    if (charactersMode === 'generate' && authorGuidance.trim()) {
      body.authorGuidance = authorGuidance.trim();
    }
    if (charactersMode === 'extend' && authorGuidance.trim()) {
      body.authorChanges = authorGuidance.trim();
    }
  }

  const generateLabel = isCharacters && charactersMode === 'extend' ? 'Extend' : 'Generate';

  return (
    <Modal title={cfg.title} onClose={phase === 'generating' ? undefined : onClose} size="md">
      {phase === 'confirm' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed">{cfg.description}</p>

          {/* Characters mode selector — only when file already exists */}
          {isCharacters && hasExisting && (
            <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
              <button
                onClick={() => { setCharactersMode('extend'); setAuthorGuidance(''); }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${charactersMode === 'extend' ? 'bg-violet-600/30 text-violet-300' : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'}`}
              >
                Extend current
              </button>
              <button
                onClick={() => { setCharactersMode('generate'); setAuthorGuidance(''); }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${charactersMode === 'generate' ? 'bg-violet-600/30 text-violet-300' : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'}`}
              >
                Generate new file
              </button>
            </div>
          )}

          {/* Guidance / changes textarea for relevant types */}
          {(cfg.guidanceLabel || isCharacters) && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                {isCharacters
                  ? (charactersMode === 'extend' ? 'Describe what to add or change' : 'Author guidance (optional)')
                  : cfg.guidanceLabel}
              </label>
              <textarea
                className="w-full bg-ink-700 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors resize-none"
                rows={3}
                value={authorGuidance}
                onChange={e => setAuthorGuidance(e.target.value)}
                placeholder={
                  isCharacters
                    ? (charactersMode === 'extend'
                      ? 'e.g. "Add a new villain called Maren" or "Update Elena\'s arc — she\'s no longer the hero"'
                      : 'e.g. "Focus on character tensions" or "Include the mysterious stranger from chapter 3"')
                    : cfg.guidancePlaceholder
                }
              />
              {isCharacters && charactersMode === 'extend' && !authorGuidance.trim() && (
                <p className="text-xs text-amber-400">Required for extending — describe what to add or change.</p>
              )}
            </div>
          )}

          {/* Overwrite warning — only for generate new */}
          {(!isCharacters || charactersMode === 'generate') && (
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-300">
                This will overwrite the existing {type === 'story-arc' ? 'story-arc.md' : type === 'timeline' ? 'timeline.md' : 'characters.md'} lore file if it exists.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={start}
              disabled={isCharacters && charactersMode === 'extend' && !authorGuidance.trim()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generateLabel}
            </button>
          </div>
        </div>
      )}

      {phase === 'generating' && (
        <div className="space-y-4">
          <SSEProgress
            path={ssePath}
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
          <p className="text-sm font-medium text-white">
            {isCharacters && charactersMode === 'extend' ? 'Extended successfully!' : 'Generated successfully!'}
          </p>
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
