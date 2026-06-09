import React, { useState } from 'react';
import { Tab } from '../App';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, Language } from '../store/settingsStore';
import { useBmsStore } from '../store/bmsStore';
import { useT } from '../i18n';
import { ChangePasswordModal } from '../components/mobile/ChangePasswordModal';
import { ConfirmModal }        from '../components/mobile/ConfirmModal';
import { TermsModal }          from '../components/mobile/TermsModal';
import { LanguageModal }       from '../components/mobile/LanguageModal';
import { RenameDeviceModal }   from '../components/mobile/RenameDeviceModal';
import { RaiseTicketModal }    from '../components/mobile/RaiseTicketModal';
import { useDeviceHistoryStore } from '../store/deviceHistoryStore';
import { useBLE } from '../hooks/useBLE';

interface Props {
  onNavigate: (t: Tab) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

/* ── Animated Toggle ── */
const AnimatedToggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
  <button role='switch' aria-checked={enabled} onClick={onToggle}
    className='relative flex-shrink-0 transition-all duration-300 active:scale-95'
    style={{ width: 48, height: 26 }}
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

/* ── Quick Action Tile ── */
interface QAProps { icon: React.ReactNode; label: string; gradient: string; glowColor: string; onPress: () => void; }
const QuickActionTile: React.FC<QAProps> = ({ icon, label, gradient, glowColor, onPress }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onPress}
      className='flex flex-col items-center gap-2.5 py-4 rounded-2xl transition-all duration-200'
      style={{
        background: gradient,
        border: '1px solid ' + glowColor + '30',
        boxShadow: pressed ? 'none' : '0 4px 20px ' + glowColor + '25,inset 0 1px 0 rgba(255,255,255,0.08)',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
      }}
    >
      <span className='flex items-center justify-center w-10 h-10 rounded-xl' style={{
        background: glowColor + '18', boxShadow: '0 0 16px ' + glowColor + '40', color: glowColor,
      }}>
        {icon}
      </span>
      <span className='text-xs font-semibold text-white/80 tracking-wide'>{label}</span>
    </button>
  );
};

/* ── Settings Card ── */
const SettingsCard: React.FC<{ title: string; icon: React.ReactNode; accentColor: string; delay?: number; children: React.ReactNode }> = ({
  title, icon, accentColor, delay = 0, children,
}) => (
  <div className='rounded-2xl overflow-hidden animate-fade-up' style={{
    animationDelay: delay + 'ms',
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  }}>
    <div className='flex items-center gap-2.5 px-4 py-3' style={{
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: 'linear-gradient(90deg,' + accentColor + '12 0%,transparent 100%)',
    }}>
      <span style={{ color: accentColor }}>{icon}</span>
      <span className='text-xs font-bold uppercase tracking-widest' style={{ color: accentColor }}>{title}</span>
    </div>
    <div>
      {React.Children.map(children, (child, i) => (
        <div key={i} style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.04)' } : {}}>{child}</div>
      ))}
    </div>
  </div>
);

/* ── Row variants ── */
const RowArrow: React.FC<{ icon: React.ReactNode; label: string; value?: string; danger?: boolean; onPress: () => void }> = ({
  icon, label, value, danger, onPress,
}) => (
  <button onClick={onPress} className='w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-150 active:bg-white/[0.04]'>
    <span className='flex-shrink-0' style={{ color: danger ? '#ef4444' : '#64748b' }}>{icon}</span>
    <span className='flex-1 text-sm font-medium text-left' style={{ color: danger ? '#f87171' : '#cbd5e1' }}>{label}</span>
    {value && (
      <span className='text-xs font-semibold px-2 py-0.5 rounded-lg mr-1' style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>
        {value}
      </span>
    )}
    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={danger ? '#ef4444' : '#334155'} strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='9 18 15 12 9 6'/>
    </svg>
  </button>
);

const RowToggle: React.FC<{ icon: React.ReactNode; label: string; sublabel?: string; enabled: boolean; onToggle: () => void; accentColor?: string }> = ({
  icon, label, sublabel, enabled, onToggle, accentColor = '#22d3ee',
}) => (
  <div className='flex items-center gap-3 px-4 py-3.5'>
    <span className='flex-shrink-0' style={{ color: enabled ? accentColor : '#64748b' }}>{icon}</span>
    <div className='flex-1'>
      <span className='text-sm font-medium text-slate-300 block'>{label}</span>
      {sublabel && <span className='text-[11px] text-slate-600'>{sublabel}</span>}
    </div>
    <AnimatedToggle enabled={enabled} onToggle={onToggle} />
  </div>
);

