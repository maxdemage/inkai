import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Archive, RotateCcw, ChevronDown, ChevronRight, BookMarked } from 'lucide-react';
import { useBooks, useArchiveBook, useUnarchiveBook } from '../hooks';
import StatusBadge from '../components/StatusBadge';
import CreateBookWizard from '../components/CreateBookWizard';
import type { BookRecord } from '../types';

// ── BookCard ────────────────────────────────────────────────────────────────

function BookCard({ book, onArchive, onUnarchive }: {
  book: BookRecord;
  onArchive: () => void;
  onUnarchive: () => void;
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-ink-800 border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.14] transition-all group relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate">{book.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{book.projectName}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 150)}
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 flex items-center justify-center transition-colors text-lg leading-none"
          >
            ⋯
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-ink-700 border border-white/[0.1] rounded-xl shadow-xl z-10 py-1 min-w-40">
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

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusBadge status={book.status} />
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 capitalize">{book.genre}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{book.type}</span>
      </div>

      {/* Summary */}
      {book.summary && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{book.summary}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span>{book.chapterCount} chapter{book.chapterCount !== 1 ? 's' : ''}</span>
        <span>{(book.authors ?? []).join(', ')}</span>
        <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
      </div>

      {/* Action */}
      <button
        onClick={() => navigate(`/books/${book.id}`)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 text-sm text-violet-300 transition-colors group-hover:border-violet-500/40"
      >
        <BookOpen size={14} /> Open Book
      </button>
    </div>
  );
}

// ── ArchivedRow ─────────────────────────────────────────────────────────────

function ArchivedRow({ book, onUnarchive }: { book: BookRecord; onUnarchive: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.05] hover:border-white/[0.09] transition-all">
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/books/${book.id}`)}
      >
        <p className="text-sm text-slate-400 truncate">{book.title}</p>
        <p className="text-xs text-slate-600 mt-0.5">
          {book.projectName} · {book.chapterCount} ch · {new Date(book.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={onUnarchive}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs text-slate-500 hover:text-slate-300 hover:border-white/[0.14] transition-colors shrink-0"
      >
        <RotateCcw size={12} /> Unarchive
      </button>
    </div>
  );
}

// ── AllBooksPage ─────────────────────────────────────────────────────────────

export default function AllBooksPage() {
  const { data: books = [], isLoading } = useBooks();
  const archive   = useArchiveBook();
  const unarchive = useUnarchiveBook();
  const [showCreate,  setShowCreate]  = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active   = books.filter(b => b.status !== 'archived');
  const archived = books.filter(b => b.status === 'archived');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>;
  }

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Books</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-sm text-violet-300 transition-colors"
        >
          <Plus size={15} /> New Book
        </button>
      </div>

      {/* Active books grid */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center bg-ink-800 border border-white/[0.07] rounded-2xl">
          <BookMarked size={36} className="text-slate-600" />
          <div>
            <p className="text-slate-400 font-medium">No active books</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onArchive={() => archive.mutate(book.id)}
              onUnarchive={() => {}}
            />
          ))}
        </div>
      )}

      {/* Archived section */}
      {archived.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowArchived(o => !o)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4"
          >
            {showArchived ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Archived ({archived.length})
          </button>
          {showArchived && (
            <div className="space-y-2">
              {archived.map(book => (
                <ArchivedRow
                  key={book.id}
                  book={book}
                  onUnarchive={() => unarchive.mutate(book.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateBookWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
}
