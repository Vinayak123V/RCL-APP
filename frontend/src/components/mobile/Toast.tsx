import React, { useEffect, useRef, useState } from 'react';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ─── Single-slot toast container ─────────────────────────────────────────────
// Only one toast is visible at a time. A new toast replaces the previous one
// immediately. Each toast auto-dismisses after 3 s with a 300 ms fade-out.

interface ContainerProps {
  toasts: ToastMessage[];          // we only ever read the last entry
  onRemove: (id: number) => void;
}

export const ToastContainer: React.FC<ContainerProps> = ({ toasts, onRemove }) => {
  // Take only the most-recent toast
  const latest = toasts[toasts.length - 1] ?? null;
  return (
    <div className="fixed top-4 left-0 right-0 flex flex-col items-center z-50 pointer-events-none px-4">
      {latest && (
        <ToastItem key={latest.id} toast={latest} onRemove={onRemove} />
      )}
    </div>
  );
};

// ─── Individual toast item ────────────────────────────────────────────────────
const STYLES = {
  success: { bg: 'rgba(6,78,59,0.97)',   border: 'rgba(34,197,94,0.35)',   icon: '✓', color: '#22c55e' },
  error:   { bg: 'rgba(69,10,10,0.97)',  border: 'rgba(239,68,68,0.35)',   icon: '✕', color: '#ef4444' },
  info:    { bg: 'rgba(15,23,42,0.97)',  border: 'rgba(255,255,255,0.12)', icon: 'ℹ', color: '#94a3b8' },
};

const VISIBLE_MS  = 3000;   // how long the toast stays fully visible
const FADE_OUT_MS = 300;    // fade-out duration

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({
  toast,
  onRemove,
}) => {
  const s = STYLES[toast.type];
  const [phase, setPhase] = useState<'in' | 'visible' | 'out'>('in');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timer on unmount
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    // Slide-in → visible → fade-out → remove
    // 'in' phase is driven by CSS (animate-fade-up), switch to 'visible' after 1 frame
    const rafId = requestAnimationFrame(() => setPhase('visible'));

    timerRef.current = setTimeout(() => {
      setPhase('out');
      timerRef.current = setTimeout(() => {
        onRemove(toast.id);
      }, FADE_OUT_MS);
    }, VISIBLE_MS);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimer();
    };
  }, [toast.id]);

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium shadow-2xl"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        backdropFilter: 'blur(20px)',
        color: '#f1f5f9',
        maxWidth: '360px',
        width: '100%',
        // Slide-in from top
        transform: phase === 'in' ? 'translateY(-12px)' : 'translateY(0)',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'in'
          ? 'transform 220ms cubic-bezier(0.34,1.56,0.64,1), opacity 180ms ease'
          : phase === 'out'
          ? `opacity ${FADE_OUT_MS}ms ease, transform ${FADE_OUT_MS}ms ease`
          : 'none',
      }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: s.border, color: s.color }}
      >
        {s.icon}
      </span>
      <span className="flex-1 leading-snug">{toast.message}</span>
    </div>
  );
};
