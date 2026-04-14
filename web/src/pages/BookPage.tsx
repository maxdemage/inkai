import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen, FileText, Layers3, BookMarked, Sparkles,
  Eye, Star, RefreshCw, Plus, Pencil, Check, X, Briefcase,
  ChevronDown, ChevronUp, Download, Loader2, Trash2, ShieldCheck,
  GitBranch, RefreshCcw, GitCommit,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  useBook, useChapters, useLore, useUpdateBook,
  useArchiveBook, useJobs, useDeleteChapter, useGitStatus, keys,
} from '../hooks';
import StatusBadge from '../components/StatusBadge';
import CreateChapterModal from '../components/CreateChapterModal';
import LoreEditor from '../components/LoreEditor';
import EnhanceLoreModal from '../components/EnhanceLoreModal';
import LoreReviewModal from '../components/LoreReviewModal';
import GenerateContentModal from '../components/GenerateContentModal';
import ChapterActionModal from '../components/ChapterActionModal';
import ChapterEditor from '../components/ChapterEditor';
import type { ChapterMeta, BookStatus } from '../types';
import { api } from '../api';
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
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border app-divider app-ghost-button transition-colors group"
        title="Change status"
      >
        <StatusBadge status={current} />
        <ChevronDown size={11} className="app-text-faint group-hover:text-[color:var(--text)] transition-colors" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 app-menu rounded-xl py-1 min-w-44">
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => { onChange(s.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[color:var(--surface-muted)] ${
                  s.value === current ? 'text-[color:var(--accent-strong)]' : 'app-text'
                }`}
              >
                <span>{s.emoji}</span>
                {s.label}
                {s.value === current && <span className="ml-auto text-[color:var(--accent)] text-xs">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Tab = 'chapters' | 'lore' | 'summary' | 'git';

// ── Chapter row ─────────────────────────────────────────────────

function ChapterRow({ ch, onRead, onReview, onRewrite, onEdit, onDelete }: {
  ch: ChapterMeta;
  onRead: () => void;
  onReview: (n: number) => void;
  onRewrite: (n: number) => void;
  onEdit: (n: number) => void;
  onDelete: (n: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-[color:var(--surface-muted)] rounded-xl transition-colors group">
      <div className="w-8 h-8 rounded-lg app-panel-strong flex items-center justify-center text-xs font-mono app-text-muted shrink-0">
        {String(ch.number).padStart(2, '0')}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium app-text-primary">Chapter {ch.number}</span>
          {ch.hasReview && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full app-info">reviewed</span>
          )}
        </div>
        {ch.hasChapter && (
          <span className="text-xs app-text-faint">{ch.wordCount.toLocaleString()} words</span>
        )}
      </div>

      {ch.hasChapter ? (
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRead}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg app-accent-soft transition-colors"
            title="Read"
          >
            <BookOpen size={12} /> Read
          </button>
          <button
            onClick={() => onReview(ch.number)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg app-ghost-button transition-colors"
            title="AI Review"
          >
            <Star size={12} /> Review
          </button>
          <button
            onClick={() => onRewrite(ch.number)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg app-ghost-button transition-colors"
            title="AI Rewrite"
          >
            <RefreshCw size={12} /> Rewrite
          </button>
          <button
            onClick={() => onEdit(ch.number)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg app-ghost-button app-text-faint hover:text-[color:var(--text)] transition-colors"
            title="Edit manually"
          >
            <Pencil size={12} />
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => { onDelete(ch.number); setConfirmDelete(false); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg app-danger transition-colors"
                title="Confirm delete"
              >
                <Trash2 size={11} /> Delete?
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg app-ghost-button app-text-faint hover:text-[color:var(--text)] transition-colors"
                title="Cancel"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg app-danger-button transition-colors"
              title="Delete chapter"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      ) : (
        <span className="text-xs app-text-faint">—</span>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { data: book, isLoading: bookLoading } = useBook(id!);
  const { data: chapters = [], isLoading: chaptersLoading } = useChapters(id!);
  const { data: loreFiles = {}, isLoading: loreLoading } = useLore(id!);
  const updateBook = useUpdateBook();
  const archiveBook = useArchiveBook();
  const deleteChapter = useDeleteChapter();

  const [tab, setTab] = useState<Tab>('chapters');
  const { data: gitData, refetch: refetchGit, isFetching: gitFetching } = useGitStatus(book?.id ?? '', tab === 'git' && !!book);
  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [editingLore, setEditingLore] = useState<string | null>(null);
  const [showEnhance, setShowEnhance] = useState(false);
  const [showLoreReview, setShowLoreReview] = useState(false);
  const [newLoreFileName, setNewLoreFileName] = useState<string | null>(null); // null=hidden, ''=open
  const [newLoreFileError, setNewLoreFileError] = useState('');
  const [creatingLoreFile, setCreatingLoreFile] = useState(false);
  const [generateType, setGenerateType] = useState<'story-arc' | 'timeline' | 'characters' | null>(null);
  const [chapterAction, setChapterAction] = useState<{ number: number; action: 'review' | 'rewrite' } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [editingChapter, setEditingChapter] = useState<number | null>(
    (location.state as { editChapter?: number } | null)?.editChapter ?? null,
  );
  const [showExport, setShowExport] = useState(false);
  const [jobToast, setJobToast] = useState<{ chapterNumber: number } | null>(null);

  const { data: allJobs = [], refetch: refetchJobs } = useJobs();
  const bookActiveJobs = allJobs.filter(j => j.bookId === id && (j.status === 'pending' || j.status === 'running'));

  // Poll while this book has active jobs
  useEffect(() => {
    if (bookActiveJobs.length === 0) return;
    const t = setInterval(() => refetchJobs(), 3000);
    return () => clearInterval(t);
  }, [bookActiveJobs.length, refetchJobs]);

  // Auto-dismiss toast after 6s
  useEffect(() => {
    if (!jobToast) return;
    const t = setTimeout(() => setJobToast(null), 6000);
    return () => clearTimeout(t);
  }, [jobToast]);

  if (bookLoading) return <div className="flex items-center justify-center h-64 app-text-faint">Loading…</div>;
  if (!book) return <div className="flex items-center justify-center h-64 app-text-danger">Book not found.</div>;

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === book.title) { setEditingTitle(false); return; }
    await updateBook.mutateAsync({ id: book.id, data: { title: titleDraft.trim() } });
    setEditingTitle(false);
  };

  const doCommit = async () => {
    if (committing) return;
    setCommitting(true);
    setCommitResult(null);
    try {
      const result = await api.git.commit(book.id, commitMsg.trim() || undefined);
      setCommitResult(result);
      setCommitMsg('');
      refetchGit();
    } catch (e) {
      setCommitResult({ ok: false, message: String(e) });
    } finally {
      setCommitting(false);
    }
  };

  const chapterSummaryContent = loreFiles['summary-of-chapters.md'] ?? 'No chapters written yet.';
  const charactersContent = loreFiles['characters.md'];

  const displayLoreFiles = Object.entries(loreFiles).filter(
    ([f]) => f !== 'summary-of-chapters.md'
  );

  // Editing a lore file — full panel takeover
  if (editingLore) {
    return (
      <div className="h-full flex flex-col app-main">
        <LoreEditor
          bookId={book.id}
          filename={editingLore}
          initialContent={loreFiles[editingLore] ?? ''}
          allFiles={loreFiles}
          onSwitchFile={setEditingLore}
          onClose={() => setEditingLore(null)}
        />
      </div>
    );
  }

  // Editing a chapter — full panel takeover
  if (editingChapter !== null) {
    return (
      <div className="h-full flex flex-col app-main">
        <ChapterEditor
          bookId={book.id}
          chapterNumber={editingChapter}
          onClose={() => setEditingChapter(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Book header ─────────────────────────────────────────── */}
      <div className="px-8 py-6 border-b app-divider bg-[color:var(--bg-soft)] shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    className="text-2xl font-bold bg-transparent border-b text-[color:var(--text-strong)] py-0.5 w-full max-w-sm"
                    style={{ borderColor: 'var(--accent)' }}
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    autoFocus
                  />
                  <button onClick={saveTitle} className="app-text-success transition-colors"><Check size={16} /></button>
                  <button onClick={() => setEditingTitle(false)} className="app-text-faint hover:text-[color:var(--text)] transition-colors"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h1 className="text-2xl font-bold app-text-primary truncate">{book.title}</h1>
                  <button
                    onClick={() => { setTitleDraft(book.title); setEditingTitle(true); }}
                    className="opacity-0 group-hover/title:opacity-100 transition-opacity app-text-faint hover:text-[color:var(--text)]"
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
                <span className="text-xs app-text-muted capitalize">{book.genre}</span>
                {book.subgenre && <span className="text-xs app-text-faint">· {book.subgenre}</span>}
                <span className="text-xs app-text-faint">·</span>
                <span className="text-xs app-text-muted">{book.chapterCount} chapter{book.chapterCount !== 1 ? 's' : ''}</span>
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
              {book.chapterCount > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowExport(o => !o)}
                    className="btn-ghost-sm flex items-center gap-1.5"
                    title="Export book"
                  >
                    <Download size={13} /> Export
                  </button>
                  {showExport && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                      <div className="absolute right-0 top-8 z-20 app-menu rounded-xl py-1 min-w-40">
                        <button
                          onClick={() => { api.books.export(book.id, 'epub'); setShowExport(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm app-ghost-button transition-colors"
                        >
                          <Download size={13} className="text-[color:var(--accent)]" /> EPUB
                        </button>
                        <button
                          onClick={() => { api.books.export(book.id, 'odt'); setShowExport(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm app-ghost-button transition-colors"
                        >
                          <Download size={13} className="text-[color:var(--accent)]" /> ODT
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {book.status !== 'archived' && (
                <button
                  onClick={() => archiveBook.mutate(book.id)}
                  className="btn-ghost-sm app-warning-button"
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
                className="flex items-center gap-1 text-xs app-text-faint hover:text-[color:var(--text)] transition-colors"
              >
                {showSummary ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showSummary ? 'Hide' : 'Show'} summary
              </button>
              {showSummary && (
                <p className="mt-2 text-sm app-text-muted leading-relaxed max-w-2xl">{book.summary}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="px-8 border-b app-divider shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-1">
          {([
            { id: 'chapters', label: 'Chapters', icon: BookOpen },
            { id: 'lore', label: 'Lore', icon: Layers3 },
            { id: 'summary', label: 'Summary', icon: BookMarked },
            { id: 'git', label: 'Git', icon: GitBranch },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[color:var(--accent)] text-[color:var(--accent-strong)]'
                  : 'border-transparent app-text-faint hover:text-[color:var(--text)]'
              }`}
            >
              <t.icon size={14} /> {t.label}
              {t.id === 'chapters' && (
                <span className="ml-1 text-xs app-tag rounded-full px-1.5 py-0.5">{chapters.length}</span>
              )}
              {t.id === 'lore' && (
                <span className="ml-1 text-xs app-tag rounded-full px-1.5 py-0.5">{displayLoreFiles.length}</span>
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
                <h2 className="text-sm font-semibold app-text-muted uppercase tracking-wider">Chapters</h2>
                <button
                  onClick={() => setShowCreateChapter(true)}
                  className="flex items-center gap-2 px-3 py-2 app-accent-button text-sm font-medium rounded-xl transition-colors"
                >
                  <Plus size={14} />
                  Write Chapter {book.chapterCount + 1}
                </button>
              </div>

              {/* Active jobs for this book */}
              {bookActiveJobs.length > 0 && (
                <div className="space-y-2">
                  {bookActiveJobs.map(job => (
                    <div key={job.id} className="flex items-center gap-3 px-4 py-3 app-warning rounded-xl">
                      <Loader2 size={14} className="animate-spin shrink-0 app-text-warning" />
                      <span className="text-sm flex-1">
                        Chapter {job.chapterNumber} — writing in background
                      </span>
                      <span className={`text-xs capitalize ${job.status === 'running' ? 'app-text-warning' : 'app-text-faint'}`}>{job.status}</span>
                      <button
                        onClick={() => navigate('/jobs')}
                        className="text-xs app-text-muted hover:text-[color:var(--text)] transition-colors"
                      >
                        View →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {chaptersLoading && <div className="text-sm app-text-faint">Loading chapters…</div>}

              {chapters.length === 0 && !chaptersLoading && (
                <div className="text-center py-12 app-text-faint">
                  <FileText size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No chapters yet.</p>
                  <p className="text-xs mt-1">Click "Write Chapter 1" to get started.</p>
                </div>
              )}

              {chapters.length > 0 && (
                <div className="app-panel rounded-2xl divide-y app-divider">
                  {chapters.map(ch => (
                    <ChapterRow
                      key={ch.number}
                      ch={ch}
                      onRead={() => navigate(`/books/${book.id}/read/${ch.number}`)}
                      onReview={(n) => setChapterAction({ number: n, action: 'review' })}
                      onRewrite={(n) => setChapterAction({ number: n, action: 'rewrite' })}
                      onEdit={(n) => setEditingChapter(n)}
                      onDelete={(n) => deleteChapter.mutate({ bookId: book.id, number: n })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Lore tab ─────────────────────────────────────────── */}
          {tab === 'lore' && (
            <div className="space-y-6">

              {/* AI enhancing tools */}
              <div className="app-panel rounded-2xl px-4 py-3 space-y-3">
                <h3 className="text-xs font-semibold app-text-faint uppercase tracking-wider">AI Enhancing Tools</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <button
                    onClick={() => setShowEnhance(true)}
                    className="flex flex-col items-start gap-1 px-3 py-2.5 text-left app-accent-soft rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles size={13} /> Enhance Lore</span>
                    <span className="text-xs app-text-faint leading-snug">AI asks you targeted questions, then weaves your answers into the lore files to deepen the world.</span>
                  </button>
                  <button
                    onClick={() => setShowLoreReview(true)}
                    className="flex flex-col items-start gap-1 px-3 py-2.5 text-left app-ghost-button border app-divider rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium"><ShieldCheck size={13} /> Lore Review</span>
                    <span className="text-xs app-text-faint leading-snug">AI audits all lore files for contradictions and inconsistencies, then self-corrects them.</span>
                  </button>
                  <button
                    onClick={() => setGenerateType('story-arc')}
                    className="flex flex-col items-start gap-1 px-3 py-2.5 text-left app-ghost-button border app-divider rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Layers3 size={13} /> Story Arc</span>
                    <span className="text-xs app-text-faint leading-snug">Synthesizes lore and chapter history into a structured arc with plot beats and character development.</span>
                  </button>
                  <button
                    onClick={() => setGenerateType('timeline')}
                    className="flex flex-col items-start gap-1 px-3 py-2.5 text-left app-ghost-button border app-divider rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Eye size={13} /> Timeline</span>
                    <span className="text-xs app-text-faint leading-snug">Builds a chronological timeline from all lore and chapter data, flagging impossible sequencing.</span>
                  </button>
                  <button
                    onClick={() => setGenerateType('characters')}
                    className="flex flex-col items-start gap-1 px-3 py-2.5 text-left app-ghost-button border app-divider rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Star size={13} /> Characters</span>
                    <span className="text-xs app-text-faint leading-snug">Generates detailed character sheets with arcs, relationships, tensions, and motivations.</span>
                  </button>
                </div>
              </div>

              {/* Lore files */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold app-text-faint uppercase tracking-wider">Lore Files</h3>
                  <button
                    onClick={() => { setNewLoreFileName(''); setNewLoreFileError(''); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs app-ghost-button rounded-lg transition-colors"
                  >
                    <Plus size={12} /> New File
                  </button>
                </div>

                {/* Inline new-file form */}
                {newLoreFileName !== null && (
                  <div className="app-panel rounded-xl px-4 py-3 space-y-2">
                    <p className="text-xs app-text-faint">Enter a name for the new lore file (no extension needed).</p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newLoreFileName}
                        onChange={e => { setNewLoreFileName(e.target.value); setNewLoreFileError(''); }}
                        onKeyDown={async e => {
                          if (e.key === 'Escape') { setNewLoreFileName(null); return; }
                          if (e.key === 'Enter') {
                            const raw = newLoreFileName.trim();
                            if (!raw) { setNewLoreFileError('Name is required'); return; }
                            const safe = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
                            if (!safe) { setNewLoreFileError('Name contains only invalid characters'); return; }
                            const filename = `${safe}.md`;
                            if (loreFiles[filename] !== undefined) { setNewLoreFileError(`"${filename}" already exists`); return; }
                            setCreatingLoreFile(true);
                            try {
                              await api.lore.create(book.id, filename);
                              await qc.invalidateQueries({ queryKey: keys.lore(book.id) });
                              setNewLoreFileName(null);
                              setEditingLore(filename);
                            } catch (err) {
                              setNewLoreFileError(String(err));
                            } finally {
                              setCreatingLoreFile(false);
                            }
                          }
                        }}
                        placeholder="e.g. magic-system"
                        className="flex-1 app-input rounded-lg px-3 py-2 text-sm outline-none"
                      />
                      <button
                        disabled={creatingLoreFile}
                        onClick={async () => {
                          const raw = newLoreFileName.trim();
                          if (!raw) { setNewLoreFileError('Name is required'); return; }
                          const safe = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
                          if (!safe) { setNewLoreFileError('Name contains only invalid characters'); return; }
                          const filename = `${safe}.md`;
                          if (loreFiles[filename] !== undefined) { setNewLoreFileError(`"${filename}" already exists`); return; }
                          setCreatingLoreFile(true);
                          try {
                            await api.lore.create(book.id, filename);
                            await qc.invalidateQueries({ queryKey: keys.lore(book.id) });
                            setNewLoreFileName(null);
                            setEditingLore(filename);
                          } catch (err) {
                            setNewLoreFileError(String(err));
                          } finally {
                            setCreatingLoreFile(false);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 app-accent-button rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
                      >
                        {creatingLoreFile ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Create
                      </button>
                      <button
                        onClick={() => setNewLoreFileName(null)}
                        className="px-2.5 py-2 app-ghost-button rounded-lg transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    {newLoreFileError && <p className="text-xs app-text-danger">{newLoreFileError}</p>}
                  </div>
                )}

                {loreLoading && <div className="text-sm app-text-faint">Loading lore…</div>}

                {!loreLoading && displayLoreFiles.length === 0 && (
                  <div className="text-center py-12 app-text-faint">
                    <Layers3 size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No lore files yet.</p>
                  </div>
                )}

                {displayLoreFiles.length > 0 && (
                  <div className="divide-y app-divider app-panel rounded-2xl overflow-hidden">
                    {displayLoreFiles.map(([filename]) => (
                      <button
                        key={filename}
                        onClick={() => setEditingLore(filename)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left app-ghost-button transition-colors group"
                      >
                        <span className="text-sm app-text group-hover:text-[color:var(--text-strong)] transition-colors">{filename}</span>
                        <Pencil size={13} className="app-text-faint group-hover:text-[color:var(--accent)] transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── Summary tab ──────────────────────────────────────── */}
          {tab === 'summary' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold app-text-muted uppercase tracking-wider">Chapter Summary</h2>
              <div className="app-panel rounded-2xl p-6">
                <div className="prose-dark text-sm">
                  <ReactMarkdown>{chapterSummaryContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* ── Git tab ──────────────────────────────────────────── */}
          {tab === 'git' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold app-text-muted uppercase tracking-wider">Git</h2>
                <button
                  onClick={() => refetchGit()}
                  disabled={gitFetching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs app-ghost-button transition-colors disabled:opacity-50"
                >
                  <RefreshCcw size={12} className={gitFetching ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {!gitData && !gitFetching && (
                <p className="text-sm app-text-faint">Loading…</p>
              )}

              {gitData && !gitData.available && (
                <div className="app-panel rounded-2xl p-6 text-sm app-text-faint">
                  Git is not available or not configured for this project.
                </div>
              )}

              {gitData?.available && (
                <>
                  {/* Commit form */}
                  <div className="app-panel rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-semibold app-text-faint uppercase tracking-wider">Commit</span>
                    <div className="flex gap-2">
                      <input
                        value={commitMsg}
                        onChange={e => { setCommitMsg(e.target.value); setCommitResult(null); }}
                        onKeyDown={e => e.key === 'Enter' && !committing && doCommit()}
                        placeholder="Message (optional — defaults to timestamp)"
                        className="flex-1 app-input rounded-lg px-3 py-2 text-sm outline-none"
                      />
                      <button
                        onClick={doCommit}
                        disabled={committing}
                        className="flex items-center gap-1.5 px-3 py-2 app-accent-button disabled:opacity-50 rounded-lg text-sm transition-colors shrink-0"
                      >
                        {committing ? <Loader2 size={14} className="animate-spin" /> : <GitCommit size={14} />}
                        Commit
                      </button>
                    </div>
                    {commitResult && (
                      <p className={`text-xs ${commitResult.ok ? 'app-text-success' : 'app-text-danger'}`}>
                        {commitResult.ok ? `✓ Committed: "${commitResult.message}"` : `✗ ${commitResult.message}`}
                      </p>
                    )}
                  </div>

                  {/* Changed files */}
                  <div className="app-panel rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b app-divider flex items-center gap-2">
                      <span className="text-xs font-semibold app-text-faint uppercase tracking-wider">Working tree</span>
                      {gitData.changed.length > 0 && (
                        <span className="text-xs app-warning rounded-full px-1.5 py-0.5">{gitData.changed.length}</span>
                      )}
                    </div>
                    {gitData.changed.length === 0 ? (
                      <p className="px-4 py-3 text-sm app-text-faint">Clean — nothing to commit.</p>
                    ) : (
                      <div className="divide-y app-divider">
                        {gitData.changed.map((line, i) => {
                          const status = line.slice(0, 2).trim();
                          const file   = line.slice(3);
                          const color  = status === 'M' ? 'text-[color:var(--semantic-warning-text)]'
                            : status === 'A' ? 'text-[color:var(--semantic-success-text)]'
                            : status === 'D' ? 'text-[color:var(--semantic-danger-text)]'
                            : 'app-text-faint';
                          return (
                            <div key={i} className="flex items-center gap-3 px-4 py-2 font-mono">
                              <span className={`text-xs font-bold w-5 shrink-0 ${color}`}>{status || '?'}</span>
                              <span className="text-xs app-text truncate">{file}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Commit log */}
                  <div className="app-panel rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b app-divider">
                      <span className="text-xs font-semibold app-text-faint uppercase tracking-wider">Recent commits</span>
                    </div>
                    {gitData.log.length === 0 ? (
                      <p className="px-4 py-3 text-sm app-text-faint">No commits yet.</p>
                    ) : (
                      <div className="divide-y app-divider">
                        {gitData.log.map((entry, i) => (
                          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                            <code className="text-[11px] font-mono text-[color:var(--accent)] shrink-0 mt-0.5">{entry.hash}</code>
                            <span className="flex-1 text-sm app-text leading-snug">{entry.message}</span>
                            <span className="text-[11px] app-text-faint shrink-0 mt-0.5 whitespace-nowrap">
                              {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showCreateChapter && (
        <CreateChapterModal
          book={book}
          onClose={() => setShowCreateChapter(false)}
          onJobStarted={(_jobId, n) => {
            qc.invalidateQueries({ queryKey: keys.chapters(book.id) });
            qc.invalidateQueries({ queryKey: keys.jobs });
            setShowCreateChapter(false);
            setJobToast({ chapterNumber: n });
          }}
        />
      )}

      {showEnhance && (
        <EnhanceLoreModal book={book} onClose={() => setShowEnhance(false)} />
      )}

      {showLoreReview && (
        <LoreReviewModal book={book} onClose={() => setShowLoreReview(false)} />
      )}

      {generateType && (
        <GenerateContentModal
          book={book}
          type={generateType}
          hasExisting={generateType === 'characters' ? !!charactersContent : undefined}
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

      {/* ── Job started toast ──────────────────────────────────── */}
      {jobToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3.5 app-panel-strong rounded-2xl shadow-2xl max-w-xs" style={{ borderColor: 'var(--accent-border)' }}>
          <span className="w-2 h-2 mt-1.5 rounded-full animate-pulse shrink-0" style={{ background: 'var(--semantic-warning-dot)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium app-text-primary">Chapter {jobToast.chapterNumber} queued</p>
            <p className="text-xs app-text-muted mt-0.5">Writing in the background…</p>
            <button
              onClick={() => { navigate('/jobs'); setJobToast(null); }}
              className="text-xs app-link mt-1.5 transition-colors"
            >
              View jobs →
            </button>
          </div>
          <button
            onClick={() => setJobToast(null)}
            className="w-5 h-5 rounded flex items-center justify-center app-text-faint hover:text-[color:var(--text)] transition-colors shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
