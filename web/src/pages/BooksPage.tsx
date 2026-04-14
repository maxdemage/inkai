import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Archive, RotateCcw, Send, BookMarked, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useBooks, useArchiveBook, useUnarchiveBook, useJobs } from '../hooks';
import StatusBadge from '../components/StatusBadge';
import CreateBookWizard from '../components/CreateBookWizard';
import { AgentContext } from '../components/Layout';
import type { BookRecord, ChapterJob } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── BookRow (compact) ───────────────────────────────────────────────────────

function BookRow({ book, onArchive, onUnarchive }: {
  book: BookRecord;
  onArchive: () => void;
  onUnarchive: () => void;
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl app-panel app-panel-hover transition-all group">
      {/* Title + project */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/books/${book.id}`)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium app-text-primary truncate">{book.title}</span>
          <StatusBadge status={book.status} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs app-text-faint">
          <span>{book.projectName}</span>
          <span>·</span>
          <span>{book.chapterCount} ch</span>
          <span>·</span>
          <span className="capitalize">{book.genre}</span>
        </div>
      </div>

      {/* Open button */}
      <button
        onClick={() => navigate(`/books/${book.id}`)}
        className="hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-lg app-accent-soft text-xs transition-colors"
      >
        <BookOpen size={12} /> Open
      </button>

      {/* ⋯ menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          onBlur={() => setTimeout(() => setShowMenu(false), 150)}
          className="w-7 h-7 rounded-lg app-icon-button flex items-center justify-center text-lg leading-none"
        >
          ⋯
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 app-menu rounded-xl z-10 py-1 min-w-36">
            {book.status !== 'archived' ? (
              <button
                onClick={() => { setShowMenu(false); onArchive(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm app-ghost-button"
              >
                <Archive size={13} /> Archive
              </button>
            ) : (
              <button
                onClick={() => { setShowMenu(false); onUnarchive(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm app-ghost-button"
              >
                <RotateCcw size={13} /> Unarchive
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ArchivedList ────────────────────────────────────────────────────────────

function ArchivedList({ books, onUnarchive }: { books: BookRecord[]; onUnarchive: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (books.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs app-text-faint hover:text-[color:var(--text-muted)] transition-colors mb-2"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Archived ({books.length})
      </button>
      {open && (
        <div className="space-y-2 opacity-60">
          {books.map(book => (
            <BookRow
              key={book.id}
              book={book}
              onArchive={() => {}}
              onUnarchive={() => onUnarchive(book.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── LatestChapterRow ─────────────────────────────────────────────────────────

function LatestChapterRow({ job }: { job: ChapterJob }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/books/${job.bookId}`)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl app-panel app-panel-hover transition-all text-left group"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)', border: '1px solid var(--accent-border)' }}
      >
        {job.chapterNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm app-text truncate">
          Chapter {job.chapterNumber}
          <span className="app-text-faint font-normal"> · {job.bookTitle}</span>
        </p>
        <p className="text-xs app-text-faint mt-0.5">{job.projectName}</p>
      </div>
      <span className="text-xs app-text-faint shrink-0">{timeAgo(job.finishedAt)}</span>
    </button>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export default function BooksPage() {
  const { data: books = [], isLoading } = useBooks();
  const { data: jobs = [] }             = useJobs();
  const archive   = useArchiveBook();
  const unarchive = useUnarchiveBook();
  const { openAgent } = useContext(AgentContext);

  const [showCreate, setShowCreate] = useState(false);
  const [agentInput, setAgentInput] = useState('');

  const active   = books.filter(b => b.status !== 'archived');
  const archived = books.filter(b => b.status === 'archived');

  const recentChapters = (jobs as ChapterJob[])
    .filter(j => j.status === 'done' && j.finishedAt)
    .sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime())
    .slice(0, 8);

  const handleAgentSubmit = () => {
    const q = agentInput.trim();
    if (!q) return;
    setAgentInput('');
    openAgent(q);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 app-text-faint">Loading…</div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto space-y-10">

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold app-text-primary">Dashboard</h1>

      {/* ── Section 1: Agent ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest app-text-faint mb-3">inkai</h2>
        <div className="app-panel rounded-2xl p-4">
          <p className="text-xs app-text-faint mb-3">Ask inkai to do something — generate content, navigate, run tools.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={agentInput}
              onChange={e => setAgentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAgentSubmit()}
              placeholder="e.g. write chapter 3 for my novel, or review the lore…"
              className="flex-1 bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl px-4 py-2.5 text-sm app-text placeholder-[color:var(--text-faint)] focus:outline-none focus:border-[color:var(--accent-border)] transition-colors"
            />
            <button
              onClick={handleAgentSubmit}
              disabled={!agentInput.trim()}
              className="px-4 py-2.5 rounded-xl app-accent-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ color: 'var(--accent-strong)' }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 2: Your Books ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest app-text-faint">Your Books</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg app-accent-soft text-xs transition-colors"
            style={{ color: 'var(--accent-strong)' }}
          >
            <Plus size={13} /> New Book
          </button>
        </div>

        {active.length === 0 && archived.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center app-panel rounded-2xl">
            <BookMarked size={32} className="app-text-faint" />
            <div>
              <p className="app-text font-medium">No books yet</p>
              <p className="app-text-faint text-sm mt-1">Create your first book to get started</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl app-accent-button text-sm transition-colors"
            >
              <Plus size={15} /> Create Book
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {active.map(book => (
                <BookRow
                  key={book.id}
                  book={book}
                  onArchive={() => archive.mutate(book.id)}
                  onUnarchive={() => {}}
                />
              ))}
            </div>
            <ArchivedList books={archived} onUnarchive={id => unarchive.mutate(id)} />
          </>
        )}
      </section>

      {/* ── Section 3: Latest Chapters ───────────────────────────────────── */}
      {recentChapters.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest app-text-faint mb-3 flex items-center gap-2">
            <Clock size={12} /> Latest Chapters
          </h2>
          <div className="space-y-2">
            {recentChapters.map(job => (
              <LatestChapterRow key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showCreate && <CreateBookWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
}
