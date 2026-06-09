import React, { useEffect } from 'react';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

const icons = { success: '✓', error: '✗', info: 'ℹ' };
const styles = {
  success: 'bg-emerald-950/90 border-emerald-700/50 text-emerald-300',
  error:   'bg-red-950/90 border-red-700/50 text-red-300',
  info:    'bg-slate-900/90 border-slate-700/50 text-slate-300',
};

export const ToastContainer: React.FC<Props> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl animate-fade-in ${styles[toast.type]}`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <span className="font-bold">{icons[toast.type]}</span>
      {toast.message}
    </div>
  );
};
