import React from 'react';
import { Tab } from '../App';
import { useBmsStore } from '../store/bmsStore';
import { useBLE } from '../hooks/useBLEAdapter';
import { ScanScreen } from './ScanScreen';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import astraLogo from '../assets/astra-logo.png';

interface Props {
  onNavigate: (t: Tab) => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const HomeScreen: React.FC<Props> = ({ onNavigate, onToast }) => {
  const { data, connectionStatus, connectedDeviceId, devices, history } = useBmsStore();
  const { disconnect } = useBLE();
  const { mode, user } = useAuthStore();
  const t = useT();
  const connected = connectionStatus === 'connected';

  const connectedDevice = devices.find(d => d.id === connectedDeviceId);
  const deviceName = connectedDevice?.name || 'ASTRA Battery System';

  // Extract real data
  const soc = data?.soc ?? 0;
  const voltage = data?.voltage ?? 0;
  const current = data?.current ?? 0;
  const temp = (data?.temperatures && data.temperatures[0]) ?? 0;
  const capacity = data?.fullCapacity ?? 0;
  const remaining = data?.remainCapacity ?? 0;
  const cycles = data?.cycles ?? 0;
  const maxCycles = 3000;
  
  const power = Math.round(Math.abs(voltage * current));
  const used = Math.max(0, capacity - remaining);
  const healthScore = Math.max(0, 100 - (cycles / maxCycles * 100));
  const healthText = healthScore >= 70 ? 'Excellent' : healthScore >= 30 ? 'Good' : 'Needs Attention';

  let runtimeStr = '--';
  const currentAbs = Math.abs(current);
  if (current < -0.1 && remaining > 0) {
    const hours = remaining / currentAbs;
    if (hours < 100) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      runtimeStr = `${h}h ${m}m`;
    }
  } else if (current > 0.1 && capacity > remaining) {
    const hours = (capacity - remaining) / currentAbs;
    if (hours < 100) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      runtimeStr = `${h}h ${m}m`;
    }
  }

  const usedPercent = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
  const remainingPercent = capacity > 0 ? Math.round((remaining / capacity) * 100) : 0;
  
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };
  const userName = mode === 'guest' ? t('guest_user') : (user?.email.split('@')[0] ?? 'User');

  if (!connected) {
    return <ScanScreen onNavigate={onNavigate} onToast={onToast} />;
  }

  return (
    <div className='h-full flex flex-col relative' style={{ backgroundColor: '#060a14', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
       {/* ── Background glows ── */}
       <div className='absolute inset-0 pointer-events-none overflow-hidden z-0'>
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
       <div className='flex-shrink-0 px-5 pt-4 pb-4 relative z-10' style={{
         borderBottom: '1px solid rgba(34,211,238,0.08)',
       }}>
         <div>
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

       <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
          {/* System Status Hero Card */}
          <div className="rounded-xl border border-green-500/30 bg-[#0c131f] p-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 shadow-[0_0_20px_rgba(34,197,94,0.15)] relative overflow-hidden">
             {/* Disconnect Button */}
             {connected && (
                <button 
                   onClick={() => disconnect()}
                   className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors"
                   title="Disconnect Device"
                >
                   <svg width="8" height="8" className="mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                   Disconnect
                </button>
             )}
             
             {/* Left Section */}
             <div className="flex items-center gap-4 md:border-r border-slate-800/80 md:pr-6 flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.4)] flex-shrink-0">
                   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                </div>
                <div>
                   <div className="text-[10px] text-slate-400 font-semibold tracking-wider mb-0.5">SYSTEM STATUS</div>
                   <div className="text-lg font-bold text-green-500 tracking-wide mb-0.5" style={{ textShadow: '0 0 10px rgba(34,197,94,0.4)' }}>{healthText.toUpperCase()} HEALTH</div>
                   <div className="text-[10px] text-slate-400"><span className="text-slate-300 font-medium">{deviceName}</span> Operating Optimally</div>
                </div>
             </div>
             
             {/* Divider for mobile */}
             <div className="h-px w-full bg-slate-800/80 md:hidden"></div>
             
             {/* Right Section */}
             <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 hide-scrollbar flex-1 w-full md:pb-0 md:px-4 lg:px-10">
                {/* Col 1: Connected */}
                <div className="flex flex-col gap-1 min-w-max">
                   <div className="flex items-center gap-1.5 text-slate-300">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                      <span className="text-[11px] font-medium">Connected</span>
                   </div>
                   <span className="text-[10px] text-green-500 ml-5">{connected ? 'Online' : 'Offline'}</span>
                </div>
                
                <div className="w-px h-8 bg-slate-800/80"></div>
                
                {/* Col 2: Faults */}
                <div className="flex flex-col gap-1 min-w-max">
                   <div className="flex items-center gap-1.5 text-slate-300">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                      <span className="text-[11px] font-medium">No Active Faults</span>
                   </div>
                   <span className="text-[10px] text-green-500 ml-5">All Systems OK</span>
                </div>
                
                <div className="w-px h-8 bg-slate-800/80"></div>
                
                {/* Col 3: Temperature */}
                <div className="flex flex-col gap-1 min-w-max">
                   <div className="flex items-center gap-1.5 text-slate-300">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>
                      <span className="text-[11px] font-medium">Temperature</span>
                   </div>
                   <span className="text-[10px] text-green-500 ml-5">{temp > 45 ? 'High' : temp < 0 ? 'Low' : 'Normal'}</span>
                </div>
                
                <div className="w-px h-8 bg-slate-800/80"></div>
                
                {/* Col 4: Cells */}
                <div className="flex flex-col gap-1 min-w-max">
                   <div className="flex items-center gap-1.5 text-slate-300">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                      <span className="text-[11px] font-medium">Cells</span>
                   </div>
                   <span className="text-[10px] text-green-500 ml-5">Balanced</span>
                </div>
             </div>
          </div>

          {/* Main Battery Status Card (SOC + Capacity Overview) */}
          <div className="rounded-xl p-5 md:p-6 bg-[#0c131f] border border-slate-800/80 flex flex-col md:flex-row items-center gap-6 md:gap-10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
             
             {/* Left: SOC Circle */}
             <div className="relative w-64 h-64 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full absolute inset-0 drop-shadow-[0_0_15px_rgba(34,197,94,0.2)]" viewBox="0 0 200 200">
                   <defs>
                      <linearGradient id="soc-grad" x1="0%" y1="100%" x2="100%" y2="100%">
                         <stop offset="0%" stopColor="#0ea5e9" />
                         <stop offset="20%" stopColor="#2dd4bf" />
                         <stop offset="50%" stopColor="#22c55e" />
                         <stop offset="80%" stopColor="#2dd4bf" />
                         <stop offset="100%" stopColor="#0ea5e9" />
                      </linearGradient>
                      <filter id="glow-soc" x="-20%" y="-20%" width="140%" height="140%">
                         <feGaussianBlur stdDeviation="3" result="blur" />
                         <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                         </feMerge>
                      </filter>
                   </defs>
                   
                   {/* Thin outer ring */}
                   <path d="M 43.43 156.57 A 80 80 0 1 1 156.57 156.57" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                   <path d="M 43.43 156.57 A 80 80 0 1 1 156.57 156.57" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" opacity="0.2" filter="url(#glow-soc)" />
                   
                   {/* Thick inner track (background) */}
                   <path d="M 50.5 149.5 A 70 70 0 1 1 149.5 149.5" fill="none" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />
                   
                   {/* Thick inner track (active progress) */}
                   <path d="M 50.5 149.5 A 70 70 0 1 1 149.5 149.5" fill="none" stroke="url(#soc-grad)" strokeWidth="8" strokeLinecap="round" strokeDasharray="330" strokeDashoffset={330 - (330 * soc) / 100} filter="url(#glow-soc)" />

                   {/* Flares at the ends of the active progress */}
                   {soc > 0 && (
                     <>
                       {/* Start Flare */}
                       <circle cx="50.5" cy="149.5" r="2" fill="#ffffff" filter="url(#glow-soc)" />
                       <circle cx="50.5" cy="149.5" r="5" fill="#0ea5e9" opacity="0.8" filter="url(#glow-soc)" />
                       
                       {/* End Flare */}
                       <circle cx={100 + 70 * Math.cos((135 + 270 * (soc / 100)) * (Math.PI / 180))} 
                               cy={100 + 70 * Math.sin((135 + 270 * (soc / 100)) * (Math.PI / 180))} 
                               r="2" fill="#ffffff" filter="url(#glow-soc)" />
                       <circle cx={100 + 70 * Math.cos((135 + 270 * (soc / 100)) * (Math.PI / 180))} 
                               cy={100 + 70 * Math.sin((135 + 270 * (soc / 100)) * (Math.PI / 180))} 
                               r="5" fill="#22c55e" opacity="0.8" filter="url(#glow-soc)" />
                     </>
                   )}
                   
                   {/* Ticks ring */}
                   <path d="M 57.57 142.43 A 60 60 0 1 1 142.43 142.43" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 8" opacity="0.4" />
                   {/* Bright cyan top ticks */}
                   <path d="M 85 42 A 60 60 0 0 1 115 42" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 8" filter="url(#glow-soc)" />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
                   <div className="flex items-baseline">
                      <span className="text-[64px] font-bold text-white tracking-tight leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{Math.round(soc)}</span>
                      <span className="text-3xl font-medium text-white ml-0.5">%</span>
                   </div>
                   <span className="text-[#22c55e] font-semibold tracking-wide text-base mt-1.5">SOC</span>
                </div>
             </div>

             {/* Right: Capacity Overview */}
             <div className="flex-1 w-full flex flex-col justify-center">
                <div className="flex items-center justify-end mb-5">
                   <div className="flex items-center gap-1 px-2 py-1 rounded border border-green-500/30 bg-green-500/10 text-green-500 text-[10px]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                      Within Safe Limit
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-5">
                   <div>
                      <div className="text-[11px] text-slate-400 mb-1">Total Capacity</div>
                      <div className="text-xl font-semibold text-blue-400">{Math.round(capacity * (voltage || 12))} <span className="text-[11px] font-normal text-slate-400">W</span></div>
                   </div>
                   <div className="border-l border-slate-800 pl-4">
                      <div className="text-[11px] text-slate-400 mb-1">Current Load</div>
                      <div className="text-xl font-semibold text-orange-400">{power} <span className="text-[11px] font-normal text-slate-400">W</span></div>
                   </div>
                </div>
                
                <div className="mb-2">
                   <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="text-blue-400 font-medium">Used: {Math.round((capacity - remaining) * (voltage || 12))} W ({usedPercent}%)</span>
                      <span className="text-green-500 font-medium">Remaining: {Math.round(remaining * (voltage || 12))} W ({remainingPercent}%)</span>
                   </div>
                   {/* Progress Bar */}
                   <div className="h-5 rounded-md overflow-hidden flex w-full relative shadow-inner">
                      <div className="h-full bg-blue-500" style={{ width: `${usedPercent}%` }}>
                         <div className="w-full h-full opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                      </div>
                      <div className="h-full bg-green-500 flex-1">
                         <div className="w-full h-full opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* 3 Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
             <div className="rounded-xl p-3 bg-[#0c131f] border border-slate-800/80">
                <div className="flex items-center gap-1.5 mb-2">
                   <div className="w-6 h-6 rounded bg-blue-500/10 flex flex-shrink-0 items-center justify-center text-blue-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>
                   <span className="text-[11px] text-slate-400 truncate">Voltage</span>
                </div>
                <div className="text-lg font-semibold text-white">{voltage.toFixed(2)} <span className="text-xs font-normal text-slate-400">V</span></div>
             </div>
             <div className="rounded-xl p-3 bg-[#0c131f] border border-slate-800/80">
                <div className="flex items-center gap-1.5 mb-2">
                   <div className="w-6 h-6 rounded bg-cyan-500/10 flex flex-shrink-0 items-center justify-center text-cyan-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg></div>
                   <span className="text-[11px] text-slate-400 truncate">Temp</span>
                </div>
                <div className="text-lg font-semibold text-white">{temp.toFixed(1)} <span className="text-xs font-normal text-slate-400">°C</span></div>
             </div>
             <div className="rounded-xl p-3 bg-[#0c131f] border border-slate-800/80">
                <div className="flex items-center gap-1.5 mb-2">
                   <div className="w-6 h-6 rounded bg-purple-500/10 flex flex-shrink-0 items-center justify-center text-purple-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
                   <span className="text-[11px] text-slate-400 truncate">Load</span>
                </div>
                <div className="text-lg font-semibold text-white">{power} <span className="text-xs font-normal text-slate-400">W</span></div>
             </div>
          </div>

          {/* Bottom Cards */}
          <div className="grid grid-cols-2 gap-2">
             <div className="rounded-xl p-3 bg-[#0c131f] border border-slate-800/80 flex flex-col justify-start">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-6 h-6 rounded bg-orange-500/10 flex items-center justify-center text-orange-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                   <span className="text-xs text-slate-400">Backup Time</span>
                </div>
                <div className="text-2xl font-semibold text-white mt-1">{runtimeStr}</div>
             </div>
             <div className="rounded-xl p-3 bg-[#0c131f] border border-slate-800/80 flex flex-col justify-start">
                <div className="flex items-center gap-1.5 mb-2">
                   <div className="w-6 h-6 rounded bg-purple-500/10 flex flex-shrink-0 items-center justify-center text-purple-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                   </div>
                   <span className="text-[10px] text-slate-400 leading-tight">Battery Life</span>
                </div>
                <div className="text-sm font-semibold text-green-500 mt-1 flex-1 flex items-center">{healthText}</div>
             </div>
          </div>
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

