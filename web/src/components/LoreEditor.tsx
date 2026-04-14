import { useState, useEffect } from 'react';
import { Save, X, Loader2, FileText, Search } from 'lucide-react';
import { useUpdateLore } from '../hooks';

interface Props {
  bookId: string;
  filename: string;
  initialContent: string;
  allFiles?: Record<string, string>;
  onClose: () => void;
  onSwitchFile?: (filename: string) => void;
}

export default function LoreEditor({ bookId, filename, initialContent, allFiles, onClose, onSwitchFile }: Props) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(false);
  const updateLore = useUpdateLore();

  // Reset content when file switches
  useEffect(() => {
    setContent(initialContent);
    setSaved(false);
  }, [filename, initialContent]);

  // Warn on unsaved close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (content !== initialContent) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [content, initialContent]);

  const save = async () => {
    await updateLore.mutateAsync({ bookId, filename, content });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDirty = content !== initialContent;

  const switchTo = (f: string) => {
    if (f === filename) return;
    if (isDirty && !confirm('You have unsaved changes. Discard and switch?')) return;
    onSwitchFile?.(f);
  };

  const fileList = allFiles ? Object.keys(allFiles).sort() : [];

  const [search, setSearch] = useState('');
  const searchLower = search.trim().toLowerCase();

  const filteredFiles = searchLower
    ? fileList.filter(f =>
        f.toLowerCase().includes(searchLower) ||
        (allFiles?.[f] ?? '').toLowerCase().includes(searchLower)
      )
    : fileList;

  return (
    <div className="flex h-full">
      {/* Editor area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b app-divider shrink-0">
          <span className="text-sm font-medium app-text-primary">{filename}</span>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs app-text-warning">Unsaved changes</span>
            )}
            {saved && (
              <span className="text-xs app-text-success">Saved!</span>
            )}
            <button
              onClick={save}
              disabled={!isDirty || updateLore.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium app-accent-button disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {updateLore.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
            <button
              onClick={() => {
                if (isDirty && !confirm('Discard changes?')) return;
                onClose();
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center app-icon-button transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Editor */}
        <textarea
          className="flex-1 w-full bg-transparent px-5 py-4 text-sm app-text-primary font-mono leading-relaxed resize-none focus:outline-none"
          value={content}
          onChange={e => setContent(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* Sidebar — file list */}
      {fileList.length > 0 && (
        <div className="w-56 shrink-0 border-l app-divider flex flex-col">
          <div className="px-3 py-3 border-b app-divider space-y-2">
            <span className="text-xs font-semibold app-text-faint uppercase tracking-wider">Lore Files</span>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 app-text-faint pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg pl-6 pr-2 py-1 text-xs app-text placeholder-[color:var(--text-faint)] focus:outline-none focus:border-[color:var(--accent-border)] transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {filteredFiles.length === 0 && (
              <p className="px-3 py-3 text-xs app-text-faint">No matches.</p>
            )}
            {filteredFiles.map(f => (
              <button
                key={f}
                onClick={() => switchTo(f)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors"
                style={f === filename
                  ? { color: 'var(--accent-strong)', background: 'var(--accent-soft)' }
                  : { color: 'var(--text-muted)' }
                }
                onMouseEnter={e => { if (f !== filename) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-muted)'; } }}
                onMouseLeave={e => { if (f !== filename) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = ''; } }}
              >
                <FileText size={11} className="shrink-0 opacity-60" />
                <span className="truncate">{f}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
