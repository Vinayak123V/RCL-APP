import React, { useState, useEffect, useCallback } from 'react';
import { useBmsStore } from '../store/bmsStore';
import { MetricCard } from '../components/MetricCard';
import { CellGrid } from '../components/CellGrid';
import { BatteryChart } from '../components/BatteryChart';
import { DevicePanel } from '../components/DevicePanel';
import { ControlPanel } from '../components/ControlPanel';
import { StatusBadge } from '../components/StatusBadge';
import { WarningBanner } from '../components/WarningBanner';
import { SocGauge } from '../components/SocGauge';
import { EmptyState } from '../components/EmptyState';
import { ToastContainer, ToastMessage } from '../components/Toast';

export const Dashboard: React.FC = () => {
  const { data, history, connectionStatus, error } = useBmsStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [prevConnected, setPrevConnected] = useState(false);
  const connected = connectionStatus === 'connected';

  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Connection change toasts
  useEffect(() => {
    if (connected && !prevConnected) addToast('Device connected successfully', 'success');
    if (!connected && prevConnected) addToast('Device disconnected', 'info');
    setPrevConnected(connected);
  }, [connected]);

  // Error toasts
  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error]);

  const power = data ? Math.abs(data.voltage * data.current) : 0;
  const avgTemp = data?.temperatures.length
    ? data.temperatures.reduce((a, b) => a + b, 0) / data.temperatures.length
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #020617 100%)' }}>
      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/20 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-300"
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center">
              <BatteryIcon />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none tracking-tight">BMS Monitor</h1>
              <p className="text-[10px] text-slate-600 mt-0.5">JBD Battery Management System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-slate-700 font-mono hidden sm:block">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
          {data && <StatusBadge status={data.status} />}
          {!connected && <StatusBadge status="disconnected" />}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside
          className={`flex-shrink-0 border-r border-white/5 flex flex-col overflow-y-auto transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div className="p-4 flex flex-col gap-5 min-w-[288px]">
            <DevicePanel />
            {connected && (
              <>
                <div className="border-t border-white/5" />
                <ControlPanel />
              </>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-2.5 text-sm text-red-300 animate-fade-in">
              <span>⚠</span> {error}
            </div>
          )}

          {/* Empty state */}
          {!connected && !data && <EmptyState />}

          {/* Dashboard content */}
          {data && (
            <>
              {/* Warnings */}
              {data.warnings.length > 0 && <WarningBanner warnings={data.warnings} />}

              {/* Metric cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  label="Pack Voltage"
                  value={data.voltage.toFixed(2)}
                  unit="V"
                  color="text-cyan-400"
                  glow
                  icon={<VoltageIcon />}
                />
                <MetricCard
                  label="Current"
                  value={data.current.toFixed(2)}
                  unit="A"
                  color={data.current >= 0 ? 'text-emerald-400' : 'text-orange-400'}
                  icon={<CurrentIcon />}
                  sub={data.current > 0 ? 'Charging' : data.current < 0 ? 'Discharging' : 'Idle'}
                />
                <MetricCard
                  label="Power"
                  value={power.toFixed(1)}
                  unit="W"
                  color="text-violet-400"
                  icon={<PowerIcon />}
                  sub={`${(power / 1000).toFixed(2)} kW`}
                />
                <MetricCard
                  label="Temperature"
                  value={avgTemp !== null ? avgTemp.toFixed(1) : '--'}
                  unit="°C"
                  color={avgTemp !== null && avgTemp > 45 ? 'text-red-400' : 'text-amber-400'}
                  icon={<TempIcon />}
                  sub={data.temperatures.length > 1 ? `S2: ${data.temperatures[1].toFixed(1)}°C` : undefined}
                />
              </div>

              {/* SOC + Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <SocGauge soc={data.soc} />
                <div className="lg:col-span-2 flex flex-col gap-3">
                  <BatteryChart history={history} type="voltage" />
                  <BatteryChart history={history} type="current" />
                </div>
              </div>

              {/* Cell grid */}
              {data.cells.length > 0 && <CellGrid cells={data.cells} />}
            </>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

// ── Icon helpers ──────────────────────────────────────────────────────────────
function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><line x1="6" y1="12" x2="10" y2="12"/>
    </svg>
  );
}
function VoltageIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}
function CurrentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  );
}
function PowerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function TempIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
    </svg>
  );
}
