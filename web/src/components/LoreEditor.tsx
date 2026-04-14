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

  const [search, setSearch] = useState('');
  const searchLower = search.trim().toLowerCase();

  const switchTo = (f: string) => {
    if (f === filename) return;
    if (isDirty && !confirm('You have unsaved changes. Discard and switch?')) return;
    onSwitchFile?.(f);
  };

  const fileList = allFiles ? Object.keys(allFiles).sort() : [];

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <span className="text-sm font-medium text-slate-200">{filename}</span>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-amber-400">Unsaved changes</span>
            )}
            {saved && (
              <span className="text-xs text-emerald-400">Saved!</span>
            )}
            <button
              onClick={save}
              disabled={!isDirty || updateLore.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {updateLore.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
            <button
              onClick={() => {
                if (isDirty && !confirm('Discard changes?')) return;
                onClose();
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Editor */}
        <textarea
          className="flex-1 w-full bg-transparent px-5 py-4 text-sm text-slate-200 font-mono leading-relaxed resize-none focus:outline-none"
          value={content}
          onChange={e => setContent(e.target.value)}
          spellCheck={false}
        />
      </div>

      {/* Sidebar — file list */}
      {fileList.length > 0 && (
        <div className="w-56 shrink-0 border-l border-white/[0.06] flex flex-col">
          <div className="px-3 py-3 border-b border-white/[0.06] space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lore Files</span>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-6 pr-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {filteredFiles.length === 0 && (
              <p className="px-3 py-3 text-xs text-slate-600">No matches.</p>
            )}
            {filteredFiles.map(f => (
              <button
                key={f}
                onClick={() => switchTo(f)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  f === filename
                    ? 'text-violet-300 bg-violet-600/15'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
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
