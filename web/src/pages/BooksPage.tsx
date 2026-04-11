import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Archive, RotateCcw } from 'lucide-react';
import { useBooks, useArchiveBook, useUnarchiveBook } from '../hooks';
import StatusBadge from '../components/StatusBadge';
import CreateBookWizard from '../components/CreateBookWizard';
import type { BookRecord } from '../types';

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
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 flex items-center justify-center transition-colors text-lg leading-none"
          >
            ⋯
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-8 bg-ink-700 border border-white/[0.1] rounded-xl shadow-xl z-10 py-1 min-w-40"
              onBlur={() => setShowMenu(false)}
            >
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

export default function BooksPage() {
  const { data: books = [], isLoading } = useBooks();
  const archive = useArchiveBook();
  const unarchive = useUnarchiveBook();
  const [showCreate, setShowCreate] = useState(false);

  const active = books.filter(b => b.status !== 'archived');
  const archived = books.filter(b => b.status === 'archived');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Books</h1>
          <p className="text-sm text-slate-500 mt-1">{active.length} active project{active.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} /> New Book
        </button>
      </div>

      {/* Empty state */}
      {active.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🐙</div>
          <h2 className="text-lg font-semibold text-white mb-2">No books yet</h2>
          <p className="text-sm text-slate-500 mb-6">Start your first AI-assisted book project.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={15} /> Create Your First Book
          </button>
        </div>
      )}

      {/* Active books */}
      {active.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {active.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onArchive={() => archive.mutate(book.id)}
              onUnarchive={() => unarchive.mutate(book.id)}
            />
          ))}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Archived</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {archived.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onArchive={() => {}}
                onUnarchive={() => unarchive.mutate(book.id)}
              />
            ))}
          </div>
        </>
      )}

      {showCreate && <CreateBookWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
}
