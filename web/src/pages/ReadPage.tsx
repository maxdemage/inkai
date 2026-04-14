import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowRight, BookOpen, X, PanelRight, PanelRightClose, Type, Pencil, Check, Search } from 'lucide-react';
import { useChapter, useChapters, useReview, useLore, useBook, useUpdateChapter } from '../hooks';

// ── Lore term extraction ────────────────────────────────────────

interface LoreTerm {
  term: string;
  content: string;
  filename: string;
}

function extractLoreTerms(loreFiles: Record<string, string>): LoreTerm[] {
  const terms: LoreTerm[] = [];

  for (const [filename, content] of Object.entries(loreFiles)) {
    if (filename === 'summary-of-chapters.md') continue;

    // H2 and H3 headers are key terms
    const headers = content.matchAll(/^#{2,3}\s+(.+)$/gm);
    for (const m of headers) {
      const term = m[1].trim().replace(/[*_`]/g, '');
      if (term.length >= 3 && term.length <= 60) {
        terms.push({ term, content, filename });
      }
    }

    // Bold terms **term**
    const bold = content.matchAll(/\*\*([^*]{2,40})\*\*/g);
    for (const m of bold) {
      terms.push({ term: m[1].trim(), content, filename });
    }
  }

  // Deduplicate (keep first occurrence per lowercased term)
  const seen = new Set<string>();
  return terms
    .filter(t => {
      const key = t.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.term.length - a.term.length); // longest first = avoid partial matches
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── React children lore highlighter ────────────────────────────

function highlightString(text: string, terms: LoreTerm[], onClickTerm: (t: LoreTerm) => void): React.ReactNode {
  if (!text || terms.length === 0) return text;

  const pattern = new RegExp(
    `\\b(${terms.map(t => escapeRegex(t.term)).join('|')})\\b`,
    'gi',
  );

  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const idx = match.index!;
    if (idx > last) parts.push(text.slice(last, idx));
    const matched = match[1];
    const termInfo = terms.find(t => t.term.toLowerCase() === matched.toLowerCase())!;
    parts.push(
      <span
        key={key++}
        className="lore-term"
        onClick={() => onClickTerm(termInfo)}
      >
        {matched}
      </span>,
    );
    last = idx + matched.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return parts.length === 0 ? text : <>{parts}</>;
}

function processNode(node: React.ReactNode, terms: LoreTerm[], onClick: (t: LoreTerm) => void): React.ReactNode {
  if (typeof node === 'string') return highlightString(node, terms, onClick);
  if (Array.isArray(node)) return node.map((child, i) => {
    const processed = processNode(child, terms, onClick);
    return processed === child ? child : <span key={i}>{processed}</span>;
  });
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    const newChildren = processNode(el.props.children, terms, onClick);
    if (newChildren === el.props.children) return node;
    return { ...el, props: { ...el.props, children: newChildren } };
  }
  return node;
}

function HighlightedPara({ children, terms, onClick }: {
  children?: React.ReactNode;
  terms: LoreTerm[];
  onClick: (t: LoreTerm) => void;
}) {
  return <p>{processNode(children, terms, onClick)}</p>;
}

// ── Inline paragraph editor ────────────────────────────────────

interface ParagraphBlockProps {
  raw: string;
  terms: LoreTerm[];
  onTermClick: (t: LoreTerm) => void;
  textColor: string;
  onSave: (newRaw: string) => Promise<void>;
}

function ParagraphBlock({ raw, terms, onTermClick, textColor, onSave }: ParagraphBlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setDraft(raw);
    setEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // auto-size
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    }, 0);
  };

  const cancel = () => { setEditing(false); setDraft(''); };

  const save = async () => {
    if (draft === raw) { cancel(); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void save(); }
  };

  if (editing) {
    return (
      <div className="relative my-1 -mx-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={onKeyDown}
          disabled={saving}
          className="w-full px-3 py-2 rounded-lg bg-black/10 border border-violet-500/40 text-sm resize-none outline-none focus:border-violet-500/70 transition-colors"
          style={{ color: textColor, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', minHeight: '3em' }}
          rows={3}
        />
        <div className="flex items-center gap-2 mt-1.5 justify-end">
          <span className="text-[10px] opacity-40" style={{ color: textColor }}>Ctrl+Enter to save · Esc to cancel</span>
          <button onClick={cancel} disabled={saving} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/[0.07] hover:bg-white/[0.12] opacity-60 hover:opacity-100 transition-all" style={{ color: textColor }}>
            <X size={10} /> Cancel
          </button>
          <button onClick={() => { void save(); }} disabled={saving} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 transition-all disabled:opacity-50">
            <Check size={10} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <HighlightedPara terms={terms} onClick={onTermClick}>
              {children}
            </HighlightedPara>
          ),
        }}
      >
        {raw}
      </ReactMarkdown>
      <button
        onClick={startEdit}
        title="Edit this paragraph"
        className="absolute right-0 top-0 w-6 h-6 flex items-center justify-center rounded-md bg-black/20 hover:bg-violet-600/40 transition-all opacity-0 group-hover:opacity-100"
        style={{ color: textColor }}
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}

// ── Lore popover ────────────────────────────────────────────────

function LorePopover({ term, onClose }: { term: LoreTerm; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed bottom-6 right-[calc(320px+1.5rem)] z-30 w-72 bg-ink-800 border border-violet-500/30 rounded-2xl shadow-2xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">{term.filename.replace('.md', '')}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={13} /></button>
      </div>
      <h3 className="text-sm font-bold text-white mb-2">{term.term}</h3>
      <div className="prose-dark text-xs max-h-48 overflow-y-auto">
        <ReactMarkdown>{term.content.slice(0, 800)}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── Reading settings ───────────────────────────────────────────

const FONT_SIZES = [
  { label: 'S',  value: '15px' },
  { label: 'M',  value: '18px' },
  { label: 'L',  value: '21px' },
  { label: 'XL', value: '25px' },
];

const FONTS = [
  { label: 'Serif',       value: 'Georgia, "Times New Roman", serif' },
  { label: 'Sans',        value: 'system-ui, sans-serif' },
  { label: 'Mono',        value: '"Courier New", Courier, monospace' },
  { label: 'Humanist',    value: 'Palatino, "Book Antiqua", serif' },
];

const BG_THEMES = [
  { label: 'Paper',   bg: '#f5f0e8', border: '#d8d0be', topBg: '#f0ebe0' },
  { label: 'White',   bg: '#ffffff', border: '#e5e7eb', topBg: '#f9fafb' },
  { label: 'Dusk',    bg: '#1e1b2e', border: '#2d2a40', topBg: '#17152a' },
  { label: 'Dark',    bg: '#0f0f0f', border: '#262626', topBg: '#0a0a0a' },
  { label: 'Sepia',   bg: '#f8f1e4', border: '#d4c5a9', topBg: '#f0e8d4' },
  { label: 'Forest',  bg: '#1a2420', border: '#2a3830', topBg: '#141e1a' },
];

const TEXT_COLORS = [
  { label: 'Ink',       value: '#2a2520' },
  { label: 'Charcoal',  value: '#374151' },
  { label: 'Slate',     value: '#94a3b8' },
  { label: 'Cream',     value: '#e8dfc8' },
  { label: 'White',     value: '#f9fafb' },
  { label: 'Warm',      value: '#c9a87c' },
];

interface ReadingSettings {
  fontSize: string;
  fontFamily: string;
  bgTheme: string; // bg hex
  textColor: string;
}

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: '18px',
  fontFamily: FONTS[0].value,
  bgTheme: BG_THEMES[0].bg,
  textColor: TEXT_COLORS[0].value,
};

function loadSettings(): ReadingSettings {
  try {
    const raw = localStorage.getItem('inkai-reading-settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

// ── Main reading page ───────────────────────────────────────────

export default function ReadPage() {
  const { id, n } = useParams<{ id: string; n: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chapterNum = parseInt(n!, 10);

  const { data: book } = useBook(id!);
  const { data: chapterData, isLoading } = useChapter(id!, chapterNum);
  const { data: chapters = [] } = useChapters(id!);
  const chapterMeta = chapters.find(c => c.number === chapterNum);
  const [readingTab, setReadingTab] = useState<'chapter' | 'review'>(
    searchParams.get('tab') === 'review' ? 'review' : 'chapter',
  );
  const { data: reviewData } = useReview(id!, chapterNum, readingTab === 'review');
  const { data: loreFiles = {} } = useLore(id!);

  const hasReview = !!(chapterMeta?.hasReview || reviewData?.content);

  const [showLore, setShowLore] = useState(true);
  const [selectedLoreFile, setSelectedLoreFile] = useState<string | null>(null);
  const [loreSearch, setLoreSearch] = useState('');
  const [activeTerm, setActiveTerm] = useState<LoreTerm | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReadingSettings>(loadSettings);
  const [readProgress, setReadProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setReadProgress(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const updateSetting = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem('inkai-reading-settings', JSON.stringify(next));
  };

  const theme = BG_THEMES.find(t => t.bg === settings.bgTheme) ?? BG_THEMES[0];
  const isDark = ['#1e1b2e','#0f0f0f','#1a2420'].includes(theme.bg);
  const uiText    = isDark ? '#a09888' : '#6b6358';
  const uiTextHov = isDark ? '#e8e0d0' : '#2a2520';
  const uiHoverBg = isDark ? 'rgba(255,255,255,0.07)' : '#e0d8c8';
  const uiBorder  = theme.border;

  const loreTerms = useMemo(() => extractLoreTerms(loreFiles), [loreFiles]);

  const onTermClick = useCallback((t: LoreTerm) => {
    setActiveTerm(t);
    setSelectedLoreFile(t.filename);
  }, []);

  const selectedLoreContent = selectedLoreFile ? loreFiles[selectedLoreFile] : null;
  const loreSidebarFiles = Object.entries(loreFiles).filter(([f]) => f !== 'summary-of-chapters.md');

  const loreSearchLower = loreSearch.trim().toLowerCase();
  const filteredLoreSidebarFiles = loreSearchLower
    ? loreSidebarFiles.filter(([f, content]) =>
        f.toLowerCase().includes(loreSearchLower) ||
        content.toLowerCase().includes(loreSearchLower)
      )
    : loreSidebarFiles;

  const currentContent = readingTab === 'review' ? reviewData?.content : chapterData?.content;

  const updateChapter = useUpdateChapter();
  const chapterBlocks = useMemo(
    () => (chapterData?.content ?? '').split(/\n\n+/),
    [chapterData?.content],
  );

  const saveBlock = useCallback(
    async (blockIndex: number, newRaw: string) => {
      const updated = [...chapterBlocks];
      updated[blockIndex] = newRaw;
      await updateChapter.mutateAsync({ bookId: id!, number: chapterNum, content: updated.join('\n\n') });
    },
    [chapterBlocks, id, chapterNum, updateChapter],
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme.bg }}>
      {/* ── Top bar ────────────────────────────────────── */}
      <div className="h-12 flex items-center justify-between px-4 shrink-0 z-20" style={{ background: theme.topBg, borderBottom: `1px solid ${uiBorder}` }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/books/${id}`)}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: uiText }}
            onMouseEnter={e => (e.currentTarget.style.color = uiTextHov)}
            onMouseLeave={e => (e.currentTarget.style.color = uiText)}
          >
            <ArrowLeft size={13} /> Back
          </button>
          <span style={{ color: uiBorder }}>·</span>
          <span className="text-xs font-medium" style={{ color: uiTextHov }}>{book?.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Chapter navigation */}
          <button
            onClick={() => navigate(`/books/${id}/read/${chapterNum - 1}`)}
            disabled={chapterNum <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ color: uiText }}
            onMouseEnter={e => { e.currentTarget.style.background = uiHoverBg; e.currentTarget.style.color = uiTextHov; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = uiText; }}
          >
            <ArrowLeft size={14} />
          </button>
          <span className="text-xs font-medium min-w-[80px] text-center" style={{ color: uiTextHov }}>
            Chapter {chapterNum}{book ? ` / ${book.chapterCount}` : ''}
          </span>
          <button
            onClick={() => navigate(`/books/${id}/read/${chapterNum + 1}`)}
            disabled={!book || chapterNum >= book.chapterCount}
            className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ color: uiText }}
            onMouseEnter={e => { e.currentTarget.style.background = uiHoverBg; e.currentTarget.style.color = uiTextHov; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = uiText; }}
          >
            <ArrowRight size={14} />
          </button>

          {/* View tabs */}
          {hasReview && (
            <div className="flex items-center gap-0.5 rounded-lg p-0.5 ml-2" style={{ background: uiHoverBg }}>
              <button
                onClick={() => setReadingTab('chapter')}
                className="px-2.5 py-1 text-xs rounded-md transition-colors"
                style={readingTab === 'chapter'
                  ? { background: theme.bg, color: uiTextHov, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                  : { color: uiText }}
              >
                Chapter
              </button>
              <button
                onClick={() => setReadingTab('review')}
                className="px-2.5 py-1 text-xs rounded-md transition-colors"
                style={readingTab === 'review'
                  ? { background: theme.bg, color: uiTextHov, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                  : { color: uiText }}
              >
                Review
              </button>
            </div>
          )}

          {/* Typography settings */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowSettings(s => !s)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: showSettings ? uiTextHov : uiText, background: showSettings ? uiHoverBg : 'transparent' }}
              title="Reading settings"
            >
              <Type size={14} />
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowSettings(false)} />
                <div
                  className="absolute right-0 top-9 z-30 w-64 rounded-2xl shadow-2xl p-4 space-y-4"
                  style={{ background: theme.topBg, border: `1px solid ${uiBorder}` }}
                >
                  {/* Font size */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: uiText }}>Font size</p>
                    <div className="flex gap-1.5">
                      {FONT_SIZES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => updateSetting('fontSize', s.value)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={settings.fontSize === s.value
                            ? { background: isDark ? '#ffffff18' : '#00000014', color: uiTextHov }
                            : { color: uiText }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font family */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: uiText }}>Typeface</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FONTS.map(f => (
                        <button
                          key={f.value}
                          onClick={() => updateSetting('fontFamily', f.value)}
                          className="py-1.5 rounded-lg text-xs transition-colors text-left px-2.5"
                          style={{
                            fontFamily: f.value,
                            ...(settings.fontFamily === f.value
                              ? { background: isDark ? '#ffffff18' : '#00000014', color: uiTextHov }
                              : { color: uiText }),
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: uiText }}>Background</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {BG_THEMES.map(t => (
                        <button
                          key={t.bg}
                          onClick={() => updateSetting('bgTheme', t.bg)}
                          title={t.label}
                          className="w-7 h-7 rounded-lg transition-all"
                          style={{
                            background: t.bg,
                            border: settings.bgTheme === t.bg ? `2px solid ${uiText}` : `1px solid ${uiBorder}`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Text color */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: uiText }}>Text color</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {TEXT_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => updateSetting('textColor', c.value)}
                          title={c.label}
                          className="w-7 h-7 rounded-lg transition-all"
                          style={{
                            background: c.value,
                            border: settings.textColor === c.value ? `2px solid ${uiText}` : `1px solid ${uiBorder}`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Toggle lore panel */}
          <button
            onClick={() => setShowLore(!showLore)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors ml-1"
            style={{ color: uiText }}
            onMouseEnter={e => { e.currentTarget.style.background = uiHoverBg; e.currentTarget.style.color = uiTextHov; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = uiText; }}
            title={showLore ? 'Hide lore panel' : 'Show lore panel'}
          >
            {showLore ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
          </button>

          {/* Edit chapter */}
          {readingTab === 'chapter' && chapterData?.content && (
            <button
              onClick={() => navigate(`/books/${id}`, { state: { editChapter: chapterNum } })}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: uiText }}
              onMouseEnter={e => { e.currentTarget.style.background = uiHoverBg; e.currentTarget.style.color = uiTextHov; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = uiText; }}
              title="Edit chapter"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Read progress bar ──────────────────────────────────── */}
      <div className="h-0.5 shrink-0" style={{ background: uiHoverBg }}>
        <div
          className="h-full transition-all duration-150"
          style={{ width: `${readProgress}%`, background: uiText, opacity: 0.5 }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Reading area ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-2xl mx-auto px-8 py-12">
            {isLoading && (
              <div className="text-center text-sm" style={{ color: uiText }}>Loading…</div>
            )}

            {!isLoading && !currentContent && (
              <div className="text-center text-sm py-16" style={{ color: uiText }}>
                <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                {readingTab === 'review' ? 'No review found for this chapter.' : 'Chapter not found.'}
              </div>
            )}

            {!isLoading && currentContent && (
              <div
                className="reading-content"
                style={{ fontSize: settings.fontSize, fontFamily: settings.fontFamily, color: settings.textColor }}
              >
                {readingTab === 'review' ? (
                  /* Review is always plain — no lore highlighting */
                  <ReactMarkdown>{currentContent}</ReactMarkdown>
                ) : (
                  /* Chapter — highlight lore terms + inline block editing */
                  <div className="pr-8">
                    {chapterBlocks.map((block, i) => (
                      <ParagraphBlock
                        key={i}
                        raw={block}
                        terms={loreTerms}
                        onTermClick={onTermClick}
                        textColor={settings.textColor}
                        onSave={(newRaw) => saveBlock(i, newRaw)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Lore sidebar ─────────────────────────────────────── */}
        {showLore && (
          <aside className="w-80 shrink-0 bg-ink-900 border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] shrink-0 space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lore</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Click highlighted terms in text or select a file</p>
              </div>
              {!selectedLoreFile && (
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={loreSearch}
                    onChange={e => setLoreSearch(e.target.value)}
                    placeholder="Search lore…"
                    className="w-full bg-ink-950 border border-white/[0.08] rounded-lg pl-6 pr-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              )}
            </div>

            {selectedLoreFile && selectedLoreContent ? (
              /* Show selected lore file */
              <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] shrink-0">
                  <span className="text-xs font-medium text-violet-300">{selectedLoreFile.replace('.md', '')}</span>
                  <button
                    onClick={() => setSelectedLoreFile(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="px-4 py-4 prose-dark text-xs">
                  <ReactMarkdown>{selectedLoreContent}</ReactMarkdown>
                </div>
              </div>
            ) : (
              /* Show lore file list */
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                {filteredLoreSidebarFiles.map(([filename]) => {
                  const hasTermInChapter = loreTerms.some(t => t.filename === filename);
                  return (
                    <button
                      key={filename}
                      onClick={() => setSelectedLoreFile(filename)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-white/[0.05] transition-colors group"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasTermInChapter ? 'bg-violet-400' : 'bg-slate-700'}`} />
                      <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors truncate">
                        {filename.replace('.md', '')}
                      </span>
                    </button>
                  );
                })}
                {loreSidebarFiles.length === 0 && (
                  <p className="px-3 text-xs text-slate-600 py-4">No lore files found.</p>
                )}
                {loreSidebarFiles.length > 0 && filteredLoreSidebarFiles.length === 0 && (
                  <p className="px-3 text-xs text-slate-600 py-4">No matches.</p>
                )}
              </div>
            )}

            {loreTerms.length > 0 && (
              <div className="px-4 py-2.5 border-t border-white/[0.04] shrink-0">
                <p className="text-[10px] text-slate-600">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-1 align-middle" />
                  {loreTerms.length} terms detected
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Lore term popover ────────────────────────────────────── */}
      {activeTerm && !showLore && (
        <LorePopover term={activeTerm} onClose={() => setActiveTerm(null)} />
      )}
    </div>
  );
}
