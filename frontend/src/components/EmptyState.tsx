import React from 'react';

export const EmptyState: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-fade-in select-none">
    {/* Animated battery illustration */}
    <div className="relative">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        {/* Outer glow */}
        <circle cx="40" cy="40" r="38" fill="rgba(34,211,238,0.04)" stroke="rgba(34,211,238,0.08)" strokeWidth="1" />
        {/* Battery body */}
        <rect x="16" y="26" width="44" height="28" rx="5" stroke="#1e293b" strokeWidth="2" fill="#0f172a" />
        {/* Battery tip */}
        <rect x="60" y="33" width="6" height="14" rx="2" fill="#1e293b" />
        {/* Empty fill indicator */}
        <rect x="19" y="29" width="8" height="22" rx="2" fill="#1e293b" />
        <rect x="30" y="29" width="8" height="22" rx="2" fill="#1e293b" />
        <rect x="41" y="29" width="8" height="22" rx="2" fill="#1e293b" />
        {/* Plug icon below */}
        <path d="M34 62 L34 70 M46 62 L46 70 M34 66 L46 66" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {/* Pulse ring */}
      <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-ping" style={{ animationDuration: '3s' }} />
    </div>

    <div className="text-center">
      <p className="text-slate-300 text-lg font-semibold">No device connected</p>
      <p className="text-slate-600 text-sm mt-1.5 max-w-xs leading-relaxed">
        Connect to a BMS device to start monitoring battery data in real time.
      </p>
    </div>

    <div className="flex items-center gap-2 text-xs text-slate-700 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
      <ArrowLeftIcon />
      Use the device panel to scan and connect
    </div>
  </div>
);

function ArrowLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}
