import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { BookOpen, Briefcase, Settings, Plus, ChevronRight, Bot } from 'lucide-react';
import { useState } from 'react';
import { useBooks, useJobs } from '../hooks';
import CreateBookWizard from './CreateBookWizard';
import MiniAgentModal from './MiniAgentModal';
import StatusBadge from './StatusBadge';
import type { BookRecord, ChapterJob } from '../types';

function SidebarBook({ book }: { book: BookRecord }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/books/${book.id}`)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-200 truncate">{book.title}</span>
        <ChevronRight size={13} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <StatusBadge status={book.status} compact />
        <span className="text-xs text-slate-500">{book.chapterCount} ch.</span>
      </div>
    </button>
  );
}

function SidebarJob({ job }: { job: ChapterJob }) {
  const navigate = useNavigate();
  const dotCls = {
    pending: 'bg-slate-500',
    running: 'bg-amber-400 animate-pulse',
    done: 'bg-emerald-400',
    failed: 'bg-red-400',
  }[job.status];

  return (
    <button
      onClick={() => job.status === 'done'
        ? navigate(`/books/${job.bookId}/read/${job.chapterNumber}`)
        : navigate('/jobs')
      }
      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
        <span className="text-xs text-slate-300 truncate flex-1">
          {job.bookTitle} — Ch.{job.chapterNumber}
        </span>
      </div>
      <span className="pl-3.5 text-[10px] text-slate-600 capitalize">{job.status}</span>
    </button>
  );
}

export default function Layout() {
  const { data: books = [] } = useBooks();
  const { data: jobs = [] } = useJobs(5000);
  const [showCreate, setShowCreate] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const location = useLocation();
  const bookIdMatch = location.pathname.match(/^\/books\/([^/]+)/);
  const currentBookId = bookIdMatch?.[1];
  const activeBooks = books.filter(b => b.status !== 'archived');
  const recentJobs = [...jobs]
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
    .slice(0, 3);
  const hasActiveJobs = jobs.some(j => j.status === 'running' || j.status === 'pending');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-white/[0.06] bg-ink-900 overflow-y-auto">
        {/* Logo */}
        <Link to="/" className="block px-4 py-5 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐙</span>
            <span className="text-lg font-bold text-white tracking-tight">inkai</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">AI Book Writing</p>
        </Link>

        {/* Books list */}
        <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Books</span>
            <button
              onClick={() => setShowCreate(true)}
              className="w-5 h-5 rounded bg-violet-600 hover:bg-violet-500 transition-colors flex items-center justify-center"
              title="New book"
            >
              <Plus size={12} className="text-white" />
            </button>
          </div>

          {activeBooks.length === 0 && (
            <p className="px-3 text-xs text-slate-600 py-2">No books yet.</p>
          )}

          {activeBooks.map(b => <SidebarBook key={b.id} book={b} />)}
        </div>

        {/* Nav */}
        <div className="border-t border-white/[0.06] px-2 py-3">
          {/* Recent jobs */}
          {recentJobs.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  Jobs
                  {hasActiveJobs && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                </span>
                <NavLink to="/jobs" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                  all →
                </NavLink>
              </div>
              <div className="space-y-0.5">
                {recentJobs.map(j => <SidebarJob key={j.id} job={j} />)}
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="space-y-0.5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <BookOpen size={15} /> Dashboard
          </NavLink>
          <NavLink
            to="/books"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <BookOpen size={15} /> Books
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Briefcase size={15} /> Jobs
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Settings size={15} /> Settings
          </NavLink>
          <button
            onClick={() => setShowAgent(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            <Bot size={15} /> Agent
          </button>
          </nav>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-ink-950">
        <Outlet />
      </main>

      {showCreate && <CreateBookWizard onClose={() => setShowCreate(false)} />}
      {showAgent && <MiniAgentModal bookId={currentBookId} onClose={() => setShowAgent(false)} />}
    </div>
  );
}
