import React from 'react';

interface Props { cells: number[]; loading?: boolean }

function cellStyle(v: number, min: number, max: number): { border: string; text: string; bg: string; bar: string } {
  if (v >= 3.65) return { border: 'border-emerald-500/40', text: 'text-emerald-400', bg: 'bg-emerald-950/30', bar: 'bg-emerald-500' };
  if (v >= 3.5)  return { border: 'border-cyan-500/40',    text: 'text-cyan-400',    bg: 'bg-cyan-950/30',    bar: 'bg-cyan-500' };
  if (v >= 3.3)  return { border: 'border-amber-500/40',   text: 'text-amber-400',   bg: 'bg-amber-950/30',   bar: 'bg-amber-500' };
  return           { border: 'border-red-500/40',    text: 'text-red-400',    bg: 'bg-red-950/30',    bar: 'bg-red-500' };
}

export const CellGrid: React.FC<Props> = ({ cells, loading }) => {
  if (loading) {
    return (
      <div className="card p-4">
        <div className="skeleton h-3 w-28 mb-4" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const min = Math.min(...cells);
  const max = Math.max(...cells);
  const avg = cells.reduce((a, b) => a + b, 0) / cells.length;
  const delta = ((max - min) * 1000).toFixed(0);

  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 tracking-wide">Cell Voltages</h3>
          <p className="text-xs text-slate-600 mt-0.5">{cells.length} cells · avg {avg.toFixed(3)} V</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-600">Δ <span className="text-amber-400 font-medium">{delta} mV</span></span>
          <span className="text-slate-600">Min <span className="text-red-400 font-medium">{min.toFixed(3)}</span></span>
          <span className="text-slate-600">Max <span className="text-emerald-400 font-medium">{max.toFixed(3)}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {cells.map((v, i) => {
          const s = cellStyle(v, min, max);
          const pct = Math.max(0, Math.min(100, ((v - 3.0) / (4.2 - 3.0)) * 100));
          const isMin = v === min;
          const isMax = v === max;
          return (
            <div
              key={i}
              className={`border rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition-all duration-200 hover:scale-105 ${s.border} ${s.bg}`}
            >
              <div className="text-xs text-slate-600 font-medium">C{i + 1}</div>
              {/* Mini bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={`text-sm font-bold leading-none ${s.text}`}>{v.toFixed(3)}</div>
              <div className="text-xs text-slate-700">V</div>
              {(isMin || isMax) && (
                <div className={`text-[9px] font-bold px-1 rounded ${isMax ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isMax ? 'MAX' : 'MIN'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
