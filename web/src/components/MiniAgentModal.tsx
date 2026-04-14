import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowRight, CheckCircle2, Loader2, ChevronDown, ChevronRight as ChevronRightIcon, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from './Modal';
import SSEProgress from './SSEProgress';
import { api } from '../api';
import type { GuiAgentStep, GuiAgentPlan } from '../types';

interface Props {
  bookId?: string;
  initialQuery?: string;
  onClose: () => void;
}

type Phase = 'idle' | 'planning' | 'running' | 'done' | 'error';

interface HistoryEntry {
  id: string;
  timestamp: number;
  intent: string;
  steps: string[];
}

const HISTORY_KEY = 'inkai-agent-history';
const MAX_HISTORY = 50;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryEntry[];
  } catch { return []; }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function endpointLabel(endpoint: string): string {
  if (endpoint.includes('/characters/extend')) return 'Character update';
  if (endpoint.includes('/characters'))         return 'Character generation';
  if (endpoint.includes('/story-arc'))           return 'Story arc';
  if (endpoint.includes('/timeline'))            return 'Timeline';
  if (endpoint.includes('/lore-review'))         return 'Lore review';
  return 'AI operation';
}

function stepSummary(step: GuiAgentStep, answer?: string): string {
  switch (step.type) {
    case 'say':      return step.message;
    case 'navigate': return `Navigated to ${step.description}`;
    case 'ask':      return `"${step.question}"${answer ? ` → "${answer}"` : ''}`;
    case 'sse':      return `${endpointLabel(step.endpoint)} completed`;
  }
}

function StepDone({ step, answer }: { step: GuiAgentStep; answer?: string }) {
  switch (step.type) {
    case 'say':
      return <p className="text-sm text-slate-300">{step.message}</p>;
    case 'navigate':
      return <p className="text-xs text-slate-500">↝ Navigated to {step.description}</p>;
    case 'ask':
      return (
        <div className="text-sm flex flex-wrap gap-1.5">
          <span className="text-slate-500">{step.question}</span>
          <span className="text-violet-300">→ {answer}</span>
        </div>
      );
    case 'sse':
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 size={14} />
          <span>{endpointLabel(step.endpoint)} completed</span>
        </div>
      );
  }
}

