import React from 'react';
import { useBmsStore } from '../store/bmsStore';
import { useBLE } from '../hooks/useBLEAdapter';

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}

const MosToggle: React.FC<ToggleProps> = ({ label, description, enabled, disabled, onToggle }) => (
  <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
    <div>
      <div className="text-sm font-medium text-slate-300">{label}</div>
      <div className={`text-xs mt-0.5 ${enabled ? 'text-emerald-400' : 'text-slate-600'}`}>{description}</div>
    </div>
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={`Toggle ${label}`}
      className={`toggle-track ${enabled ? 'on' : 'off'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <div className="toggle-thumb" />
    </button>
  </div>
);

export const ControlPanel: React.FC = () => {
  const { data, connectionStatus, lastCommandResult } = useBmsStore();
  const { sendCommand } = useBLE();
  const connected = connectionStatus === 'connected';

  const chargeMos = data?.chargeMos ?? false;
  const dischargeMos = data?.dischargeMos ?? false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ControlIcon />
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">MOS Controls</h3>
      </div>

      <MosToggle
        label="Charge MOS"
        description={chargeMos ? 'Charging enabled' : 'Charging disabled'}
        enabled={chargeMos}
        disabled={!connected}
        onToggle={() => sendCommand(chargeMos ? 'chargeOff' : 'chargeOn')}
      />
      <MosToggle
        label="Discharge MOS"
        description={dischargeMos ? 'Discharge enabled' : 'Discharge disabled'}
        enabled={dischargeMos}
        disabled={!connected}
        onToggle={() => sendCommand(dischargeMos ? 'dischargeOff' : 'dischargeOn')}
      />

      {lastCommandResult && (
        <div
          className={`text-xs px-3 py-2 rounded-lg border animate-fade-in ${
            lastCommandResult.success
              ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300'
              : 'bg-red-950/50 border-red-800/50 text-red-300'
          }`}
        >
          {lastCommandResult.success ? '✓' : '✗'} {lastCommandResult.message}
        </div>
      )}
    </div>
  );
};

function ControlIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  );
}
