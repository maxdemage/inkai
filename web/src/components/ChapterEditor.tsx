import { useState, useEffect } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { useChapter, useUpdateChapter } from '../hooks';

interface Props {
  bookId: string;
  chapterNumber: number;
  onClose: () => void;
}

export default function ChapterEditor({ bookId, chapterNumber, onClose }: Props) {
  const { data, isLoading } = useChapter(bookId, chapterNumber);
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [saved, setSaved] = useState(false);
  const updateChapter = useUpdateChapter();

  useEffect(() => {
    if (data?.content !== undefined) {
      setContent(data.content);
      setInitialContent(data.content);
    }
  }, [data?.content]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (content !== initialContent) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [content, initialContent]);

  const save = async () => {
    await updateChapter.mutateAsync({ bookId, number: chapterNumber, content });
    setInitialContent(content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDirty = content !== initialContent;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b app-divider shrink-0">
        <span className="text-sm font-medium app-text-primary">
          Chapter {String(chapterNumber).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs app-text-warning">Unsaved changes</span>
          )}
          {saved && (
            <span className="text-xs app-text-success">Saved!</span>
          )}
          <button
            onClick={save}
            disabled={!isDirty || updateChapter.isPending || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium app-accent-button disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {updateChapter.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
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
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center app-text-faint">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <textarea
          className="flex-1 w-full bg-transparent px-5 py-4 text-sm app-text-primary font-mono leading-relaxed resize-none"
          value={content}
          onChange={e => setContent(e.target.value)}
          spellCheck={false}
          autoFocus
        />
      )}
    </div>
  );
}
