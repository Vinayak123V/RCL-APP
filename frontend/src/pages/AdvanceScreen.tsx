import React, { useState } from 'react';
import { useBmsStore } from '../store/bmsStore';
import { useBLE } from '../hooks/useBLEAdapter';
import { useSettingsStore, convertTemp } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useDeviceHistoryStore } from '../store/deviceHistoryStore';
import { useT } from '../i18n';
import { Tab } from '../App';
import { WarningBanner } from '../components/WarningBanner';
import astraLogo from '../assets/astra-logo.png';

interface Props { onNavigate: (t: Tab) => void }

/* ── Animated Toggle (reused from Profile) ── */
const AnimatedToggle: React.FC<{ enabled: boolean; onToggle: () => void; disabled?: boolean }> = ({ enabled, onToggle, disabled }) => (
  <button role='switch' aria-checked={enabled} onClick={disabled ? undefined : onToggle}
    className='relative flex-shrink-0 transition-all duration-300 active:scale-95'
    style={{ width: 48, height: 26, opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
  >
    <span className='absolute inset-0 rounded-full transition-all duration-300' style={{
      background: enabled ? 'linear-gradient(90deg,#0891b2,#22d3ee)' : 'rgba(30,41,59,0.9)',
      border: enabled ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(255,255,255,0.08)',
      boxShadow: enabled ? '0 0 12px rgba(34,211,238,0.45),0 0 24px rgba(34,211,238,0.15)' : 'none',
    }} />
    <span className='absolute top-[3px] rounded-full transition-all duration-300' style={{
      width: 20, height: 20, left: enabled ? 25 : 3,
      background: enabled ? 'white' : '#475569',
      boxShadow: enabled ? '0 0 8px rgba(34,211,238,0.6)' : 'none',
    }} />
  </button>
);
export const AdvanceScreen: React.FC<Props> = ({ onNavigate }) => {
  const { data, connectionStatus, connectedDeviceId, devices } = useBmsStore();
  const { disconnect } = useBLE();
  const { tempUnit } = useSettingsStore();
  const { mode, user } = useAuthStore();
  const { entries: historyEntries } = useDeviceHistoryStore();
  const t = useT();

  const connected = connectionStatus === 'connected';
  const connectedDevice = devices.find(d => d.id === connectedDeviceId);
  const power = data ? data.voltage * data.current : 0;
  // First NTC is usually MOS / heat (matches BMS display "Heat = 033C")
  const primaryTempC = data?.temperatures?.find(t => t > -40 && t < 120) ?? null;
  const avgTempC = primaryTempC;
  const avgTemp = avgTempC !== null ? convertTemp(avgTempC, tempUnit) : null;
  const cellHigh = data?.cells?.length ? Math.max(...data.cells) : null;
  const cellLow  = data?.cells?.length ? Math.min(...data.cells) : null;
  const cellDiff = cellHigh != null && cellLow != null ? cellHigh - cellLow : null;
  const recentDevices = historyEntries.slice(0, 3);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };
  const userName = mode === 'guest' ? t('guest_user') : (user?.email.split('@')[0] ?? 'User');

  return (
    <div className='h-full flex flex-col relative' style={{ background: 'linear-gradient(170deg,#0f172a 0%,#020617 60%,#0a0f1e 100%)' }}>

      {/* ── Background glows ── */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        <div className='absolute' style={{
          top: '-10%', left: '50%', transform: 'translateX(-50%)',
          width: '120%', height: '50%',
          background: 'radial-gradient(ellipse,rgba(8,145,178,0.1) 0%,transparent 70%)',
        }} />
        <div className='absolute' style={{
          top: '40%', right: '-20%', width: '60%', height: '50%',
          background: 'radial-gradient(circle,rgba(139,92,246,0.05) 0%,transparent 70%)',
        }} />
      </div>

      {/* ── HERO HEADER ── */}
      <div className='flex-shrink-0 px-5 pt-safe pb-4 relative z-10' style={{
        borderBottom: '1px solid rgba(34,211,238,0.08)',
      }}>
        <div className='pt-3'>
          {/* Greeting row */}
          <div className='flex items-start justify-between mb-3'>
            <div className='flex-1'>
              <p className='text-slate-500 text-xs font-medium mb-0.5'>{getGreeting()}{mode === 'guest' ? '' : ' ' + userName},</p>
              <div className='flex items-center gap-3'>
                {/* Antenna badge */}
                <div className='w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500' style={{
                  background: connected ? 'linear-gradient(135deg,rgba(34,211,238,0.2),rgba(8,145,178,0.15))' : 'rgba(15,23,42,0.8)',
                  border: connected ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: connected ? '0 0 16px rgba(34,211,238,0.3)' : 'none',
                }}>
                  <AntennaIcon connected={connected} />
                </div>
                <div>
                  <img src={astraLogo} alt="ASTRA" className="h-6 w-auto object-contain" style={{ filter: 'brightness(1.5)' }} />
                  <p className='text-slate-500 text-xs font-medium'>{t('app_subtitle')}</p>
                </div>
              </div>
            </div>
            {/* Right icon cluster */}
            <div className='flex items-center gap-1.5 mt-1'>
              <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{
                background: connected ? 'rgba(34,211,238,0.1)' : 'rgba(15,23,42,0.6)',
                border: connected ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.05)',
              }}>
                <BluetoothIcon connected={connected} />
                {connected && <span className='absolute w-2 h-2 rounded-full bg-cyan-400 animate-ping' style={{ marginTop: -14, marginLeft: 10 }} />}
              </div>
              <div className='w-9 h-9 rounded-xl flex items-center justify-center text-slate-600' style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <NotifIcon />
              </div>
            </div>
          </div>

          {/* ── Status indicator strip ── */}
          <div className='flex items-center gap-0 rounded-xl overflow-hidden' style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <StatusPill
              dot={connected ? 'cyan' : 'gray'}
              label={connected ? t('ble_connected') : t('ble_ready')}
              pulse={connected}
            />
            <div className='w-px h-6 bg-white/[0.05]' />
            <StatusPill 
              dot={devices.length > 0 ? 'green' : 'gray'} 
              label={devices.length + ' ' + t('n_devices')} 
              pulse={devices.length > 0} 
            />
          </div>

          {/* Shimmer line */}
          <div className='mt-3 h-px relative overflow-hidden rounded-full'>
            <div className='absolute inset-0 animate-shimmer-line' style={{
              background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.35),transparent)',
              width: '200%',
            }} />
          </div>
        </div>
      </div>
        {/* ── Scrollable body ── */}
        <div className='flex-1 scroll-area px-4 pb-4 space-y-4 relative z-10'>
          
          {!connected ? (
            <div className='flex flex-col items-center justify-center pt-20 pb-10'>
               <div className='w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4 opacity-50'>
                  <BluetoothIcon connected={false} />
               </div>
               <p className='text-slate-400 font-semibold text-sm'>No Device Connected</p>
               <p className='text-slate-600 text-xs mt-2 text-center px-6 leading-relaxed'>Connect to a BMS device to view advanced analytics and metrics.</p>
               <button onClick={() => onNavigate('home')} className='mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 active:scale-95 transition-all'>
                 Go to Scan
               </button>
            </div>
          ) : (
            <>
              {/* Warnings */}
              {data?.warnings && data.warnings.length > 0 && (
                <WarningBanner warnings={data.warnings} />
              )}

        {/* ── System Status Strip ── */}
        <div className='rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-up' style={{
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <SystemStatusDot active={connected} color='#22d3ee' label={connected ? t('device_online') : t('no_device')} />
          <div className='w-px h-5 bg-white/[0.06]' />
          <SystemStatusDot active={true} color='#22d3ee' label={t('bluetooth_on')} />
          <div className='w-px h-5 bg-white/[0.06]' />
          <SystemStatusDot active={true} color='#22c55e' label={t('secure')} />
        </div>

        {/* ── My Device Card ── */}
        <SectionHeader title={t('my_device')} />
        <DeviceCard
          device={connectedDevice ?? { name: connectedDeviceId ?? 'BMS Device', address: connectedDeviceId ?? '--', rssi: -70 }}
          data={data}
          tempUnit={tempUnit}
          avgTemp={avgTemp}
          onDisconnect={disconnect}
          t={t}
        />

        {/* ── Waiting for first BMS packet after connect ── */}
        {connected && !data && (
          <div
            className='rounded-2xl p-5 flex items-center gap-4 animate-fade-up'
            style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(34,211,238,0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className='w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin-slow flex-shrink-0' />
            <div>
              <p className='text-cyan-300 text-sm font-semibold'>{t('reading_battery_data')}</p>
              <p className='text-slate-500 text-xs mt-1 leading-relaxed'>
                {t('requesting_data')}
              </p>
            </div>
          </div>
        )}

        {/* ── Live Metrics (when connected) ── */}
        {connected && data && (
          <>
            <SectionHeader title={t('live_metrics')} />
            <div className='grid grid-cols-2 gap-3'>
              <MetricTile label={t('total_voltage')} value={data.voltage.toFixed(2)} unit='V'  color='#22d3ee' icon={<VoltIcon />}   delay={0}   />
              <MetricTile label={t('current')}       value={data.current.toFixed(2)} unit='A'  color={data.current >= 0 ? '#22c55e' : '#f97316'} icon={<CurrentIcon />} delay={50}  />
              <MetricTile label={t('soc')}           value={data.soc.toFixed(0)}     unit='%'  color={data.soc > 50 ? '#22d3ee' : data.soc > 20 ? '#facc15' : '#ef4444'} icon={<SocIcon soc={data.soc} />} delay={100} />
              <MetricTile label={t('power')}         value={power.toFixed(0)}        unit='W'  color='#a78bfa' icon={<PowerIcon />}  delay={150} />
              <MetricTile label={t('temperature')}   value={avgTemp !== null ? avgTemp.toFixed(1) : '--'} unit={tempUnit} color={avgTempC !== null && avgTempC > 45 ? '#ef4444' : '#fb923c'} icon={<TempIcon />} delay={200} />
              <MetricTile label={t('status')}        value={t(data.status as any)} color={data.status === 'charging' ? '#22c55e' : data.status === 'discharging' ? '#60a5fa' : '#94a3b8'} icon={<StatusIcon status={data.status} />} delay={250}>
                {data.status === 'charging' && (
                  <div className='absolute -top-3 right-0 animate-bounce' style={{ animationDuration: '2s' }}>
                    <div className='bg-[#22c55e] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)] flex items-center gap-1'>
                      <span className='w-1.5 h-1.5 rounded-full bg-black animate-pulse' />
                      {(() => {
                        const absCurrent = Math.abs(data.current);
                        if (absCurrent <= 0.1 || data.soc >= 100) return 'Fully charged';
                        const hasCapacity = data.fullCapacity != null && data.remainCapacity != null && data.fullCapacity > 0;
                        const remainingAh = hasCapacity 
                          ? (data.fullCapacity! - data.remainCapacity!)
                          : 100 * (1 - data.soc / 100);
                        const hours = remainingAh / absCurrent;
                        if (hours > 100) return 'Calculating...';
                        const h = Math.floor(hours);
                        const m = Math.round((hours - h) * 60);
                        return `Full in ${h}h ${m}m`;
                      })()}
                    </div>
                  </div>
                )}
              </MetricTile>
              {data.cycles != null && (
                <MetricTile label={t('cycles')} value={String(data.cycles)} unit='' color='#94a3b8' icon={<StatusIcon status='idle' />} delay={300} />
              )}
              {cellHigh != null && (
                <MetricTile label={t('high_cell')} value={cellHigh.toFixed(3)} unit='V' color='#22c55e' icon={<VoltIcon />} delay={350} />
              )}
              {cellLow != null && (
                <MetricTile label={t('low_cell')} value={cellLow.toFixed(3)} unit='V' color='#facc15' icon={<VoltIcon />} delay={400} />
              )}
              {cellDiff != null && (
                <MetricTile label={t('diff')} value={(cellDiff * 1000).toFixed(0)} unit='mV' color='#a78bfa' icon={<VoltIcon />} delay={450} />
              )}
            </div>
          </>
        )}

        {/* ── Cell Voltages ── */}
        {connected && data && data.cells.length > 0 && (
          <>
            <SectionHeader
              title={t('cell_voltages')}
              badge={'Δ ' + ((Math.max(...data.cells) - Math.min(...data.cells)) * 1000).toFixed(0) + ' mV'}
              badgeColor='#facc15'
            />
            <CellVoltageGrid cells={data.cells} />
          </>
        )}


          </>
        )}

        <div className='h-2' />
      </div>
    </div>
  );
};
/* ── StatusPill ── */
const StatusPill: React.FC<{ dot: 'cyan' | 'green' | 'gray'; label: string; pulse?: boolean }> = ({ dot, label, pulse }) => {
  const color = dot === 'cyan' ? '#22d3ee' : dot === 'green' ? '#22c55e' : '#475569';
  return (
    <div className='flex items-center gap-1.5 px-3 py-2 flex-1 justify-center'>
      <span className='w-1.5 h-1.5 rounded-full flex-shrink-0' style={{
        background: color,
        boxShadow: dot !== 'gray' ? '0 0 6px ' + color : 'none',
        animation: pulse ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
      }} />
      <span className={`text-[10px] font-semibold truncate ${pulse ? 'animate-pulse' : ''}`} style={{ color: dot !== 'gray' ? color : '#64748b' }}>{label}</span>
    </div>
  );
};

/* ── SystemStatusDot ── */
const SystemStatusDot: React.FC<{ active: boolean; color: string; label: string }> = ({ active, color, label }) => (
  <div className='flex items-center gap-1.5 flex-1'>
    <span className='w-1.5 h-1.5 rounded-full flex-shrink-0' style={{
      background: active ? color : '#475569',
      boxShadow: active ? '0 0 6px ' + color : 'none',
    }} />
    <span className='text-[11px] font-medium truncate' style={{ color: active ? color : '#64748b' }}>{label}</span>
  </div>
);

/* ── SectionHeader ── */
const SectionHeader: React.FC<{ title: string; badge?: string; badgeColor?: string }> = ({ title, badge, badgeColor }) => (
  <div className='flex items-center justify-between px-1 mb-2'>
    <h2 className='text-white text-sm font-bold tracking-tight'>{title}</h2>
    {badge && (
      <span className='text-xs font-bold px-2 py-0.5 rounded-lg' style={{
        background: (badgeColor ?? '#facc15') + '18',
        color: badgeColor ?? '#facc15',
        border: '1px solid ' + (badgeColor ?? '#facc15') + '30',
      }}>{badge}</span>
    )}
  </div>
);



/* ── Device Card (connected) ── */
const DeviceCard: React.FC<{
  device: { name: string; address: string; rssi: number };
  data: any; tempUnit: string; avgTemp: number | null;
  onDisconnect: () => void; t: (k: any) => string;
}> = ({ device, data, tempUnit, avgTemp, onDisconnect, t }) => (
  <div className='rounded-2xl p-4 animate-scale-in relative overflow-hidden' style={{
    background: 'linear-gradient(135deg,rgba(8,145,178,0.12) 0%,rgba(15,23,42,0.8) 60%)',
    border: '1px solid rgba(34,211,238,0.2)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 0 24px rgba(34,211,238,0.1),inset 0 1px 0 rgba(255,255,255,0.06)',
  }}>
    <div className='absolute top-0 left-0 right-0 h-px' style={{
      background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.4),transparent)',
    }} />
    <div className='flex items-center gap-3 mb-3'>
      <div className='w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0' style={{
        background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)',
      }}>
        <BluetoothIcon connected={true} />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-white font-bold text-sm truncate'>{device.name || 'BMS Device'}</p>
        <p className='text-slate-500 text-[10px] font-mono mt-0.5'>{device.address}</p>
      </div>
      <div className='flex flex-col items-end gap-1.5'>
        <span className='flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full' style={{
          background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <span className='w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse' />
          {t('connected')}
        </span>
        <button onClick={onDisconnect} 
          className="text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-all mt-0.5"
          style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
          {t('disconnect')}
        </button>
      </div>
    </div>
    {data && (
      <div className='grid grid-cols-3 gap-2 pt-3' style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <MiniStat label={t('total_voltage')} value={data.voltage.toFixed(1) + ' V'} color='#22d3ee' />
        <MiniStat label={t('soc')} value={data.soc.toFixed(0) + '%'} color={data.soc > 50 ? '#22d3ee' : data.soc > 20 ? '#facc15' : '#ef4444'} />
        <MiniStat label={t('temperature')} value={avgTemp !== null ? avgTemp.toFixed(1) + ' ' + tempUnit : '--'} color='#fb923c' />
      </div>
    )}
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className='flex flex-col items-center gap-0.5 py-1'>
    <span className='text-[10px] text-slate-600 font-medium'>{label}</span>
    <span className='text-sm font-bold' style={{ color }}>{value}</span>
  </div>
);

/* ── Quick Action Card ── */
const QuickActionCard: React.FC<{ icon: React.ReactNode; label: string; color: string; onPress: () => void }> = ({ icon, label, color, onPress }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onPress}
      className='flex flex-col items-center gap-2.5 py-4 rounded-2xl transition-all duration-200'
      style={{
        background: color + '0d',
        border: '1px solid ' + color + '25',
        boxShadow: pressed ? 'none' : '0 4px 16px ' + color + '15',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
      }}
    >
      <span className='w-10 h-10 rounded-xl flex items-center justify-center' style={{
        background: color + '15', boxShadow: '0 0 12px ' + color + '30', color: color,
      }}>
        {icon}
      </span>
      <span className='text-xs font-semibold' style={{ color: color + 'cc' }}>{label}</span>
    </button>
  );
};
/* ── Metric Tile ── */
const MetricTile: React.FC<{
  label: string; value: string; unit?: string; color: string; icon: React.ReactNode; delay?: number; children?: React.ReactNode;
}> = ({ label, value, unit, color, icon, delay = 0, children }) => (
  <div className='rounded-2xl p-4 flex flex-col gap-2 animate-fade-up active:scale-[0.97] transition-transform relative' style={{
    animationDelay: delay + 'ms',
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  }}>
    {children}
    <div className='flex items-center justify-between'>
      <span className='text-slate-600 text-xs font-medium'>{label}</span>
      <span style={{ color, opacity: 0.7 }}>{icon}</span>
    </div>
    <div className='flex items-baseline gap-1'>
      <span className='text-2xl font-bold leading-none' style={{ color }}>{value}</span>
      {unit && <span className='text-slate-500 text-xs'>{unit}</span>}
    </div>
    <div className='h-0.5 rounded-full' style={{ background: color + '20' }}>
      <div className='h-full rounded-full' style={{ background: color, width: '40%', boxShadow: '0 0 6px ' + color }} />
    </div>
  </div>
);

