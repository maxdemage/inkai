import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  noPadding?: boolean;
}

export default function Modal({ title, onClose, children, size = 'md', noPadding = false }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 app-overlay backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={ref}
        className={`w-full ${sizeClass} app-panel-strong rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b app-divider shrink-0">
            <h2 className="text-base font-semibold app-text-primary">{title}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center app-icon-button transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}
        <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'px-5 py-4'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
