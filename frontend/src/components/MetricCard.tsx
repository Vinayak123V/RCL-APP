import React from 'react';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
  sub?: string;
  glow?: boolean;
  loading?: boolean;
}

export const MetricCard: React.FC<Props> = ({
  label, value, unit, icon, color = 'text-cyan-400', sub, glow, loading,
}) => {
  if (loading) {
    return (
      <div className="card p-4 flex flex-col gap-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-28 mt-1" />
        <div className="skeleton h-2.5 w-16" />
      </div>
    );
  }

  return (
    <div className={`card p-4 flex flex-col gap-1 animate-fade-in ${glow ? 'card-glow' : ''}`}>
      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium uppercase tracking-widest">
        {icon && <span className="opacity-70">{icon}</span>}
        {label}
      </div>
      <div className={`text-3xl font-bold tracking-tight ${color} leading-none mt-1`}>
        {value}
        {unit && <span className="text-base font-normal text-slate-500 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
};
