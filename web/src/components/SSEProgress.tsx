import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { streamSSE } from '../api';

interface SSEProgressProps {
  path: string;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  onDone?: (data: unknown) => void;
  onError?: (msg: string) => void;
}

export default function SSEProgress({ path, method = 'POST', body, onDone, onError }: SSEProgressProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running');
  const [errorMsg, setErrorMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ReturnType<typeof streamSSE> | null>(null);

  useEffect(() => {
    const handle = streamSSE(path, method, body);
    handleRef.current = handle;

    handle
      .on('progress', (d) => {
        const msg = (d as { message?: string }).message ?? String(d);
        setMessages(prev => [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .on('done', (d) => {
        setStatus('done');
        onDone?.(d);
      })
      .on('error', (d) => {
        const msg = (d as { message?: string }).message ?? String(d);
        setErrorMsg(msg);
        setStatus('error');
        onError?.(msg);
      });

    return () => handle.cancel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="app-panel-strong rounded-xl p-4 min-h-20 max-h-60 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2 text-sm app-text-muted">
            <span className="mt-0.5 shrink-0">›</span>
            <span>{m}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {status === 'running' && (
        <div className="flex items-center gap-2 text-sm app-text-warning">
          <Loader2 size={14} className="animate-spin" />
          Working — this may take a minute…
        </div>
      )}
      {status === 'done' && (
        <div className="flex items-center gap-2 text-sm app-text-success">
          <CheckCircle2 size={14} />
          Done!
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm app-text-danger">
          <XCircle size={14} />
          Error: {errorMsg}
        </div>
      )}
    </div>
  );
}