/* ── Cell Voltage Grid ── */
const CellVoltageGrid: React.FC<{ cells: number[] }> = ({ cells }) => {
  const min = Math.min(...cells);
  const max = Math.max(...cells);
  function cellColor(v: number): string {
    if (v >= 3.65) return '#22c55e';
    if (v >= 3.5)  return '#22d3ee';
    if (v >= 3.3)  return '#facc15';
    return '#ef4444';
  }
  return (
    <div className='grid grid-cols-4 gap-2'>
      {cells.map((v, i) => {
        const color = cellColor(v);
        const isMin = v === min, isMax = v === max;
        return (
          <div key={i} className='rounded-xl p-2.5 flex flex-col items-center gap-1 transition-transform active:scale-95' style={{
            background: color + '10', border: '1px solid ' + color + '30',
          }}>
            <span className='text-[10px] text-slate-600 font-medium'>C{i + 1}</span>
            <span className='text-sm font-bold leading-none' style={{ color }}>{v.toFixed(3)}</span>
            <span className='text-[9px] text-slate-700'>V</span>
            {(isMin || isMax) && (
              <span className='text-[8px] font-bold' style={{ color: isMax ? '#22c55e' : '#ef4444' }}>
                {isMax ? 'MAX' : 'MIN'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};


/* ── Icons ── */
function AntennaIcon({ connected }: { connected: boolean }) {
  const color = connected ? '#22d3ee' : '#64748b';
  const glow  = connected ? 'drop-shadow(0 0 4px rgba(34,211,238,0.8))' : 'none';
  return (
    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' style={{ filter: glow, transition: 'filter 0.4s ease' }}>
      <path d='M3.5 8.5a12 12 0 0 1 17 0' stroke={color} strokeWidth='2' strokeLinecap='round' fill='none' opacity={connected ? 1 : 0.4} />
      <path d='M6 11a8 8 0 0 1 12 0'       stroke={color} strokeWidth='2' strokeLinecap='round' fill='none' opacity={connected ? 1 : 0.55} />
      <path d='M8.8 13.5a4 4 0 0 1 6.4 0'  stroke={color} strokeWidth='2' strokeLinecap='round' fill='none' opacity={connected ? 1 : 0.7} />
      <circle cx='12' cy='15.5' r='1.2' fill={color} />
      <line x1='12' y1='16.7' x2='12' y2='19.5' stroke={color} strokeWidth='2' strokeLinecap='round' />
      <line x1='8.5' y1='19.5' x2='15.5' y2='19.5' stroke={color} strokeWidth='2' strokeLinecap='round' />
      <line x1='10' y1='21.5' x2='14' y2='21.5' stroke={color} strokeWidth='2' strokeLinecap='round' />
    </svg>
  );
}
function BluetoothIcon({ connected }: { connected: boolean }) {
  return <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={connected ? '#22d3ee' : '#475569'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5'/></svg>;
}
function NotifIcon() {
  return <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/></svg>;
}
function ChevronRight() {
  return <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#475569' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>;
}
function ScanIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='2'/><path d='M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14'/></svg>;
}
function QrIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/><rect x='5' y='5' width='3' height='3' fill='currentColor' stroke='none'/><rect x='16' y='5' width='3' height='3' fill='currentColor' stroke='none'/><rect x='5' y='16' width='3' height='3' fill='currentColor' stroke='none'/><line x1='14' y1='14' x2='14' y2='14'/><line x1='17' y1='14' x2='17' y2='14'/><line x1='20' y1='14' x2='20' y2='14'/><line x1='14' y1='17' x2='14' y2='17'/><line x1='17' y1='17' x2='20' y2='17'/><line x1='20' y1='20' x2='20' y2='20'/><line x1='14' y1='20' x2='17' y2='20'/></svg>;
}
function HistoryIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='23 4 23 10 17 10'/><polyline points='1 20 1 14 7 14'/><path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'/></svg>;
}
function SettingsIcon() {
  return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'/></svg>;
}
function VoltIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>;
}
function CurrentIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><polyline points='19 12 12 19 5 12'/></svg>;
}
function SocIcon({ soc }: { soc: number }) {
  const fill = soc > 60 ? '#22d3ee' : soc > 20 ? '#facc15' : '#ef4444';
  const w = Math.round((soc / 100) * 10);
  return (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='2' y='7' width='16' height='10' rx='2' stroke='currentColor'/>
      <rect x='4' y='9' width={w} height='6' rx='1' fill={fill}/>
      <path d='M22 11v2' stroke='currentColor'/>
    </svg>
  );
}
function PowerIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M18.36 6.64a9 9 0 1 1-12.73 0'/><line x1='12' y1='2' x2='12' y2='12'/></svg>;
}
function TempIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z'/></svg>;
}
function StatusIcon({ status }: { status: string }) {
  return (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      {status === 'charging'
        ? <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/>
        : status === 'discharging'
        ? <><circle cx='12' cy='12' r='10'/><polyline points='8 12 12 16 16 12'/><line x1='12' y1='8' x2='12' y2='16'/></>
        : <><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></>
      }
    </svg>
  );
}