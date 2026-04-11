import type { BookStatus } from '../types';

const MAP: Record<BookStatus, { label: string; classes: string; dot: string }> = {
  'new': {
    label: 'New',
    classes: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  'initial-processing': {
    label: 'Setting up',
    classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400 animate-pulse',
  },
  'work-in-progress': {
    label: 'In progress',
    classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  'completed': {
    label: 'Completed',
    classes: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    dot: 'bg-violet-400',
  },
  'archived': {
    label: 'Archived',
    classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-500',
  },
  'on-hold': {
    label: 'On hold',
    classes: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400',
  },
  'review': {
    label: 'Under review',
    classes: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-400',
  },
  'limbo': {
    label: 'Limbo',
    classes: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    dot: 'bg-pink-400',
  },
};

export default function StatusBadge({
  status,
  compact = false,
}: {
  status: BookStatus;
  compact?: boolean;
}) {
  const s = MAP[status] ?? MAP['new'];
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${s.classes}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${s.classes}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
