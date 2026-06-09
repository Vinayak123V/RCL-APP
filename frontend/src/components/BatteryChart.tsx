import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BatteryData } from '../../../shared/types';

interface Props {
  history: BatteryData[];
  type: 'voltage' | 'current';
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-500 mb-1">t = {label}s</p>
      <p style={{ color: payload[0]?.color }} className="font-semibold">
        {payload[0]?.value?.toFixed(3)} {unit}
      </p>
    </div>
  );
};

export const BatteryChart: React.FC<Props> = ({ history, type, loading }) => {
  const isVoltage = type === 'voltage';
  const color = isVoltage ? '#22d3ee' : '#f59e0b';
  const gradientId = `grad-${type}`;
  const label = isVoltage ? 'Pack Voltage' : 'Current';
  const unit = isVoltage ? 'V' : 'A';

  const data = history.map((d, i) => ({
    t: i,
    value: isVoltage ? d.voltage : d.current,
  }));

  const values = data.map(d => d.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const latest = values[values.length - 1];

  if (loading) {
    return <div className="card p-4"><div className="skeleton h-32 w-full rounded-lg" /></div>;
  }

  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          {latest !== undefined && (
            <span style={{ color }} className="font-bold text-sm">{latest.toFixed(3)} {unit}</span>
          )}
          <span>↑ {max.toFixed(2)}</span>
          <span>↓ {min.toFixed(2)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#475569', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {!isVoltage && <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />}
          <Area
            type="monotoneX"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
