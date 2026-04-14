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
    <div className="app-panel app-panel-hover rounded-2xl p-5 group relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold app-text-primary truncate">{book.title}</h3>
          <p className="text-xs app-text-faint mt-0.5">{book.projectName}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 150)}
            className="w-7 h-7 rounded-lg app-icon-button flex items-center justify-center text-lg leading-none"
          >
            ⋯
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 app-menu rounded-xl z-10 py-1 min-w-40">
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

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusBadge status={book.status} />
        <span className="text-xs px-2 py-0.5 rounded-full app-tag capitalize">{book.genre}</span>
        <span className="text-xs px-2 py-0.5 rounded-full app-tag">{book.type}</span>
      </div>

      {/* Summary */}
      {book.summary && (
        <p className="text-xs app-text-muted leading-relaxed line-clamp-2 mb-4">{book.summary}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs app-text-faint">
        <span>{book.chapterCount} chapter{book.chapterCount !== 1 ? 's' : ''}</span>
        <span>{(book.authors ?? []).join(', ')}</span>
        <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
      </div>

      {/* Action */}
      <button
        onClick={() => navigate(`/books/${book.id}`)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl app-accent-soft text-sm"
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
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl app-panel transition-all">
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/books/${book.id}`)}
      >
        <p className="text-sm app-text truncate">{book.title}</p>
        <p className="text-xs app-text-faint mt-0.5">
          {book.projectName} · {book.chapterCount} ch · {new Date(book.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={onUnarchive}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg app-ghost-button text-xs shrink-0"
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
  const [showCreate,   setShowCreate]   = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active   = books.filter(b => b.status !== 'archived');
  const archived = books.filter(b => b.status === 'archived');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 app-text-faint">Loading…</div>;
  }

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold app-text-primary">Books</h1>
          <p className="text-sm app-text-muted mt-1">{active.length} active project{active.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 app-accent-button text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} /> New Book
        </button>
      </div>

      {/* Active books grid */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center app-panel rounded-2xl">
          <BookMarked size={36} className="app-text-faint" />
          <div>
            <p className="app-text font-medium">No active books</p>
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
            className="flex items-center gap-2 text-sm app-text-faint hover:text-[color:var(--text-muted)] transition-colors mb-4"
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
