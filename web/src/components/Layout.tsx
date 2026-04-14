import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { BookOpen, Briefcase, Settings, Plus, ChevronRight, Bot } from 'lucide-react';
import { useState, createContext, useCallback } from 'react';
import { useBooks, useJobs } from '../hooks';
import CreateBookWizard from './CreateBookWizard';
import MiniAgentModal from './MiniAgentModal';
import StatusBadge from './StatusBadge';
import type { BookRecord, ChapterJob } from '../types';

interface AgentContextValue {
  openAgent: (query?: string) => void;
}
export const AgentContext = createContext<AgentContextValue>({ openAgent: () => {} });

function SidebarBook({ book }: { book: BookRecord }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/books/${book.id}`)}
      className="w-full text-left px-3 py-2 rounded-lg app-ghost-button group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium app-text-primary truncate">{book.title}</span>
        <ChevronRight size={13} className="app-text-faint group-hover:text-[color:var(--text-muted)] shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <StatusBadge status={book.status} compact />
        <span className="text-xs app-text-faint">{book.chapterCount} ch.</span>
      </div>
    </button>
  );
}

function SidebarJob({ job }: { job: ChapterJob }) {
  const navigate = useNavigate();
  const dotStyle = {
    pending: { background: 'var(--semantic-neutral-dot)' },
    running: { background: 'var(--semantic-warning-dot)' },
    done: { background: 'var(--semantic-success-dot)' },
    failed: { background: 'var(--semantic-danger-dot)' },
  }[job.status];

  return (
    <button
      onClick={() => job.status === 'done'
        ? navigate(`/books/${job.bookId}/read/${job.chapterNumber}`)
        : navigate('/jobs')
      }
      className="w-full text-left px-3 py-1.5 rounded-lg app-ghost-button group"
    >
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${job.status === 'running' ? 'animate-pulse' : ''}`} style={dotStyle} />
        <span className="text-xs app-text truncate flex-1">
          {job.bookTitle} — Ch.{job.chapterNumber}
        </span>
      </div>
      <span className="pl-3.5 text-[11px] app-text-faint capitalize">{job.status}</span>
    </button>
  );
}

export default function Layout() {
  const { data: books = [] } = useBooks();
  const { data: jobs = [] } = useJobs(5000);
  const [showCreate, setShowCreate] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [agentInitialQuery, setAgentInitialQuery] = useState<string | undefined>();

  const openAgent = useCallback((query?: string) => {
    setAgentInitialQuery(query);
    setShowAgent(true);
  }, []);

  const location = useLocation();
  const bookIdMatch = location.pathname.match(/^\/books\/([^/]+)/);
  const currentBookId = bookIdMatch?.[1];
  const activeBooks = books.filter(b => b.status !== 'archived');
  const recentJobs = [...jobs]
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
    .slice(0, 5);
  const hasActiveJobs = jobs.some(j => j.status === 'running' || j.status === 'pending');

  return (
    <AgentContext.Provider value={{ openAgent }}>
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col border-r app-sidebar app-divider overflow-y-auto">
        {/* Logo */}
        <Link to="/" className="block px-4 py-5 border-b app-divider hover:bg-[color:var(--surface-muted)] transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐙</span>
            <span className="text-lg font-bold app-text-primary tracking-tight">inkai</span>
          </div>
          <p className="mt-0.5 text-xs app-text-faint">AI Book Writing</p>
        </Link>

        {/* Books list */}
        <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold app-text-faint uppercase tracking-wider">Books</span>
            <button
              onClick={() => setShowCreate(true)}
              className="w-5 h-5 rounded app-accent-button transition-colors flex items-center justify-center"
              title="New book"
            >
              <Plus size={12} />
            </button>
          </div>

          {activeBooks.length === 0 && (
            <p className="px-3 text-xs app-text-faint py-2">No books yet.</p>
          )}

          {activeBooks.map(b => <SidebarBook key={b.id} book={b} />)}
        </div>

        {/* Nav */}
        <div className="border-t app-divider px-2 py-3">
          {/* Recent jobs */}
          {recentJobs.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-xs font-semibold app-text-faint uppercase tracking-wider flex items-center gap-1.5">
                  Jobs
                  {hasActiveJobs && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--semantic-warning-dot)' }} />}
                </span>
                <NavLink to="/jobs" className="text-[11px] app-text-faint hover:text-[color:var(--text-muted)] transition-colors">
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
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors app-nav-link ${
                isActive ? 'app-nav-link-active' : ''
              }`
            }
          >
            <BookOpen size={15} /> Dashboard
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors app-nav-link ${
                isActive ? 'app-nav-link-active' : ''
              }`
            }
          >
            <Briefcase size={15} /> Jobs
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors app-nav-link ${
                isActive ? 'app-nav-link-active' : ''
              }`
            }
          >
            <Settings size={15} /> Settings
          </NavLink>
          <button
            onClick={() => openAgent()}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors app-nav-link w-full"
          >
            <Bot size={15} /> Agent
          </button>
          </nav>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto app-main">
        <Outlet />
      </main>

      {showCreate && <CreateBookWizard onClose={() => setShowCreate(false)} />}
      {showAgent && (
        <MiniAgentModal
          bookId={currentBookId}
          initialQuery={agentInitialQuery}
          onClose={() => { setShowAgent(false); setAgentInitialQuery(undefined); }}
        />
      )}
    </div>
    </AgentContext.Provider>
  );
}
