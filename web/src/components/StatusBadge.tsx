import type { CSSProperties } from 'react';
import type { BookStatus } from '../types';

const MAP: Record<BookStatus, { label: string; style: CSSProperties; dotStyle: CSSProperties; pulse?: boolean }> = {
  'new': {
    label: 'New',
    style: { background: 'var(--semantic-info-bg)', color: 'var(--semantic-info-text)', borderColor: 'var(--semantic-info-border)' },
    dotStyle: { background: 'var(--semantic-info-dot)' },
  },
  'initial-processing': {
    label: 'Setting up',
    style: { background: 'var(--semantic-warning-bg)', color: 'var(--semantic-warning-text)', borderColor: 'var(--semantic-warning-border)' },
    dotStyle: { background: 'var(--semantic-warning-dot)' },
    pulse: true,
  },
  'work-in-progress': {
    label: 'In progress',
    style: { background: 'var(--semantic-success-bg)', color: 'var(--semantic-success-text)', borderColor: 'var(--semantic-success-border)' },
    dotStyle: { background: 'var(--semantic-success-dot)' },
  },
  'completed': {
    label: 'Completed',
    style: { background: 'var(--accent-soft)', color: 'var(--accent-strong)', borderColor: 'var(--accent-border)' },
    dotStyle: { background: 'var(--accent)' },
  },
  'archived': {
    label: 'Archived',
    style: { background: 'var(--semantic-neutral-bg)', color: 'var(--semantic-neutral-text)', borderColor: 'var(--semantic-neutral-border)' },
    dotStyle: { background: 'var(--semantic-neutral-dot)' },
  },
  'on-hold': {
    label: 'On hold',
    style: { background: 'var(--semantic-orange-bg)', color: 'var(--semantic-orange-text)', borderColor: 'var(--semantic-orange-border)' },
    dotStyle: { background: 'var(--semantic-orange-dot)' },
  },
  'review': {
    label: 'Under review',
    style: { background: 'var(--semantic-cyan-bg)', color: 'var(--semantic-cyan-text)', borderColor: 'var(--semantic-cyan-border)' },
    dotStyle: { background: 'var(--semantic-cyan-dot)' },
  },
  'limbo': {
    label: 'Limbo',
    style: { background: 'var(--semantic-pink-bg)', color: 'var(--semantic-pink-text)', borderColor: 'var(--semantic-pink-border)' },
    dotStyle: { background: 'var(--semantic-pink-dot)' },
  },
};

export default function StatusBadge({
  status,
  compact = false,
}: {
  status: BookStatus;
  compact?: boolean;
}) {
  const s = MAP[status] ?? MAP.new;
  const wrapperClass = compact
    ? 'app-status-pill inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border'
    : 'app-status-pill inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border';
  const dotClass = compact
    ? `w-1.5 h-1.5 rounded-full ${s.pulse ? 'animate-pulse' : ''}`
    : `w-2 h-2 rounded-full ${s.pulse ? 'animate-pulse' : ''}`;

  return (
    <span className={wrapperClass} style={s.style}>
      <span className={dotClass} style={s.dotStyle} />
      {s.label}
    </span>
  );
}
