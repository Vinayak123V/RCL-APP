/**
 * QRScannerView
 *
 * Native (Android/iOS):
 *   BarcodeScanner.scan() opens a full-screen native QR scanner UI.
 *   This component shows a brief "launching" modal while the native scanner
 *   initialises, then the native UI takes over completely.
 *   No WebView camera preview needed.
 *
 * Browser (Chrome / Edge):
 *   Full-screen <video> element with jsQR frame-by-frame real-time decode.
 */
import React, { useEffect } from 'react';
import { useQRScanner, QRDevice, ScannerState, isNative } from '../../hooks/useQRScanner';

interface Props {
  open: boolean;
  onFound: (device: QRDevice) => void;
  onClose: () => void;
}

export const QRScannerView: React.FC<Props> = ({ open, onFound, onClose }) => {
  const { videoRef, canvasRef, state, error, startScanner, stopScanner } = useQRScanner();

  useEffect(() => {
    if (open) {
      startScanner((device) => {
        onFound(device);
        onClose();
      });
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [open]);

  if (!open) return null;

  // ── NATIVE: show a modal while the native scanner launches ───────────────
  if (isNative) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      >
        <div
          className="w-full max-w-xs mx-4 rounded-3xl p-6 flex flex-col items-center gap-5"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* QR icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="5" y="5" width="3" height="3" fill="#22d3ee" stroke="none"/>
              <rect x="16" y="5" width="3" height="3" fill="#22d3ee" stroke="none"/>
              <rect x="5" y="16" width="3" height="3" fill="#22d3ee" stroke="none"/>
              <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3"/>
            </svg>
          </div>

          {/* Requesting / scanning state */}
          {(state === 'requesting' || state === 'scanning') && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin-slow" />
                <p className="text-cyan-400 text-sm font-semibold">
                  {state === 'requesting' ? 'Requesting permission…' : 'Opening QR scanner…'}
                </p>
              </div>
              <p className="text-slate-500 text-xs text-center leading-relaxed">
                The native QR scanner will open automatically.{'\n'}
                Point it at the BMS device QR code.
              </p>
            </>
          )}

          {/* Error / denied state */}
          {(state === 'denied' || state === 'error') && (
            <>
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl w-full"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-red-400 text-xs leading-relaxed">{error}</p>
              </div>
              <button
                onClick={() => startScanner((device) => { onFound(device); onClose(); })}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)' }}
              >
                Try Again
              </button>
            </>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold text-slate-400 active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── BROWSER: full-screen video feed with jsQR ────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Hidden canvas for jsQR processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />

      {/* Dark overlay with transparent scan-frame cutout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-full flex-1" style={{ background: 'rgba(0,0,0,0.6)' }} />
        <div className="flex items-center w-full">
          <div className="flex-1 h-64" style={{ background: 'rgba(0,0,0,0.6)' }} />
          <div className="relative w-64 h-64 flex-shrink-0">
            <CornerBrackets />
            {state === 'scanning' && <ScanLine />}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: '0 0 0 1px rgba(34,211,238,0.4), inset 0 0 40px rgba(34,211,238,0.05)' }}
            />
          </div>
          <div className="flex-1 h-64" style={{ background: 'rgba(0,0,0,0.6)' }} />
        </div>
        <div className="w-full flex-1" style={{ background: 'rgba(0,0,0,0.6)' }} />
      </div>

      {/* UI overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div
            className="px-4 py-2 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="text-white text-sm font-semibold">Scan QR Code</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Bottom status */}
        <div className="flex-1 flex flex-col items-center justify-end pb-8 gap-3 pointer-events-none">
          <BrowserStateIndicator state={state} error={error} />
          <p className="text-white/60 text-xs text-center max-w-[200px] leading-relaxed">
            Align the BMS QR code within the frame
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Shared sub-components ────────────────────────────────────────────────────

const CornerBrackets: React.FC = () => (
  <>
    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl border-cyan-400" />
    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl border-cyan-400" />
    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl border-cyan-400" />
    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-xl border-cyan-400" />
  </>
);

const ScanLine: React.FC = () => (
  <div className="absolute inset-x-2 overflow-hidden" style={{ top: 4, bottom: 4 }}>
    <div
      className="absolute left-0 right-0 h-0.5 rounded-full"
      style={{
        background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)',
        boxShadow: '0 0 8px rgba(34,211,238,0.9)',
        animation: 'qr-scan-line 2s ease-in-out infinite',
      }}
    />
  </div>
);

const BrowserStateIndicator: React.FC<{ state: ScannerState; error: string }> = ({ state, error }) => {
  if (state === 'requesting') return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <span className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin-slow" />
      <span className="text-cyan-400 text-xs font-medium">Requesting camera…</span>
    </div>
  );
  if (state === 'denied' || state === 'error') return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: 'rgba(69,10,10,0.85)' }}>
      <span className="text-red-400 text-xs font-medium">⚠ {error}</span>
    </div>
  );
  if (state === 'scanning') return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-cyan-400 text-xs font-medium">Scanning…</span>
    </div>
  );
  return null;
};

// Inject scan-line keyframe once
if (typeof document !== 'undefined') {
  const id = 'qr-scan-line-style';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes qr-scan-line {
        0%   { top: 0%; }
        50%  { top: calc(100% - 2px); }
        100% { top: 0%; }
      }
    `;
    document.head.appendChild(s);
  }
}
