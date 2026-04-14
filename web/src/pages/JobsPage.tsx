import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { useJobs, useDeleteJob } from '../hooks';
import { streamSSE } from '../api';
import type { ChapterJob } from '../types';

function JobStatusDot({ status }: { status: ChapterJob['status'] }) {
  const style = {
    pending: { background: 'var(--semantic-neutral-dot)' },
    running: { background: 'var(--semantic-warning-dot)' },
    done: { background: 'var(--semantic-success-dot)' },
    failed: { background: 'var(--semantic-danger-dot)' },
  }[status];
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${status === 'running' ? 'animate-pulse' : ''}`} style={style} />;
}

const JOB_STATUS_STYLE: Record<ChapterJob['status'], { color: string }> = {
  pending: { color: 'var(--semantic-neutral-text)' },
  running: { color: 'var(--semantic-warning-text)' },
  done: { color: 'var(--semantic-success-text)' },
  failed: { color: 'var(--semantic-danger-text)' },
};

function JobLogPanel({ jobId }: { jobId: string }) {
  const [log, setLog] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = streamSSE(`/jobs/${jobId}/log`, 'GET');
    handle
      .on('log', (d) => {
        const text = (d as { text?: string }).text ?? '';
        setLog(prev => prev + text);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
      })
      .on('done', () => { /* stream finished */ });
    return () => handle.cancel();
  }, [jobId]);

  return (
    <div className="app-panel-strong rounded-xl p-4 max-h-64 overflow-y-auto">
      <div className="log-output app-text-muted">{log || 'Waiting for output…'}</div>
      <div ref={bottomRef} />
    </div>
  );
}

function JobRow({ job }: { job: ChapterJob }) {
  const navigate = useNavigate();
  const deleteJob = useDeleteJob();
  const [expanded, setExpanded] = useState(false);

  const started = job.startedAt ? new Date(job.startedAt).toLocaleString() : '—';
  const finished = job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '—';
  const isActive = job.status === 'running' || job.status === 'pending';

  return (
    <div className="app-panel rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[color:var(--surface-muted)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <JobStatusDot status={job.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium app-text-primary truncate">{job.bookTitle}</span>
            <span className="text-xs app-text-faint shrink-0">Chapter {job.chapterNumber}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs capitalize font-medium" style={JOB_STATUS_STYLE[job.status]}>
              {job.status}
            </span>
            <span className="text-xs app-text-faint">{started}</span>
            {job.finishedAt && <span className="text-xs app-text-faint">→ {finished}</span>}
          </div>
        </div>

        {isActive && <Loader2 size={14} className="animate-spin shrink-0 app-text-warning" />}

        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {job.status === 'done' && (
            <button
              onClick={() => navigate(`/books/${job.bookId}/read/${job.chapterNumber}`)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg app-accent-soft transition-colors"
            >
              <ExternalLink size={11} /> Read
            </button>
          )}
          <button
            onClick={() => deleteJob.mutate(job.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center app-danger-button transition-colors"
            title="Remove job"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t app-divider pt-3">
          {job.error && (
            <div className="mb-3 px-3 py-2 app-danger rounded-lg text-xs">
              {job.error}
            </div>
          )}
          <JobLogPanel jobId={job.id} />
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  const { data: jobs = [], isLoading, refetch } = useJobs(
    // poll every 3s if there are active jobs
    undefined,
  );
  const activeCount = jobs.filter(j => j.status === 'running' || j.status === 'pending').length;

  // Auto-refetch while jobs are active
  useEffect(() => {
    if (activeCount === 0) return;
    const t = setInterval(() => refetch(), 3000);
    return () => clearInterval(t);
  }, [activeCount, refetch]);

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold app-text-primary">Jobs</h1>
          <p className="text-sm app-text-muted mt-1">Background writing tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs app-warning-pill rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--semantic-warning-dot)' }} />
              {activeCount} active
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="w-8 h-8 rounded-xl flex items-center justify-center app-ghost-button transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {isLoading && <div className="app-text-faint text-sm">Loading…</div>}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center py-16 app-text-faint">
          <Loader2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No jobs yet.</p>
          <p className="text-xs mt-1">Jobs appear here when you write a chapter.</p>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map(job => <JobRow key={job.id} job={job} />)}
      </div>
    </div>
  );
}
