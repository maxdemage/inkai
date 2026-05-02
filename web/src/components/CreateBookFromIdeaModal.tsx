import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import Modal from './Modal';
import SSEProgress from './SSEProgress';
import { keys } from '../hooks';
import type { BookRecord } from '../types';

const inputCls = 'w-full app-input rounded-lg px-3 py-2 text-sm';
const textareaCls = inputCls + ' resize-none';

type Step = 'form' | 'generating' | 'done' | 'error';

export default function CreateBookFromIdeaModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('form');
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [createdBook, setCreatedBook] = useState<BookRecord | null>(null);

  const validate = (): string | null => {
    if (!title.trim()) return 'Please enter a working title.';
    if (!idea.trim()) return 'Please describe your idea.';
    return null;
  };

  const handleGenerate = () => {
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    setStep('generating');
  };

  const stepLabel: Record<Step, string> = {
    form: 'New Book from Idea',
    generating: 'Generating…',
    done: 'Done!',
    error: 'Error',
  };

  return (
    <Modal
      title={stepLabel[step]}
      onClose={step === 'generating' ? undefined : onClose}
      size="lg"
    >
      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 px-3 py-2 app-danger rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      {/* Form */}
      {step === 'form' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 app-panel rounded-xl text-sm app-text-muted">
            <Lightbulb size={16} className="mt-0.5 shrink-0 app-text-warning" />
            <span>
              Just give your book a title and pour your thoughts into the idea field.
              The AI will figure out genre, type, lore, characters — everything — from what you write.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium app-text">Working title</label>
            <input
              className={inputCls}
              placeholder="e.g. The Last Signal"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium app-text">Your idea</label>
            <p className="text-xs app-text-faint">
              Stream of consciousness is fine. The more detail you give, the richer the generated lore will be.
            </p>
            <textarea
              className={textareaCls}
              rows={10}
              placeholder="Pour your thoughts here… What's the story? Who are the characters? What's the world like? What feeling do you want to create? Any scenes or moments already forming in your mind?"
              value={idea}
              onChange={e => setIdea(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleGenerate} className="btn-primary flex items-center gap-2">
              <Lightbulb size={14} />
              Generate Book
            </button>
          </div>
        </div>
      )}

      {/* Generating (SSE) */}
      {step === 'generating' && (
        <div className="space-y-4">
          <p className="text-sm app-text-muted">
            Analysing your idea and building the full book project with AI…
          </p>
          <SSEProgress
            path="/books/idea"
            method="POST"
            body={{ title: title.trim(), idea: idea.trim() }}
            onDone={(d) => {
              const data = d as { book?: BookRecord };
              setCreatedBook(data.book ?? null);
              qc.invalidateQueries({ queryKey: keys.books });
              setStep('done');
            }}
            onError={(msg) => {
              setErrorMsg(msg);
              setStep('error');
            }}
          />
        </div>
      )}

      {/* Done */}
      {step === 'done' && createdBook && (
        <div className="space-y-4 text-center py-4">
          <div className="text-5xl">✨</div>
          <div>
            <p className="text-lg font-semibold app-text-primary">{createdBook.title}</p>
            <p className="text-sm app-text-muted mt-1">
              Your book project has been created with AI-generated lore — all from your idea.
            </p>
            <p className="text-xs app-text-faint mt-1">
              {createdBook.genre}{createdBook.subgenre ? ` · ${createdBook.subgenre}` : ''} · {createdBook.type}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={onClose} className="btn-ghost">Close</button>
            <button
              onClick={() => { onClose(); navigate(`/books/${createdBook.id}`); }}
              className="btn-primary"
            >
              Open Book
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div className="space-y-4 py-4">
          <p className="text-sm app-text-danger">{errorMsg}</p>
          <div className="flex gap-2">
            <button onClick={() => { setStep('form'); setErrorMsg(''); }} className="btn-ghost">
              Back to Form
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
