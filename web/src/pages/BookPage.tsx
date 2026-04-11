import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, FileText, Layers3, BookMarked, Sparkles,
  Eye, Star, RefreshCw, Plus, Pencil, Check, X, Briefcase,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  useBook, useChapters, useLore, useUpdateBook,
  useArchiveBook, keys,
} from '../hooks';
import StatusBadge from '../components/StatusBadge';
import CreateChapterModal from '../components/CreateChapterModal';
import LoreEditor from '../components/LoreEditor';
import EnhanceLoreModal from '../components/EnhanceLoreModal';
import GenerateContentModal from '../components/GenerateContentModal';
import ChapterActionModal from '../components/ChapterActionModal';
import type { ChapterMeta, BookStatus } from '../types';
import { useQueryClient } from '@tanstack/react-query';

const STATUSES: { value: BookStatus; label: string; emoji: string }[] = [
  { value: 'work-in-progress', label: 'In progress',   emoji: '✍️' },
  { value: 'completed',        label: 'Completed',     emoji: '✅' },
  { value: 'review',           label: 'Under review',  emoji: '🔍' },
  { value: 'on-hold',          label: 'On hold',       emoji: '⏸️' },
  { value: 'limbo',            label: 'Limbo',         emoji: '🌀' },
];

function StatusPicker({ current, onChange }: {
  current: BookStatus;
  onChange: (s: BookStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-colors group"
        title="Change status"
      >
        <StatusBadge status={current} />
        <ChevronDown size={11} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 bg-ink-700 border border-white/[0.1] rounded-xl shadow-xl py-1 min-w-44">
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => { onChange(s.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.07] ${
                  s.value === current ? 'text-violet-300' : 'text-slate-300'
                }`}
              >
                <span>{s.emoji}</span>
                {s.label}
                {s.value === current && <span className="ml-auto text-violet-400 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Tab = 'chapters' | 'lore' | 'summary';

// ── Chapter row ─────────────────────────────────────────────────

function ChapterRow({ ch, onRead, onReview, onRewrite }: {
  ch: ChapterMeta;
  onRead: () => void;
  onReview: (n: number) => void;
  onRewrite: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-white/[0.03] rounded-xl transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-ink-700 flex items-center justify-center text-xs font-mono text-slate-400 shrink-0">
        {String(ch.number).padStart(2, '0')}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">Chapter {ch.number}</span>
          {ch.hasReview && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">reviewed</span>
          )}
        </div>
        {ch.hasChapter && (
          <span className="text-xs text-slate-500">{ch.wordCount.toLocaleString()} words</span>
        )}
      </div>

      {ch.hasChapter ? (
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRead}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-violet-600/15 hover:bg-violet-600/30 text-violet-300 transition-colors"
            title="Read"
          >
            <BookOpen size={12} /> Read
          </button>
          <button
            onClick={() => onReview(ch.number)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-colors"
            title="AI Review"
          >
            <Star size={12} /> Review
          </button>
          <button
            onClick={() => onRewrite(ch.number)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-colors"
            title="AI Rewrite"
          >
            <RefreshCw size={12} /> Rewrite
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-600">—</span>
      )}
    </div>
  );
}

// ── Lore file card ──────────────────────────────────────────────

function LoreCard({ filename, content, onClick }: {
  filename: string;
  content: string;
  onClick: () => void;
}) {
  const preview = content.slice(0, 200).replace(/^#+\s+.+\n?/gm, '').trim();
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <button
      onClick={onClick}
      className="bg-ink-800 border border-white/[0.07] rounded-xl p-4 text-left hover:border-violet-500/30 hover:bg-ink-700 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-200">{filename.replace('.md', '')}</span>
        <span className="text-xs text-slate-600">{wordCount.toLocaleString()}w</span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{preview || '(empty)'}</p>
      <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil size={10} className="text-violet-400" />
        <span className="text-[10px] text-violet-400">Click to edit</span>
      </div>
    </button>
  );
}

// ── Main page ───────────────────────────────────────────────────

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: book, isLoading: bookLoading } = useBook(id!);
  const { data: chapters = [], isLoading: chaptersLoading } = useChapters(id!);
  const { data: loreFiles = {}, isLoading: loreLoading } = useLore(id!);
  const updateBook = useUpdateBook();
  const archiveBook = useArchiveBook();

  const [tab, setTab] = useState<Tab>('chapters');
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [editingLore, setEditingLore] = useState<string | null>(null);
  const [showEnhance, setShowEnhance] = useState(false);
  const [generateType, setGenerateType] = useState<'story-arc' | 'timeline' | 'characters' | null>(null);
  const [chapterAction, setChapterAction] = useState<{ number: number; action: 'review' | 'rewrite' } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  if (bookLoading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>;
  if (!book) return <div className="flex items-center justify-center h-64 text-red-400">Book not found.</div>;

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === book.title) { setEditingTitle(false); return; }
    await updateBook.mutateAsync({ id: book.id, data: { title: titleDraft.trim() } });
    setEditingTitle(false);
  };

  const chapterSummaryContent = loreFiles['summary-of-chapters.md'] ?? 'No chapters written yet.';
  const writingStyleContent = loreFiles['style-of-writing.md'];
  const storyArcContent = loreFiles['story-arc.md'];
  const timelineContent = loreFiles['timeline.md'];
  const charactersContent = loreFiles['characters.md'];

  const displayLoreFiles = Object.entries(loreFiles).filter(
    ([f]) => f !== 'summary-of-chapters.md'
  );

  // Editing a lore file — full panel takeover
  if (editingLore) {
    return (
      <div className="h-full flex flex-col bg-ink-950">
        <LoreEditor
          bookId={book.id}
          filename={editingLore}
          initialContent={loreFiles[editingLore] ?? ''}
          onClose={() => setEditingLore(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Book header ─────────────────────────────────────────── */}
      <div className="px-8 py-6 border-b border-white/[0.06] bg-ink-900/50 shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    className="text-2xl font-bold bg-transparent border-b border-violet-500 text-white focus:outline-none py-0.5 w-full max-w-sm"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    autoFocus
                  />
                  <button onClick={saveTitle} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Check size={16} /></button>
                  <button onClick={() => setEditingTitle(false)} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h1 className="text-2xl font-bold text-white truncate">{book.title}</h1>
                  <button
                    onClick={() => { setTitleDraft(book.title); setEditingTitle(true); }}
                    className="opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusPicker
                  current={book.status}
                  onChange={status => updateBook.mutate({ id: book.id, data: { status } })}
                />
                <span className="text-xs text-slate-500 capitalize">{book.genre}</span>
                {book.subgenre && <span className="text-xs text-slate-600">· {book.subgenre}</span>}
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-500">{book.chapterCount} chapter{book.chapterCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate('/jobs')}
                className="btn-ghost-sm flex items-center gap-1.5"
                title="View jobs"
              >
                <Briefcase size={13} /> Jobs
              </button>
              {book.status !== 'archived' && (
                <button
                  onClick={() => archiveBook.mutate(book.id)}
                  className="btn-ghost-sm text-slate-500 hover:text-amber-400"
                  title="Archive this book"
                >
                  Archive
                </button>
              )}
            </div>
          </div>

          {/* Summary collapsible */}
          {book.summary && (
            <div className="mt-3">
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showSummary ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showSummary ? 'Hide' : 'Show'} summary
              </button>
              {showSummary && (
                <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">{book.summary}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="px-8 border-b border-white/[0.06] shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-1">
          {([
            { id: 'chapters', label: 'Chapters', icon: BookOpen },
            { id: 'lore', label: 'Lore', icon: Layers3 },
            { id: 'summary', label: 'Summary', icon: BookMarked },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-violet-500 text-violet-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <t.icon size={14} /> {t.label}
              {t.id === 'chapters' && (
                <span className="ml-1 text-xs bg-white/[0.08] rounded-full px-1.5 py-0.5 text-slate-400">{chapters.length}</span>
              )}
              {t.id === 'lore' && (
                <span className="ml-1 text-xs bg-white/[0.08] rounded-full px-1.5 py-0.5 text-slate-400">{displayLoreFiles.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-5xl mx-auto">

          {/* ── Chapters tab ─────────────────────────────────────── */}
          {tab === 'chapters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Chapters</h2>
                <button
                  onClick={() => setShowCreateChapter(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <Plus size={14} />
                  Write Chapter {book.chapterCount + 1}
                </button>
              </div>

              {chaptersLoading && <div className="text-sm text-slate-500">Loading chapters…</div>}

              {chapters.length === 0 && !chaptersLoading && (
                <div className="text-center py-12 text-slate-600">
                  <FileText size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No chapters yet.</p>
                  <p className="text-xs mt-1">Click "Write Chapter 1" to get started.</p>
                </div>
              )}

              {chapters.length > 0 && (
                <div className="bg-ink-800 border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04]">
                  {chapters.map(ch => (
                    <ChapterRow
                      key={ch.number}
                      ch={ch}
                      onRead={() => navigate(`/books/${book.id}/read/${ch.number}`)}
                      onReview={(n) => setChapterAction({ number: n, action: 'review' })}
                      onRewrite={(n) => setChapterAction({ number: n, action: 'rewrite' })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Lore tab ─────────────────────────────────────────── */}
          {tab === 'lore' && (
            <div className="space-y-6">
              {/* Lore files header */}
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Lore Files</h2>

              {/* AI enhancing tools */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Enhancing Tools</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowEnhance(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-violet-300 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 rounded-xl transition-colors"
                  >
                    <Sparkles size={13} /> Enhance Lore
                  </button>
                  <button
                    onClick={() => setGenerateType('story-arc')}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-xl transition-colors"
                  >
                    <Layers3 size={13} /> Story Arc
                  </button>
                  <button
                    onClick={() => setGenerateType('timeline')}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-xl transition-colors"
                  >
                    <Eye size={13} /> Timeline
                  </button>
                  <button
                    onClick={() => setGenerateType('characters')}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-xl transition-colors"
                  >
                    <Star size={13} /> Characters
                  </button>
                </div>
              </div>

              {loreLoading && <div className="text-sm text-slate-500">Loading lore…</div>}

              {displayLoreFiles.length === 0 && !loreLoading && (
                <div className="text-center py-12 text-slate-600">
                  <Layers3 size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No lore files yet.</p>
                </div>
              )}

              {displayLoreFiles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayLoreFiles.map(([filename, content]) => (
                    <LoreCard
                      key={filename}
                      filename={filename}
                      content={content}
                      onClick={() => setEditingLore(filename)}
                    />
                  ))}
                </div>
              )}

              {/* Quick view panels for key generated content */}
              {storyArcContent && (
                <div className="mt-6 bg-ink-800 border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Story Arc</h3>
                    <button onClick={() => setEditingLore('story-arc.md')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Edit</button>
                  </div>
                  <div className="prose-dark text-sm max-h-48 overflow-y-auto">
                    <ReactMarkdown>{storyArcContent.slice(0, 1000)}</ReactMarkdown>
                    {storyArcContent.length > 1000 && <p className="text-slate-600 text-xs mt-2">…more in editor</p>}
                  </div>
                </div>
              )}

              {writingStyleContent && (
                <div className="bg-ink-800 border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Style of Writing</h3>
                    <button onClick={() => setEditingLore('style-of-writing.md')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Edit</button>
                  </div>
                  <div className="prose-dark text-sm max-h-48 overflow-y-auto">
                    <ReactMarkdown>{writingStyleContent.slice(0, 800)}</ReactMarkdown>
                  </div>
                </div>
              )}

              {timelineContent && (
                <div className="bg-ink-800 border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Timeline</h3>
                    <button onClick={() => setEditingLore('timeline.md')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Edit</button>
                  </div>
                  <div className="prose-dark text-sm max-h-48 overflow-y-auto">
                    <ReactMarkdown>{timelineContent.slice(0, 1000)}</ReactMarkdown>
                  </div>
                </div>
              )}

              {charactersContent && (
                <div className="bg-ink-800 border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Characters</h3>
                    <button onClick={() => setEditingLore('characters.md')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Edit</button>
                  </div>
                  <div className="prose-dark text-sm max-h-48 overflow-y-auto">
                    <ReactMarkdown>{charactersContent.slice(0, 1000)}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Summary tab ──────────────────────────────────────── */}
          {tab === 'summary' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Chapter Summary</h2>
              <div className="bg-ink-800 border border-white/[0.06] rounded-2xl p-6">
                <div className="prose-dark text-sm">
                  <ReactMarkdown>{chapterSummaryContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showCreateChapter && (
        <CreateChapterModal
          book={book}
          onClose={() => setShowCreateChapter(false)}
          onJobStarted={(_jobId, _n) => {
            qc.invalidateQueries({ queryKey: keys.chapters(book.id) });
            qc.invalidateQueries({ queryKey: keys.jobs });
          }}
        />
      )}

      {showEnhance && (
        <EnhanceLoreModal book={book} onClose={() => setShowEnhance(false)} />
      )}

      {generateType && (
        <GenerateContentModal
          book={book}
          type={generateType}
          onClose={() => setGenerateType(null)}
        />
      )}

      {chapterAction && (
        <ChapterActionModal
          book={book}
          chapterNumber={chapterAction.number}
          action={chapterAction.action}
          onClose={() => setChapterAction(null)}
          onDone={() => {
            if (chapterAction.action === 'review') {
              navigate(`/books/${book.id}/read/${chapterAction.number}?tab=review`);
            } else {
              navigate(`/books/${book.id}/read/${chapterAction.number}`);
            }
            setChapterAction(null);
          }}
        />
      )}
    </div>
  );
}
