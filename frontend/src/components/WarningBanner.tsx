import React from 'react';
import { Warning } from '../../../shared/types';

const typeConfig: Record<Warning['type'], { icon: string; color: string; bg: string; border: string }> = {
  overvoltage:  { icon: '⚡', color: 'text-red-300',    bg: 'bg-red-950/50',    border: 'border-red-800/50' },
  undervoltage: { icon: '🔋', color: 'text-amber-300',  bg: 'bg-amber-950/50',  border: 'border-amber-800/50' },
  overtemp:     { icon: '🌡', color: 'text-orange-300', bg: 'bg-orange-950/50', border: 'border-orange-800/50' },
  overcurrent:  { icon: '⚠️', color: 'text-red-300',    bg: 'bg-red-950/50',    border: 'border-red-800/50' },
};

export const WarningBanner: React.FC<{ warnings: Warning[] }> = ({ warnings }) => {
  if (!warnings.length) return null;
  return (
    <div className="flex flex-col gap-1.5 animate-fade-in">
      {warnings.map((w, i) => {
        const c = typeConfig[w.type];
        return (
          <div key={i} className={`flex items-center gap-2.5 border rounded-xl px-4 py-2.5 text-sm ${c.color} ${c.bg} ${c.border}`}>
            <span>{c.icon}</span>
            <span className="font-medium">{w.message}</span>
          </div>
        );
      })}
    </div>
  );
};