const RowStatic: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className='flex items-center gap-3 px-4 py-3.5'>
    <span className='flex-shrink-0 text-slate-600'>{icon}</span>
    <span className='flex-1 text-sm font-medium text-slate-400'>{label}</span>
    <span className='text-xs text-slate-600 font-mono'>{value}</span>
  </div>
);

const RowDisabled: React.FC<{ icon: React.ReactNode; label: string; reason: string; danger?: boolean }> = ({
  icon, label, reason, danger,
}) => (
  <div className='flex items-center gap-3 px-4 py-3.5 opacity-35'>
    <span className='flex-shrink-0' style={{ color: danger ? '#ef4444' : '#64748b' }}>{icon}</span>
    <span className='flex-1 text-sm font-medium' style={{ color: danger ? '#f87171' : '#94a3b8' }}>{label}</span>
    <span className='text-[10px] text-slate-600 italic'>{reason}</span>
  </div>
);

const RowInput: React.FC<{
  icon: React.ReactNode;
  label: string;
  currentValue: string;
  onSet: (val: string) => void;
  accentColor?: string;
}> = ({ icon, label, currentValue, onSet, accentColor = '#22d3ee' }) => {
  const [val, setVal] = useState('');
  return (
    <div className='flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5'>
      <div className='flex items-center gap-3 flex-1'>
        <span className='flex-shrink-0' style={{ color: accentColor }}>{icon}</span>
        <span className='text-sm font-medium text-slate-300'>{label}</span>
      </div>
      <div className='flex items-center gap-3'>
        <span className='text-xs font-mono text-slate-400'>{currentValue}</span>
        <input 
          type='number' 
          value={val} 
          onChange={(e) => setVal(e.target.value)} 
          className='w-16 px-2 py-1 rounded bg-slate-800 text-xs text-white border border-slate-700 outline-none focus:border-cyan-400'
        />
        <button 
          onClick={() => { if(val) onSet(val); setVal(''); }}
          className='px-3 py-1 rounded text-xs font-semibold bg-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.3)] hover:bg-cyan-400'
        >
          Set
        </button>
      </div>
    </div>
  );
};
/* ── Main Screen ── */
export const ProfileScreen: React.FC<Props> = ({ onToast }) => {
  const { user, mode, logout, deleteAccount } = useAuthStore();
  const { language, tempUnit, autoConnect, demoMode, setLanguage, setTempUnit, setAutoConnect, setDemoMode, clearCache } = useSettingsStore();
  const connectionStatus = useBmsStore(s => s.connectionStatus);
  const connectedDeviceId = useBmsStore(s => s.connectedDeviceId);
  const devices = useBmsStore(s => s.devices);
  const batteryData = useBmsStore(s => s.data);
  const t = useT();
  const renameDeviceBms = useBmsStore(s => s.renameDevice);
  const renameDeviceHistory = useDeviceHistoryStore(s => s.renameDevice);
  const { sendConfiguration } = useBLE();

  const [modal, setModal] = useState<'none' | 'changePw' | 'deleteAccount' | 'logout' | 'clearCache' | 'terms' | 'language' | 'renameDevice' | 'ticket'>('none');
  const isGuest = mode === 'guest';
  const isConnected = connectionStatus === 'connected';
  const connectedDevice = devices.find(d => d.id === connectedDeviceId);

  function handleLogout() { logout(); onToast(t('logout'), 'info'); }
  function handleDeleteAccount() { deleteAccount(); onToast(t('delete_account'), 'info'); }
  function handleClearCache() { clearCache(); onToast(t('clear_cache'), 'success'); }

  function handleRenameDevice(newName: string) {
    if (connectedDeviceId) {
      renameDeviceBms(connectedDeviceId, newName);
      renameDeviceHistory(connectedDeviceId, newName);
      onToast(`Device renamed to ${newName}`, 'success');
    }
  }

  const displayName = isGuest ? t('guest_user') : (user?.email.split('@')[0] ?? 'User');
  const displayEmail = isGuest ? t('limited_access') : (user?.email ?? '');

  return (
    <div className='h-full flex flex-col relative overflow-hidden'
      style={{ background: 'linear-gradient(170deg,#0f172a 0%,#020617 60%,#0a0f1e 100%)' }}
    >
      {/* Background radial glow */}
      <div className='absolute inset-0 pointer-events-none' style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%,rgba(8,145,178,0.08) 0%,transparent 70%)',
      }} />
      <div className='absolute pointer-events-none' style={{
        top: '30%', left: '-20%', width: '60%', height: '60%',
        background: 'radial-gradient(circle,rgba(139,92,246,0.04) 0%,transparent 70%)',
      }} />

      {/* Header */}
      <div className='flex-shrink-0 pt-safe px-5 pb-3 relative z-10'>
        <div className='flex items-center justify-between pt-3'>
          <div>
            <h1 className='text-white text-xl font-bold tracking-tight'>{t('profile_title')}</h1>
            <p className='text-slate-600 text-xs mt-0.5'>{t('bms_intelligence_platform')}</p>
          </div>
          {/* Connection status pill */}
          <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-full' style={{
            background: isConnected ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
            border: isConnected ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(100,116,139,0.2)',
          }}>
            <span className='w-1.5 h-1.5 rounded-full flex-shrink-0' style={{
              background: isConnected ? '#22c55e' : '#475569',
              boxShadow: isConnected ? '0 0 6px rgba(34,197,94,0.8)' : 'none',
            }} />
            <span className='text-[10px] font-semibold' style={{ color: isConnected ? '#4ade80' : '#64748b' }}>
              {isConnected ? (connectedDevice?.name ?? t('connected')) : t('hist_status_disconnected')}
            </span>
          </div>
        </div>
      </div>

      <div className='flex-1 scroll-area px-4 pb-4 space-y-3 relative z-10'>

        {/* Demo mode banner */}
        {demoMode && (
          <div className='flex items-center gap-2.5 px-4 py-2.5 rounded-2xl animate-fade-up' style={{
            background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)',
          }}>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#facc15' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0'>
              <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
            </svg>
            <p className='text-yellow-300 text-xs font-medium'>{t('demo_active')}</p>
          </div>
        )}

        {/* ── Profile Card ── */}
        <div className='rounded-2xl p-5 animate-fade-up relative overflow-hidden' style={{
          background: 'linear-gradient(135deg,rgba(8,145,178,0.12) 0%,rgba(15,23,42,0.8) 60%)',
          border: '1px solid rgba(34,211,238,0.15)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(8,145,178,0.1),inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          {/* Shimmer line */}
          <div className='absolute top-0 left-0 right-0 h-px' style={{
            background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.4),transparent)',
          }} />
          <div className='flex items-center gap-4'>
            {/* Avatar with glow ring */}
            <div className='relative flex-shrink-0'>
              <div className='absolute inset-0 rounded-full' style={{
                background: isGuest ? 'rgba(100,116,139,0.3)' : 'conic-gradient(from 0deg,#0891b2,#22d3ee,#a78bfa,#0891b2)',
                padding: 2, borderRadius: '50%',
                boxShadow: isGuest ? 'none' : '0 0 20px rgba(34,211,238,0.35),0 0 40px rgba(34,211,238,0.1)',
                animation: isGuest ? 'none' : 'spin-slow 4s linear infinite',
              }} />
              <div className='w-16 h-16 rounded-full flex items-center justify-center relative z-10 m-[2px]' style={{
                background: isGuest ? 'rgba(30,41,59,0.9)' : 'linear-gradient(135deg,#0c4a6e,#0891b2)',
                border: '2px solid rgba(15,23,42,0.8)',
              }}>
                <UserIcon />
                {isGuest && (
                  <span className='absolute -bottom-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full' style={{
                    background: 'linear-gradient(135deg,#f59e0b,#facc15)', color: '#0f172a',
                  }}>G</span>
                )}
              </div>
            </div>
            {/* User info */}
            <div className='flex-1 min-w-0'>
              <p className='text-white font-bold text-lg leading-tight'>{displayName}</p>
              <p className='text-slate-400 text-xs mt-0.5 truncate'>{displayEmail}</p>
              <div className='flex items-center gap-1.5 mt-2'>
                <span className='w-1.5 h-1.5 rounded-full' style={{
                  background: isConnected ? '#22c55e' : '#475569',
                  boxShadow: isConnected ? '0 0 6px rgba(34,197,94,0.8)' : 'none',
                }} />
                <span className='text-[11px] font-medium' style={{ color: isConnected ? '#4ade80' : '#64748b' }}>
                  {isConnected ? t('connected') : t('hist_status_disconnected')}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* ── Quick Actions ── */}
        <div className='animate-fade-up' style={{ animationDelay: '60ms' }}>
          <p className='text-slate-600 text-[10px] font-bold uppercase tracking-widest px-1 mb-2'>{t('quick_actions')}</p>
          <div className='grid grid-cols-3 gap-2.5'>
            <QuickActionTile
              icon={<DeviceIcon />}
              label="Rename Device"
              gradient='linear-gradient(135deg,rgba(8,145,178,0.15),rgba(34,211,238,0.08))'
              glowColor='#22d3ee'
              onPress={() => isConnected ? setModal('renameDevice') : onToast('Connect to a device first', 'error')}
            />
            <QuickActionTile
              icon={<QAIcon />}
              label={t('qa_action')}
              gradient='linear-gradient(135deg,rgba(139,92,246,0.15),rgba(167,139,250,0.08))'
              glowColor='#a78bfa'
              onPress={() => onToast(t('qa_action'), 'info')}
            />
            <QuickActionTile
              icon={<BookIcon />}
              label={t('manual_action')}
              gradient='linear-gradient(135deg,rgba(251,146,60,0.15),rgba(253,186,116,0.08))'
              glowColor='#fb923c'
              onPress={() => onToast(t('manual_action'), 'info')}
            />
          </div>
        </div>

        {/* ── Connectivity ── */}
        <SettingsCard title={t('connectivity')} icon={<WifiIcon />} accentColor='#22d3ee' delay={100}>
          <RowToggle
            icon={<BleIcon />}
            label={t('auto_connect')}
            sublabel={t('reconnect_last_device')}
            enabled={autoConnect}
            onToggle={() => { setAutoConnect(!autoConnect); onToast(t('auto_connect'), 'info'); }}
          />
          <RowStatic
            icon={<BluetoothIcon />}
            label={t('bluetooth_status')}
            value={isConnected ? t('bt_active') : t('bt_idle')}
          />
        </SettingsCard>


        {/* ── Preferences ── */}
        <SettingsCard title={t('preferences')} icon={<SlidersIcon />} accentColor='#a78bfa' delay={140}>
          <RowArrow icon={<GlobeIcon />} label={t('language_switch')} value={language} onPress={() => setModal('language')} />
          <RowArrow
            icon={<TempIcon />}
            label={t('temperature_unit')}
            value={tempUnit}
            onPress={() => { const next = tempUnit === '°C' ? '°F' : '°C'; setTempUnit(next); onToast(t('temperature_unit') + ': ' + next, 'info'); }}
          />
        </SettingsCard>

        {/* ── System ── */}
        <SettingsCard title={t('system')} icon={<CpuIcon />} accentColor='#fb923c' delay={180}>
          <RowInput 
            icon={<BatteryIcon />} 
            label='Nominal capacity' 
            currentValue={batteryData?.fullCapacity ? `${Math.round(batteryData.fullCapacity)}AH` : '--'}
            onSet={(val) => {
               sendConfiguration('nominalCapacity', Number(val));
               onToast(`Setting nominal capacity to ${val}AH`, 'info');
            }} 
            accentColor='#fb923c'
          />
          <RowStatic icon={<InfoIcon />} label={t('app_version')} value='1.0.0' />
          <RowArrow  icon={<DocIcon />}  label={t('terms')} onPress={() => setModal('terms')} />
          <RowArrow  icon={<MailIcon />} label="Raise a Ticket" onPress={() => setModal('ticket')} />
        </SettingsCard>

        {/* ── Account ── */}
        <SettingsCard title={t('account')} icon={<ShieldIcon />} accentColor='#64748b' delay={220}>
          {!isGuest ? (
            <RowArrow icon={<LockIcon />} label={t('change_password')} onPress={() => setModal('changePw')} />
          ) : (
            <RowDisabled icon={<LockIcon />} label={t('change_password')} reason={t('sign_in_required')} />
          )}
          {!isGuest ? (
            <RowArrow icon={<TrashIcon />} label={t('delete_account')} danger onPress={() => setModal('deleteAccount')} />
          ) : (
            <RowDisabled icon={<TrashIcon />} label={t('delete_account')} reason={t('sign_in_required')} danger />
          )}
          <RowArrow icon={<CacheIcon />} label={t('clear_cache')} onPress={() => setModal('clearCache')} />
        </SettingsCard>

        {/* ── Logout Button ── */}
        <div className='animate-fade-up pt-1 pb-2' style={{ animationDelay: '260ms' }}>
          <button
            onClick={() => setModal('logout')}
            className='w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2'
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
              boxShadow: '0 0 20px rgba(239,68,68,0.08)',
            }}
          >
            <LogoutIcon />
            {isGuest ? t('sign_in') : t('logout')}
          </button>
        </div>

        <div className='h-2' />
      </div>
      {/* ── Modals ── */}
      <ChangePasswordModal open={modal === 'changePw'} onClose={() => setModal('none')} onToast={onToast} />
      <ConfirmModal
        open={modal === 'deleteAccount'}
        onClose={() => setModal('none')}
        onConfirm={handleDeleteAccount}
        title={t('delete_account_title')}
        message={t('delete_account_msg')}
        confirmLabel={t('delete')}
        danger
      />
      <ConfirmModal
        open={modal === 'logout'}
        onClose={() => setModal('none')}
        onConfirm={handleLogout}
        title={isGuest ? t('signin_title') : t('logout_title')}
        message={isGuest ? t('signin_msg') : t('logout_msg')}
        confirmLabel={isGuest ? t('go_to_login') : t('log_out')}
      />
      <ConfirmModal
        open={modal === 'clearCache'}
        onClose={() => setModal('none')}
        onConfirm={handleClearCache}
        title={t('clear_cache_title')}
        message={t('clear_cache_msg')}
        confirmLabel={t('clear')}
      />
      <TermsModal open={modal === 'terms'} onClose={() => setModal('none')} />
      <LanguageModal
        open={modal === 'language'}
        onClose={() => setModal('none')}
        current={language}
        onChange={(l: Language) => { setLanguage(l); onToast('Language set to ' + l, 'info'); }}
      />
      <RenameDeviceModal
        open={modal === 'renameDevice'}
        onClose={() => setModal('none')}
        onSave={handleRenameDevice}
        currentName={connectedDevice?.name || ''}
      />
      <RaiseTicketModal
        open={modal === 'ticket'}
        onClose={() => setModal('none')}
        onToast={onToast}
      />
    </div>
  );
};

