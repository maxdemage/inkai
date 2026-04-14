import { useState, useRef, useContext } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ink-800 border border-white/[0.06] hover:border-white/[0.12] transition-all group">
      {/* Title + project */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/books/${book.id}`)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{book.title}</span>
          <StatusBadge status={book.status} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
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
        className="hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 text-xs text-violet-300 transition-colors"
      >
        <BookOpen size={12} /> Open
      </button>

      {/* ⋯ menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          onBlur={() => setTimeout(() => setShowMenu(false), 150)}
          className="w-7 h-7 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 flex items-center justify-center transition-colors text-lg leading-none"
        >
          ⋯
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 bg-ink-700 border border-white/[0.1] rounded-xl shadow-xl z-10 py-1 min-w-36">
            {book.status !== 'archived' ? (
              <button
                onClick={() => { setShowMenu(false); onArchive(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <Archive size={13} /> Archive
              </button>
            ) : (
              <button
                onClick={() => { setShowMenu(false); onUnarchive(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
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
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-400 transition-colors mb-2"
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
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ink-800 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left group"
    >
      <div className="w-8 h-8 rounded-lg bg-violet-600/15 border border-violet-500/20 flex items-center justify-center shrink-0 text-violet-400 text-xs font-bold">
        {job.chapterNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 truncate">
          Chapter {job.chapterNumber}
          <span className="text-slate-500 font-normal"> · {job.bookTitle}</span>
        </p>
        <p className="text-xs text-slate-600 mt-0.5">{job.projectName}</p>
      </div>
      <span className="text-xs text-slate-600 shrink-0">{timeAgo(job.finishedAt)}</span>
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

  // Recent done jobs sorted by newest first, limited to 8
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
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto space-y-10">

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* ── Section 1: Agent ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">inkai</h2>
        <div className="bg-ink-800 border border-white/[0.07] rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-3">Ask inkai to do something — generate content, navigate, run tools.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={agentInput}
              onChange={e => setAgentInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAgentSubmit()}
              placeholder="e.g. write chapter 3 for my novel, or review the lore…"
              className="flex-1 bg-ink-900 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button
              onClick={handleAgentSubmit}
              disabled={!agentInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/30 text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 2: Your Books ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your Books</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 text-xs text-violet-300 transition-colors"
          >
            <Plus size={13} /> New Book
          </button>
        </div>

        {active.length === 0 && archived.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center bg-ink-800 border border-white/[0.07] rounded-2xl">
            <BookMarked size={32} className="text-slate-600" />
            <div>
              <p className="text-slate-400 font-medium">No books yet</p>
              <p className="text-slate-600 text-sm mt-1">Create your first book to get started</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-sm text-violet-300 transition-colors"
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
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
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
