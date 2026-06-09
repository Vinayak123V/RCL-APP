import React from 'react';

interface Props { soc: number; loading?: boolean }

export const SocGauge: React.FC<Props> = ({ soc, loading }) => {
  const clamped = Math.max(0, Math.min(100, soc));
  const color = clamped > 60 ? '#22d3ee' : clamped > 25 ? '#f59e0b' : '#ef4444';
  const glowColor = clamped > 60 ? 'rgba(34,211,238,0.35)' : clamped > 25 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)';
  const r = 52;
  const circumference = 2 * Math.PI * r;
  // Arc from -210deg to +30deg (240deg sweep) — bottom-left to bottom-right
  const sweep = 240;
  const sweepRad = (sweep / 360) * circumference;
  const offset = sweepRad * (1 - clamped / 100);

  if (loading) {
    return (
      <div className="card p-5 flex flex-col items-center gap-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton w-32 h-32 rounded-full" />
      </div>
    );
  }

  return (
    <div className="card p-5 flex flex-col items-center gap-2 animate-fade-in">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">State of Charge</div>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: 'rotate(150deg)' }}>
          {/* Track */}
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="#0f172a"
            strokeWidth="9"
            strokeDasharray={`${sweepRad} ${circumference - sweepRad}`}
            strokeLinecap="round"
          />
          {/* Fill */}
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeDasharray={`${sweepRad - offset} ${circumference - (sweepRad - offset)}`}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1), stroke 0.4s',
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold leading-none" style={{ color }}>{clamped}</span>
          <span className="text-slate-500 text-sm font-medium mt-0.5">%</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-slate-600">SOC</span>
        <span className="text-slate-700">·</span>
        <span style={{ color }} className="font-medium">
          {clamped > 60 ? 'Good' : clamped > 25 ? 'Low' : 'Critical'}
        </span>
      </div>
    </div>
  );
};
