import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { useJobs, useDeleteJob } from '../hooks';
import { streamSSE } from '../api';
import type { ChapterJob } from '../types';

function JobStatusDot({ status }: { status: ChapterJob['status'] }) {
  const cls = {
    pending: 'bg-slate-500',
    running: 'bg-amber-400 animate-pulse',
    done: 'bg-emerald-400',
    failed: 'bg-red-400',
  }[status];
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

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
    <div className="bg-ink-950 rounded-xl border border-white/[0.06] p-4 max-h-64 overflow-y-auto">
      <div className="log-output text-slate-400">{log || 'Waiting for output…'}</div>
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
    <div className="bg-ink-800 border border-white/[0.07] rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <JobStatusDot status={job.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{job.bookTitle}</span>
            <span className="text-xs text-slate-500 shrink-0">Chapter {job.chapterNumber}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className={`text-xs capitalize font-medium ${
              { pending: 'text-slate-400', running: 'text-amber-300', done: 'text-emerald-400', failed: 'text-red-400' }[job.status]
            }`}>{job.status}</span>
            <span className="text-xs text-slate-600">{started}</span>
            {job.finishedAt && <span className="text-xs text-slate-600">→ {finished}</span>}
          </div>
        </div>

        {isActive && <Loader2 size={14} className="animate-spin text-amber-400 shrink-0" />}

        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {job.status === 'done' && (
            <button
              onClick={() => navigate(`/books/${job.bookId}/read/${job.chapterNumber}`)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-violet-600/15 hover:bg-violet-600/30 text-violet-300 transition-colors"
            >
              <ExternalLink size={11} /> Read
            </button>
          )}
          <button
            onClick={() => deleteJob.mutate(job.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Remove job"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04] pt-3">
          {job.error && (
            <div className="mb-3 px-3 py-2 bg-red-900/20 border border-red-500/20 rounded-lg text-xs text-red-300">
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
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">Background writing tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {activeCount} active
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {isLoading && <div className="text-slate-500 text-sm">Loading…</div>}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center py-16 text-slate-600">
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