/* ── Icons ── */
function UserIcon() {
  return <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>;
}
function DeviceIcon() {
  return <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><rect x='2' y='7' width='16' height='10' rx='2'/><path d='M22 11v2'/></svg>;
}
function QAIcon() {
  return <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>;
}
function BookIcon() {
  return <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'/><path d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'/></svg>;
}
function GlobeIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>;
}
function TempIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z'/></svg>;
}
function BleIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5'/></svg>;
}
function BluetoothIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5'/></svg>;
}
function InfoIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>;
}
function DocIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/></svg>;
}
function LockIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>;
}
function TrashIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg>;
}
function CacheIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='23 4 23 10 17 10'/><polyline points='1 20 1 14 7 14'/><path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'/></svg>;
}
function DemoIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>;
}
function WifiIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12.55a11 11 0 0 1 14.08 0'/><path d='M1.42 9a16 16 0 0 1 21.16 0'/><path d='M8.53 16.11a6 6 0 0 1 6.95 0'/><line x1='12' y1='20' x2='12.01' y2='20'/></svg>;
}
function SlidersIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><line x1='4' y1='21' x2='4' y2='14'/><line x1='4' y1='10' x2='4' y2='3'/><line x1='12' y1='21' x2='12' y2='12'/><line x1='12' y1='8' x2='12' y2='3'/><line x1='20' y1='21' x2='20' y2='16'/><line x1='20' y1='12' x2='20' y2='3'/><line x1='1' y1='14' x2='7' y2='14'/><line x1='9' y1='8' x2='15' y2='8'/><line x1='17' y1='16' x2='23' y2='16'/></svg>;
}
function CpuIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='4' y='4' width='16' height='16' rx='2' ry='2'/><rect x='9' y='9' width='6' height='6'/><line x1='9' y1='1' x2='9' y2='4'/><line x1='15' y1='1' x2='15' y2='4'/><line x1='9' y1='20' x2='9' y2='23'/><line x1='15' y1='20' x2='15' y2='23'/><line x1='20' y1='9' x2='23' y2='9'/><line x1='20' y1='14' x2='23' y2='14'/><line x1='1' y1='9' x2='4' y2='9'/><line x1='1' y1='14' x2='4' y2='14'/></svg>;
}
function ShieldIcon() {
  return <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg>;
}
function LogoutIcon() {
  return <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>;
}
function BatteryIcon() {
  return <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='2' y='7' width='16' height='10' rx='2' ry='2'/><line x1='22' y1='11' x2='22' y2='13'/></svg>;
}
function MailIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  );
}