import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import Modal from './Modal';
import SSEProgress from './SSEProgress';
import { api } from '../api';
import { BOOK_TYPES, GENRES } from '../types';
import type { BookRecord, LoreQuestion, BookType } from '../types';
import { keys } from '../hooks';

// ── Form field helpers ───────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium app-text">{label}</label>
      {children}
      {hint && <p className="text-xs app-text-faint">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full app-input rounded-lg px-3 py-2 text-sm';
const textareaCls = inputCls + ' resize-none';

// ── Step 1: Basic info ───────────────────────────────────────────

interface BasicInfo {
  projectName: string;
  title: string;
  type: BookType;
  genre: string;
  subgenreCustom: string;
  subgenre: string;
  authors: string;
  purpose: string;
  summary: string;
}

function Step1({ value, onChange }: { value: BasicInfo; onChange: (v: BasicInfo) => void }) {
  const u = (k: keyof BasicInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <Field label="Project name" hint="Permanent ID — lowercase, hyphens only. e.g. my-novel">
        <input
          className={inputCls}
          placeholder="my-novel"
          value={value.projectName}
          onChange={u('projectName')}
          pattern="[a-z0-9][a-z0-9-]*"
        />
      </Field>
      <Field label="Book title">
        <input className={inputCls} placeholder="The Great Story" value={value.title} onChange={u('title')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select className={inputCls} value={value.type} onChange={u('type')}>
            {BOOK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Genre">
          <select className={inputCls} value={value.genre} onChange={u('genre')}>
            {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
      </div>
      {value.genre === '__other__' && (
        <Field label="Custom genre">
          <input className={inputCls} value={value.subgenreCustom} onChange={u('subgenreCustom')} />
        </Field>
      )}
      <Field label="Sub-genre" hint="e.g. dark fantasy, cyberpunk, cozy mystery">
        <input className={inputCls} placeholder="Optional" value={value.subgenre} onChange={u('subgenre')} />
      </Field>
      <Field label="Author(s)" hint="Comma-separated">
        <input className={inputCls} placeholder="Anonymous" value={value.authors} onChange={u('authors')} />
      </Field>
      <Field label="Purpose" hint="e.g. entertainment, education, personal memoir">
        <input className={inputCls} placeholder="Entertainment" value={value.purpose} onChange={u('purpose')} />
      </Field>
      <Field label="Story summary" hint="A short summary of what this book is about.">
        <textarea className={textareaCls} rows={4} placeholder="In a world where…" value={value.summary} onChange={u('summary')} />
      </Field>
    </div>
  );
}

// ── AI Question step ─────────────────────────────────────────────

function QuestionStep({
  title,
  questions,
  answers,
  onChange,
}: {
  title: string;
  questions: LoreQuestion[];
  answers: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm app-text-muted">{title}</p>
      {questions.map(q => (
        <Field key={q.key} label={q.question}>
          {q.type === 'multiline' ? (
            <textarea
              className={textareaCls}
              rows={3}
              value={answers[q.key] ?? ''}
              onChange={e => onChange(q.key, e.target.value)}
              placeholder={q.required ? 'Required' : 'Optional'}
            />
          ) : q.type === 'choice' && q.choices ? (
            <select className={inputCls} value={answers[q.key] ?? ''} onChange={e => onChange(q.key, e.target.value)}>
              <option value="">Choose…</option>
              {q.choices.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input
              className={inputCls}
              value={answers[q.key] ?? ''}
              onChange={e => onChange(q.key, e.target.value)}
              placeholder={q.required ? 'Required' : 'Optional'}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

// ── Wizard ──────────────────────────────────────────────────────

const DEFAULT_INFO: BasicInfo = {
  projectName: '',
  title: '',
  type: 'novel',
  genre: 'fantasy',
  subgenreCustom: '',
  subgenre: '',
  authors: '',
  purpose: 'Entertainment',
  summary: '',
};

type Step = 'basic' | 'loading-r1' | 'round1' | 'loading-r2' | 'round2' | 'creating' | 'done' | 'error';

export default function CreateBookWizard({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('basic');
  const [info, setInfo] = useState<BasicInfo>(DEFAULT_INFO);
  const [r1Questions, setR1Questions] = useState<LoreQuestion[]>([]);
  const [r2Questions, setR2Questions] = useState<LoreQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [createdBook, setCreatedBook] = useState<BookRecord | null>(null);

  const setAnswer = (k: string, v: string) => setAnswers(prev => ({ ...prev, [k]: v }));

  const getBaseData = () => ({
    projectName: info.projectName.trim().toLowerCase().replace(/\s+/g, '-'),
    title: info.title.trim(),
    type: info.type,
    genre: info.genre === '__other__' ? info.subgenreCustom.trim() : info.genre,
    subgenre: info.subgenre.trim(),
    authors: info.authors ? info.authors.split(',').map(a => a.trim()).filter(Boolean) : ['Anonymous'],
    purpose: info.purpose.trim() || 'Entertainment',
    summary: info.summary.trim(),
  });

  const validateStep1 = (): string | null => {
    const d = getBaseData();
    if (!d.projectName) return 'Project name is required';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(d.projectName)) return 'Project name: lowercase letters, numbers, hyphens only';
    if (!d.title) return 'Book title is required';
    if (!d.summary) return 'Story summary is required';
    return null;
  };

  const goToRound1 = async () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep('loading-r1');
    try {
      const base = getBaseData();
      const { questions } = await api.books.wizardStart({
        title: base.title, type: base.type, genre: base.genre, subgenre: base.subgenre,
        purpose: base.purpose, summary: base.summary,
      });
      setR1Questions(questions);
      setStep('round1');
    } catch (e) {
      setError(String(e));
      setStep('basic');
    }
  };

  const goToRound2 = async () => {
    setStep('loading-r2');
    try {
      const base = getBaseData();
      const { questions } = await api.books.wizardRound2({
        title: base.title, type: base.type, genre: base.genre, subgenre: base.subgenre,
        purpose: base.purpose, summary: base.summary, round1Answers: answers,
      });
      setR2Questions(questions);
      setStep('round2');
    } catch (e) {
      setError(String(e));
      setStep('round1');
    }
  };

  const createBook = () => {
    setStep('creating');
  };

  const stepLabel: Record<Step, string> = {
    basic: 'Step 1 of 4 — Basic Info',
    'loading-r1': 'Step 2 of 4 — Loading Questions…',
    round1: 'Step 2 of 4 — Story Foundation',
    'loading-r2': 'Step 3 of 4 — Loading Questions…',
    round2: 'Step 3 of 4 — Refining Details',
    creating: 'Step 4 of 4 — Creating Book',
    done: 'Done!',
    error: 'Error',
  };

  return (
    <Modal title={`New Book — ${stepLabel[step]}`} onClose={step === 'creating' ? undefined : onClose} size="lg">
      {/* Error banner */}
      {error && (
        <div className="mb-4 px-3 py-2 app-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step: basic */}
      {step === 'basic' && (
        <>
          <Step1 value={info} onChange={setInfo} />
          <div className="mt-5 flex justify-end">
            <button onClick={goToRound1} className="btn-primary flex items-center gap-2">
              Continue <ChevronRight size={15} />
            </button>
          </div>
        </>
      )}

      {/* Loading states */}
      {(step === 'loading-r1' || step === 'loading-r2') && (
        <div className="flex flex-col items-center gap-3 py-10 app-text-muted">
          <Loader2 size={28} className="animate-spin text-[color:var(--accent)]" />
          <p className="text-sm">Generating AI questions…</p>
        </div>
      )}

      {/* Round 1 */}
      {step === 'round1' && (
        <>
          <QuestionStep
            title="Let's establish the core of your book — story, characters, world."
            questions={r1Questions}
            answers={answers}
            onChange={setAnswer}
          />
          <div className="mt-5 flex justify-between">
            <button onClick={() => setStep('basic')} className="btn-ghost flex items-center gap-1.5">
              <ChevronLeft size={15} /> Back
            </button>
            <button onClick={goToRound2} className="btn-primary flex items-center gap-2">
              Continue <ChevronRight size={15} />
            </button>
          </div>
        </>
      )}

      {/* Round 2 */}
      {step === 'round2' && (
        <>
          <QuestionStep
            title="Now let's dig deeper — genre identity, tone, themes, and audience."
            questions={r2Questions}
            answers={answers}
            onChange={setAnswer}
          />
          <div className="mt-5 flex justify-between">
            <button onClick={() => setStep('round1')} className="btn-ghost flex items-center gap-1.5">
              <ChevronLeft size={15} /> Back
            </button>
            <button onClick={createBook} className="btn-primary flex items-center gap-2">
              <Sparkles size={15} /> Create Book
            </button>
          </div>
        </>
      )}

      {/* Creating (SSE) */}
      {step === 'creating' && (
        <div className="space-y-4">
          <p className="text-sm app-text-muted">Generating your book project and lore files with AI…</p>
          <SSEProgress
            path="/books"
            method="POST"
            body={{ ...getBaseData(), answers }}
            onDone={(d) => {
              const data = d as { book?: BookRecord };
              setCreatedBook(data.book ?? null);
              qc.invalidateQueries({ queryKey: keys.books });
              setStep('done');
            }}
            onError={(msg) => {
              setError(msg);
              setStep('error');
            }}
          />
        </div>
      )}

      {/* Done */}
      {step === 'done' && createdBook && (
        <div className="space-y-4 text-center py-4">
          <div className="text-5xl">🎉</div>
          <div>
            <p className="text-lg font-semibold app-text-primary">{createdBook.title}</p>
            <p className="text-sm app-text-muted mt-1">Your book project has been created with AI-generated lore.</p>
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

      {/* Error fallback */}
      {step === 'error' && (
        <div className="space-y-4 py-4">
          <p className="text-sm app-text-danger">{error}</p>
          <button onClick={() => setStep('round2')} className="btn-ghost">Try Again</button>
        </div>
      )}
    </Modal>
  );
}
