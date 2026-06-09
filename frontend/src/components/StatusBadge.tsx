import React from 'react';

type Status = 'charging' | 'discharging' | 'idle' | 'connected' | 'disconnected';

const config: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  charging:     { label: 'Charging',     bg: 'bg-emerald-950/80', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  discharging:  { label: 'Discharging',  bg: 'bg-blue-950/80',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  idle:         { label: 'Idle',         bg: 'bg-slate-800/80',   text: 'text-slate-400',   dot: 'bg-slate-500' },
  connected:    { label: 'Connected',    bg: 'bg-emerald-950/80', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  disconnected: { label: 'Disconnected', bg: 'bg-red-950/80',     text: 'text-red-400',     dot: 'bg-red-500' },
};

export const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/5 ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
      {c.label}
    </span>
  );
};