function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) return null;

  return (
    <div className="border-t border-white/[0.06] pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRightIcon size={12} />}
        <Clock size={11} />
        History ({history.length})
      </button>
      {open && (
        <div className="mt-2 space-y-1 max-h-52 overflow-y-auto pr-1">
          {history.map(entry => (
            <div key={entry.id} className="rounded-lg border border-white/[0.05] overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="flex items-start gap-2 w-full px-2.5 py-1.5 hover:bg-white/[0.03] text-left transition-colors"
              >
                <span className="text-violet-400/70 mt-0.5 shrink-0">⚡</span>
                <span className="flex-1 text-xs text-slate-400 leading-snug">{entry.intent}</span>
                <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
              {expandedId === entry.id && entry.steps.length > 0 && (
                <div className="px-3 pb-2 space-y-0.5">
                  {entry.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <span className="shrink-0 mt-0.5">›</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MiniAgentModal({ bookId, initialQuery, onClose }: Props) {
  const navigate    = useNavigate();
  const qc          = useQueryClient();

  const [input,    setInput]    = useState(initialQuery ?? '');
  const [phase,    setPhase]    = useState<Phase>('idle');
  const [intent,   setIntent]   = useState('');
  const [steps,    setSteps]    = useState<GuiAgentStep[]>([]);
  const [stepIdx,  setStepIdx]  = useState(0);
  const [answers,  setAnswers]  = useState<Record<string, string>>({});
  const [askInput, setAskInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [history,  setHistory]  = useState<HistoryEntry[]>(() => loadHistory());

  // Auto-submit when opened with a pre-filled query from Dashboard
  useEffect(() => {
    if (initialQuery?.trim()) {
      submit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ref so we can read current values inside the 'done' effect
  const stepsRef   = useRef(steps);
  const answersRef = useRef(answers);
  const intentRef  = useRef(intent);
  stepsRef.current   = steps;
  answersRef.current = answers;
  intentRef.current  = intent;

  const advance = () => setStepIdx(i => i + 1);

  // Auto-progress instant steps (say / navigate)
  useEffect(() => {
    if (phase !== 'running') return;
    if (stepIdx >= steps.length) { setPhase('done'); return; }
    const step = steps[stepIdx];
    if (step.type === 'say') {
      const t = setTimeout(advance, 60); return () => clearTimeout(t);
    }
    if (step.type === 'navigate') {
      navigate(step.to);
      const t = setTimeout(advance, 400); return () => clearTimeout(t);
    }
  }, [phase, stepIdx, steps, navigate]);

  // Save to history when a run completes
  useEffect(() => {
    if (phase !== 'done' || !intentRef.current) return;
    const stepSummaries = stepsRef.current.map(s =>
      stepSummary(s, s.type === 'ask' ? answersRef.current[s.key] : undefined)
    );
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      intent: intentRef.current,
      steps: stepSummaries,
    };
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const submit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setPhase('planning');
    setSteps([]); setStepIdx(0); setAnswers({}); setIntent(''); setErrorMsg('');
    try {
      const plan: GuiAgentPlan = await api.agent.plan(text, bookId);
      setIntent(plan.intent);
      setSteps(plan.steps);
      setStepIdx(0);
      setPhase(plan.steps.length === 0 ? 'done' : 'running');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const submitAnswer = () => {
    if (!askInput.trim()) return;
    const step = steps[stepIdx] as { type: 'ask'; key: string };
    setAnswers(prev => ({ ...prev, [step.key]: askInput.trim() }));
    setAskInput('');
    advance();
  };

  const onSseDone = () => { qc.invalidateQueries(); advance(); };

  const getSseBody = (step: GuiAgentStep): Record<string, unknown> | undefined => {
    if (step.type !== 'sse' || !step.bodyParam || !step.answerKey) return undefined;
    const ans = answers[step.answerKey];
    return ans ? { [step.bodyParam]: ans } : undefined;
  };

  const currentStep = phase === 'running' ? steps[stepIdx] : null;

  return (
    <Modal title="✦ Agent" onClose={onClose}>
      <div className="space-y-4 min-h-[80px]">

        {/* Intent banner */}
        {intent && (
          <div className="text-xs text-violet-300/80 bg-violet-600/10 border border-violet-500/20 rounded-lg px-3 py-2">
            {intent}
          </div>
        )}

        {/* Completed steps */}
        {steps.slice(0, stepIdx).map((step, i) => (
          <StepDone key={i} step={step} answer={step.type === 'ask' ? answers[step.key] : undefined} />
        ))}

        {/* Active: ask */}
        {currentStep?.type === 'ask' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">{currentStep.question}</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={askInput}
                onChange={e => setAskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                className="flex-1 bg-ink-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 placeholder:text-slate-600"
                placeholder="Your answer…"
              />
              <button
                onClick={submitAnswer}
                disabled={!askInput.trim()}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white transition-colors"
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Active: SSE */}
        {currentStep?.type === 'sse' && (
          <SSEProgress
            path={currentStep.endpoint}
            method="POST"
            body={getSseBody(currentStep)}
            onDone={onSseDone}
            onError={() => advance()}
          />
        )}

        {/* Planning spinner */}
        {phase === 'planning' && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            Planning…
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <p className="text-sm text-emerald-400">All done!</p>
        )}

        {/* Error */}
        {phase === 'error' && (
          <p className="text-sm text-red-400">{errorMsg || 'Something went wrong.'}</p>
        )}

        {/* Input */}
        {(phase === 'idle' || phase === 'done' || phase === 'error') && (
          <div className={`space-y-2${phase !== 'idle' ? ' border-t border-white/[0.06] pt-4' : ''}`}>
            <div className="flex gap-2">
              <input
                autoFocus={phase === 'idle'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                className="flex-1 bg-ink-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 placeholder:text-slate-600"
                placeholder={phase === 'idle' ? 'What would you like to do?' : 'Ask something else…'}
              />
              <button
                onClick={submit}
                disabled={!input.trim()}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
            {phase === 'idle' && (
              <p className="text-xs text-slate-600">
                e.g. "Update characters with a new villain" · "Generate the story arc"
              </p>
            )}
          </div>
        )}

        {/* History */}
        <HistoryPanel history={history} />

      </div>
    </Modal>
  );
}

