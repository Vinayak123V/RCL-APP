import React from 'react';
import { useBmsStore } from '../store/bmsStore';
import { useBLE } from '../hooks/useBLEAdapter';
import { StatusBadge } from './StatusBadge';
import { BLEDevice } from '../../../shared/types';

function RssiBar({ rssi }: { rssi: number }) {
  // rssi typically -40 (strong) to -90 (weak)
  const strength = Math.max(0, Math.min(100, ((rssi + 90) / 50) * 100));
  const bars = [25, 50, 75, 100];
  return (
    <div className="flex items-end gap-0.5 h-3.5">
      {bars.map((threshold, i) => (
        <div
          key={i}
          style={{ height: `${(i + 1) * 25}%` }}
          className={`w-1 rounded-sm transition-colors ${
            strength >= threshold ? 'bg-cyan-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

export const DevicePanel: React.FC = () => {
  const { devices, scanning, connectionStatus, connectedDeviceId } = useBmsStore();
  const { startScan, stopScan, connect, disconnect } = useBLE();
  const connected = connectionStatus === 'connected';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">BLE Devices</h2>
          <p className="text-xs text-slate-600 mt-0.5">Bluetooth Low Energy</p>
        </div>
        <StatusBadge status={connected ? 'connected' : 'disconnected'} />
      </div>

      {/* Scan / Disconnect buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={scanning ? stopScan : startScan}
          disabled={connected}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
        >
          {scanning ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Stop Scanning
            </>
          ) : (
            <>
              <ScanIcon />
              Scan for Devices
            </>
          )}
        </button>
        {connected && (
          <button onClick={disconnect} className="btn-danger w-full py-2.5 flex items-center justify-center gap-2">
            <DisconnectIcon />
            Disconnect
          </button>
        )}
      </div>

      {/* Scanning indicator */}
      {scanning && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 rounded-lg px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Scanning for nearby devices…
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Device list */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5">
        {devices.length === 0 && !scanning && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <BluetoothIcon />
            <p className="text-slate-500 text-xs leading-relaxed">
              No devices found.<br />Start scanning to discover BMS devices.
            </p>
          </div>
        )}
        {devices.map((d: BLEDevice, idx: number) => {
          const isSelected = connectedDeviceId === d.id;
          return (
            <button
              key={d.id}
              onClick={() => !connected && connect(d.id)}
              disabled={connected && !isSelected}
              style={{ animationDelay: `${idx * 60}ms` }}
              className={`animate-slide-in text-left p-3 rounded-xl border transition-all duration-200 group
                ${isSelected
                  ? 'border-cyan-500/50 bg-cyan-950/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                  {d.name || 'Unknown Device'}
                </span>
                <RssiBar rssi={d.rssi} />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-600 font-mono">{d.address}</span>
                <span className="text-xs text-slate-600">{d.rssi} dBm</span>
              </div>
              {isSelected && (
                <div className="mt-1.5 text-xs text-cyan-400 font-medium">● Connected</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

function ScanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
    </svg>
  );
}

function BluetoothIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
    </svg>
  );
}
