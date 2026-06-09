import React, { useState } from 'react';
import { Modal } from './Modal';
import { QRDevice } from '../../hooks/useQRScanner';

interface Props {
  open: boolean;
  device: QRDevice | null;
  connecting: boolean;
  onConnect: (device: QRDevice) => void;
  onClose: () => void;
}

export const QRConnectModal: React.FC<Props> = ({ open, device, connecting, onConnect, onClose }) => {
  if (!device) return null;

  return (
    <Modal open={open} onClose={onClose} title="Device Found">
      {/* QR success icon */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-slate-400 text-xs">QR code scanned successfully</p>
      </div>

      {/* Device info */}
      <div className="glass rounded-2xl p-4 space-y-3 mb-5">
        <InfoRow label="Device ID" value={device.deviceId} mono />
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <InfoRow label="MAC Address" value={device.mac} mono />
        {device.name && (
          <>
            <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <InfoRow label="Name" value={device.name} />
          </>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={connecting}
          className="flex-1 py-3.5 rounded-xl text-slate-400 font-semibold text-sm active:scale-[0.98] transition-all border border-white/8 disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onConnect(device)}
          disabled={connecting}
          className="flex-1 py-3.5 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.25)' }}
        >
          {connecting
            ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" /> Connecting…</>
            : 'Connect'}
        </button>
      </div>
    </Modal>
  );
};

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-slate-600 text-xs flex-shrink-0">{label}</span>
    <span className={`text-slate-200 text-xs text-right truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
  </div>
);
