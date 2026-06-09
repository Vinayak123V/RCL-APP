import React, { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useBmsStore }        from '../store/bmsStore';
import { useBLE }             from '../hooks/useBLEAdapter';
import { hasWebBluetooth, isBluetoothSecureContext } from '../lib/blePlatform';
import { useSettingsStore }   from '../store/settingsStore';
import { useDeviceHistoryStore, HistoricalDevice, ConnectionType } from '../store/deviceHistoryStore';
import { useT }               from '../i18n';
import { QRDevice }           from '../hooks/useQRScanner';
import { QRScannerView }      from '../components/mobile/QRScannerView';
import { QRConnectModal }     from '../components/mobile/QRConnectModal';
import { BLEDevice, DeviceConnectionState } from '../../../shared/types';
import { Tab }                from '../App';

interface Props {
  onNavigate: (t: Tab) => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type SubTab  = 'devices' | 'history';
type UIState = 'default' | 'qr-camera' | 'qr-confirm';

// ── Platform detection ────────────────────────────────────────────────────────
// isNative = true when running inside the Capacitor Android/iOS shell
const isNative       = Capacitor.isNativePlatform();
const hasElectron    = typeof window !== 'undefined' && !!(window as any).electronAPI;
const webBTSupported = !isNative && hasWebBluetooth();
// BLE is available if: native Capacitor app, Electron, or Web Bluetooth browser
const realBLEAvailable = isNative || hasElectron || webBTSupported;

export const ScanScreen: React.FC<Props> = ({ onToast }) => {
  const [subTab, setSubTab]         = useState<SubTab>('devices');
  const [uiState, setUiState]       = useState<UIState>('default');
  const [qrDevice, setQrDevice]     = useState<QRDevice | null>(null);
  const [connecting, setConnecting] = useState(false);

  const { devices, scanning, connectionStatus, connectedDeviceId } = useBmsStore();
  const { startScan, stopScan, connect, disconnect }               = useBLE();
  const { autoConnect, demoMode }                                  = useSettingsStore();
  const t = useT();

  const isConnected  = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // Error toasts are handled globally in App.tsx via the bmsStore error watcher.
  // No duplicate watcher needed here.

  /* ── Rescan: stop → clear → restart ── */
  const handleRescan = useCallback(async () => {
    if (scanning) await stopScan();
    useBmsStore.getState().clearDevices();
    useBmsStore.getState().resetAllDeviceStates();
    await startScan();
  }, [scanning, stopScan, startScan]);

  /* ── Connect via QR ── */
  const handleQRConnect = useCallback(async (device: QRDevice) => {
    setConnecting(true);
    setUiState('default');
    try {
      // Tell main.ts to auto-select this device from the picker
      if (typeof window !== 'undefined' && (window as any).electronApp?.setAutoSelectDevice) {
        (window as any).electronApp.setAutoSelectDevice(device.deviceId);
      }
      
      await connect(device.deviceId, 'QR');
      
      // Since connect() swallows errors, check if actually connected
      if (useBmsStore.getState().connectionStatus === 'connected') {
        onToast?.('Device connected successfully', 'success');
      } else {
        onToast?.('Connection failed — device not found', 'error');
      }
    } catch {
      onToast?.('Connection failed — device not found', 'error');
    } finally {
      setConnecting(false);
      setQrDevice(null);
    }
  }, [connect, onToast]);

  /* ── QR found callback ── */
  const handleQRFound = useCallback((device: QRDevice) => {
    setQrDevice(device);
    if (autoConnect) {
      handleQRConnect(device);
    } else {
      setUiState('qr-confirm');
    }
  }, [autoConnect, handleQRConnect]);

  /* ── Open QR camera ── */
  function openQRCamera() {
    if (isConnected) { onToast?.('Already connected to a device', 'info'); return; }
    setUiState('qr-camera');
  }

  /* ── Close all overlays ── */
  function closeOverlay() {
    setUiState('default');
    setQrDevice(null);
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-12 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">{t('scan_title')}</h1>
            <div className="w-9 h-9 rounded-xl glass flex items-center justify-center text-cyan-400">
              <BleIcon />
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex mt-5 glass rounded-2xl p-1 gap-1">
            {(['devices', 'history'] as SubTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${subTab === tab ? 'text-white' : 'text-slate-600'}`}
                style={subTab === tab ? { background: 'linear-gradient(135deg, #0891b2, #22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.25)' } : {}}
              >
                {tab === 'devices' ? t('scan_tab_device') : t('scan_tab_history')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 scroll-area px-4 pb-4 space-y-3">
          {subTab === 'devices' ? (
            <>
              {/* ── Browser support banner — only shown in browser, never on native Android/iOS ── */}
              {!isNative && !realBLEAvailable && !demoMode && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl animate-fade-in"
                  style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <p className="text-yellow-300 text-xs font-semibold">{t('bt_unavailable')}</p>
                    <p className="text-yellow-600 text-[11px] mt-0.5 leading-relaxed">{t('bt_unavailable_hint')}</p>
                  </div>
                </div>
              )}

              {/* ── Web BT info banner — only in Chrome/Edge browser, not on native ── */}
              {!isNative && webBTSupported && !hasElectron && !demoMode && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-cyan-400 text-[11px] leading-relaxed">
                    {t('bt_picker_hint')}
                    {!isBluetoothSecureContext() && (
                      <span className="block mt-1 text-yellow-400/90">
                        Use https://localhost:5173 — Chrome blocks BLE on plain HTTP except localhost.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* ── Primary action: Scan / Stop Scan ── */}
              <button
                onClick={scanning ? stopScan : startScan}
                disabled={isConnected || isConnecting}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-base active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={scanning ? {
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#ef4444',
                  boxShadow: 'none',
                } : {
                  background: 'linear-gradient(135deg, #0891b2, #22d3ee)',
                  color: '#fff',
                  boxShadow: '0 0 24px rgba(34,211,238,0.3)',
                }}
              >
                {scanning ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin-slow" />
                    <span>Stop Scan</span>
                  </>
                ) : (
                  <>
                    <ScanWaveIcon />
                    {demoMode ? t('scan_demo') : t('scan_nearby')}
                  </>
                )}
              </button>

              {/* ── QR connect ── */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={openQRCamera}
                  disabled={isConnected || isConnecting || connecting}
                  className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }}
                >
                  {connecting ? (
                    <span className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin-slow" />
                  ) : (
                    <QRIcon />
                  )}
                  {connecting ? t('connecting') : t('scan_qr')}
                </button>

                <button
                  onClick={() => {
                    const id = window.prompt("Enter Device ID or MAC Address:");
                    if (id && id.trim()) {
                      handleQRFound({ deviceId: id.trim(), mac: id.trim(), name: 'Manual Device' });
                    }
                  }}
                  disabled={isConnected || isConnecting || connecting}
                  className="w-14 py-3.5 rounded-2xl flex items-center justify-center font-semibold text-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Manual Entry"
                  style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
              </div>

              {/* ── Scanning pulse indicator ── */}
              {scanning && (
                <div className="flex items-center justify-center gap-2 py-1 animate-fade-in">
                  <div className="relative w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-75" />
                    <span className="relative w-2 h-2 rounded-full bg-cyan-400 block" />
                  </div>
                  <span className="text-cyan-400 text-xs font-medium">{t('scanning')}</span>
                </div>
              )}

              {/* ── Device count + Refresh button ── */}
              {devices.length > 0 && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <span className="text-slate-500 text-xs font-medium">
                    {devices.length} device{devices.length !== 1 ? 's' : ''} found
                  </span>
                  {/* Refresh / Rescan button */}
                  <button
                    onClick={handleRescan}
                    disabled={isConnecting}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg active:scale-95 transition-all disabled:opacity-30"
                    style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}
                    title="Rescan"
                  >
                    <RefreshIcon spinning={scanning} />
                    Refresh
                  </button>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
              )}

              {/* ── Device list ── */}
              {devices.length > 0 ? (
                <div className="space-y-2">
                  {devices.map((d, i) => {
                    const deviceConnectionState = d.connectionState || 'idle';
                    return (
                      <DeviceListItem
                        key={d.id}
                        device={d}
                        connectionState={deviceConnectionState}
                        // Allow connect only if NOTHING is currently connected/connecting globally
                        canConnect={
                          !isConnecting &&
                          !isConnected &&
                          deviceConnectionState !== 'connecting'
                        }
                        onConnect={() => connect(d.id)}
                        onDisconnect={() => disconnect()}
                        delay={i * 60}
                      />
                    );
                  })}
                </div>
              ) : !scanning ? (
                <EmptyDevices onQR={openQRCamera} onScan={startScan} />
              ) : null}
            </>
          ) : (
            <HistoricalTab
              onConnect={(id, type) => connect(id, type)}
              onToast={onToast}
            />
          )}
        </div>
      </div>

      {/* ── QR Camera (full-screen) ── */}
      <QRScannerView
        open={uiState === 'qr-camera'}
        onFound={handleQRFound}
        onClose={closeOverlay}
      />

      {/* ── QR Confirm modal ── */}
      <QRConnectModal
        open={uiState === 'qr-confirm'}
        device={qrDevice}
        connecting={connecting}
        onConnect={handleQRConnect}
        onClose={closeOverlay}
      />

    </>
  );
};

/* ── Device list item — states: idle / connecting / connected / disconnected / failed ── */
const DeviceListItem: React.FC<{
  device: BLEDevice;
  connectionState: DeviceConnectionState;
  canConnect: boolean;   // false only while another device is actively connecting
  onConnect: () => void;
  onDisconnect: () => void;
  delay: number;
}> = ({ device, connectionState, canConnect, onConnect, onDisconnect, delay }) => {
  const isConnected  = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const isFailed     = connectionState === 'failed';
  const isDisconnected = connectionState === 'disconnected';
  const t = useT();

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3 animate-fade-up transition-all duration-300"
      style={{
        animationDelay: `${delay}ms`,
        background: isConnected
          ? 'rgba(34,211,238,0.06)'
          : isFailed
          ? 'rgba(239,68,68,0.04)'
          : 'rgba(15,23,42,0.6)',
        border: isConnected
          ? '1px solid rgba(34,211,238,0.35)'
          : isConnecting
          ? '1px solid rgba(34,211,238,0.2)'
          : isFailed
          ? '1px solid rgba(239,68,68,0.18)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isConnected
          ? '0 0 20px rgba(34,211,238,0.12)'
          : isConnecting
          ? '0 0 12px rgba(34,211,238,0.08)'
          : 'none',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Left icon ── */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
        style={{
          background: isConnected
            ? 'rgba(34,211,238,0.15)'
            : isConnecting
            ? 'rgba(34,211,238,0.08)'
            : isFailed
            ? 'rgba(239,68,68,0.08)'
            : 'rgba(255,255,255,0.04)',
        }}
      >
        {isConnecting ? (
          <span className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin-slow" />
        ) : isFailed ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={isConnected ? '#22d3ee' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
          </svg>
        )}
      </div>

      {/* ── Device info ── */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate transition-colors duration-200 ${
          isConnected ? 'text-cyan-300' :
          isConnecting ? 'text-slate-300' :
          isFailed ? 'text-red-300' : 'text-slate-200'
        }`}>
          {device.name || 'Unknown Device'}
        </p>
        <p className="text-slate-600 text-xs font-mono mt-0.5 truncate">{device.address}</p>
        <RssiBars rssi={device.rssi} />
      </div>

      {/* ── Action area ── */}
      <div className="flex-shrink-0">
        {isConnected ? (
          /* Connected: show badge + Disconnect */
          <div className="flex flex-col items-end gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {t('connected')}
            </span>
            <button onClick={onDisconnect}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-all"
              style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
              {t('disconnect')}
            </button>
          </div>
        ) : isConnecting ? (
          /* Connecting: spinner badge only */
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
            style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
            <span className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin-slow" />
            {t('connecting')}
          </span>
        ) : isFailed ? (
          /* Failed: Retry button — always enabled regardless of canConnect */
          <div className="flex flex-col items-end gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {t('failed')}
            </span>
            <button
              onClick={onConnect}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-all"
              style={{ border: '1px solid rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' }}>
              {t('retry')}
            </button>
          </div>
        ) : (
          /* Idle / disconnected: Connect button */
          <div className="flex flex-col items-end gap-2">
            {isDisconnected && (
              <span className="text-[10px] text-slate-600 font-medium">Disconnected</span>
            )}
            <button
              onClick={onConnect}
              disabled={!canConnect}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-all disabled:opacity-30"
              style={{ border: '1px solid rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.06)' }}>
              {t('connect')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── RSSI bars ── */
const RssiBars: React.FC<{ rssi: number }> = ({ rssi }) => {
  const strength = Math.max(0, Math.min(100, ((rssi + 90) / 50) * 100));
  return (
    <div className="flex items-end gap-0.5 h-3 mt-1.5">
      {[25, 50, 75, 100].map((t, i) => (
        <div key={i} style={{ height: `${(i + 1) * 25}%` }}
          className={`w-1 rounded-sm ${strength >= t ? 'bg-cyan-500' : 'bg-slate-700'}`} />
      ))}
      <span className="text-[10px] text-slate-600 ml-1.5">{rssi} dBm</span>
    </div>
  );
};

const EmptyDevices: React.FC<{ onQR: () => void; onScan: () => void }> = ({ onQR, onScan }) => {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-5 py-10 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-slate-400 font-semibold text-sm">{t('no_device_found')}</p>
        <p className="text-slate-600 text-xs mt-2 max-w-[220px] leading-relaxed">{t('device_hint')}</p>
      </div>
      {/* Primary: Scan */}
      <button onClick={onScan}
        className="w-full max-w-xs py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-white active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #0891b2, #22d3ee)', boxShadow: '0 0 16px rgba(34,211,238,0.25)' }}>
        <ScanWaveIcon />
        {t('scan_nearby')}
      </button>
      <button onClick={onQR}
        className="w-full max-w-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-transform"
        style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' }}>
        <QRIcon size={14} /> {t('scan_qr')}
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   HistoricalTab — full persistent device history with search, filter, reconnect
   ───────────────────────────────────────────────────────────────────────────── */
const HistoricalTab: React.FC<{
  onConnect: (id: string, type: ConnectionType) => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ onConnect, onToast }) => {
  const t = useT();
  const { entries, forget, clearAll } = useDeviceHistoryStore();
  const { connectionStatus, connectedDeviceId } = useBmsStore();
  const isGloballyConnecting = connectionStatus === 'connecting';

  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<'All' | 'BLE' | 'QR'>('All');
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter + search
  const visible = entries.filter((e) => {
    const matchFilter = filter === 'All' || e.connectionType === filter;
    const matchSearch = !search.trim() ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.address.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  async function handleReconnect(entry: HistoricalDevice) {
    if (isGloballyConnecting || reconnectingId) return;
    setReconnectingId(entry.id);
    try {
      await onConnect(entry.id, entry.connectionType);
    } catch {
      onToast?.(t('hist_unavailable'), 'error');
    } finally {
      setReconnectingId(null);
    }
  }

  function handleForget(id: string) {
    forget(id);
  }

  function handleClearAll() {
    clearAll();
    setShowClearConfirm(false);
  }

  // Format timestamp to readable string
  function fmtDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  }

  const filterOptions: Array<'All' | 'BLE' | 'QR'> = ['All', 'BLE', 'QR'];
  const filterLabels: Record<'All' | 'BLE' | 'QR', string> = {
    All: t('hist_filter_all'),
    BLE: t('hist_filter_ble'),
    QR: t('hist_filter_qr'),
  };

  return (
    <div className="space-y-3 animate-fade-up">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <p className="text-slate-300 text-sm font-semibold">{t('hist_title')}</p>
        {entries.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg active:scale-95 transition-all"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {t('hist_clear_all')}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-slate-400 font-semibold text-sm">{t('no_history')}</p>
            <p className="text-slate-600 text-xs mt-2 max-w-[220px] leading-relaxed">{t('history_hint')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Search bar ── */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('hist_search')}
              className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-slate-700"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-600 active:scale-90 transition-transform">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* ── Filter chips ── */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {filterOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={filter === opt
                  ? { background: 'linear-gradient(135deg, #0891b2, #22d3ee)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {filterLabels[opt]}
              </button>
            ))}
          </div>

          {/* ── Device count ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <span className="text-slate-700 text-xs">{visible.length} device{visible.length !== 1 ? 's' : ''}</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>

          {/* ── Device cards ── */}
          {visible.length === 0 ? (
            <p className="text-center text-slate-600 text-xs py-8">No devices match your search.</p>
          ) : (
            <div className="space-y-2">
              {visible.map((entry, i) => {
                const isCurrentlyConnected = connectedDeviceId === entry.id && connectionStatus === 'connected';
                const isReconnecting = reconnectingId === entry.id;
                return (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    isCurrentlyConnected={isCurrentlyConnected}
                    isReconnecting={isReconnecting}
                    canReconnect={!isGloballyConnecting && !reconnectingId && connectionStatus !== 'connected'}
                    onReconnect={() => handleReconnect(entry)}
                    onForget={() => handleForget(entry.id)}
                    fmtDate={fmtDate}
                    delay={i * 50}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Clear-all confirmation overlay ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 animate-fade-up"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{t('hist_clear_all')}</p>
                <p className="text-slate-500 text-xs mt-0.5">{t('hist_clear_confirm')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl text-slate-400 text-sm font-semibold active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {t('cancel')}
              </button>
              <button onClick={handleClearAll}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Single history card ── */
const HistoryCard: React.FC<{
  entry: HistoricalDevice;
  isCurrentlyConnected: boolean;
  isReconnecting: boolean;
  canReconnect: boolean;
  onReconnect: () => void;
  onForget: () => void;
  fmtDate: (iso: string) => string;
  delay: number;
}> = ({ entry, isCurrentlyConnected, isReconnecting, canReconnect, onReconnect, onForget, fmtDate, delay }) => {
  const t = useT();

  const typeColor: Record<string, string> = {
    BLE: '#22d3ee', QR: '#a78bfa', Manual: '#fb923c',
  };
  const typeBg: Record<string, string> = {
    BLE: 'rgba(34,211,238,0.1)', QR: 'rgba(167,139,250,0.1)', Manual: 'rgba(251,146,60,0.1)',
  };

  return (
    <div
      className="rounded-2xl p-4 animate-fade-up transition-all duration-300"
      style={{
        animationDelay: `${delay}ms`,
        background: isCurrentlyConnected ? 'rgba(34,211,238,0.06)' : 'rgba(15,23,42,0.6)',
        border: isCurrentlyConnected ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isCurrentlyConnected ? '0 0 16px rgba(34,211,238,0.1)' : 'none',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Top row: icon + name + status badge */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isCurrentlyConnected ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={isCurrentlyConnected ? '#22d3ee' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold truncate ${isCurrentlyConnected ? 'text-cyan-300' : 'text-slate-200'}`}>
              {entry.name}
            </p>
            {/* Connection type badge */}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ color: typeColor[entry.connectionType], background: typeBg[entry.connectionType] }}>
              {entry.connectionType}
            </span>
          </div>
          <p className="text-slate-600 text-xs font-mono mt-0.5 truncate">{entry.address}</p>
        </div>

        {/* Status badge */}
        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
          style={isCurrentlyConnected
            ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }
            : { background: 'rgba(100,116,139,0.12)', color: '#64748b', border: '1px solid rgba(100,116,139,0.15)' }
          }>
          <span className={`w-1.5 h-1.5 rounded-full ${isCurrentlyConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
          {isCurrentlyConnected ? t('hist_status_connected') : t('hist_status_disconnected')}
        </span>
      </div>

      {/* Telemetry row (if available) */}
      {(entry.lastVoltage || entry.lastSoc != null || entry.lastTemp) && (
        <div className="flex items-center gap-3 mt-2.5 px-1">
          {entry.lastVoltage != null && (
            <span className="text-[11px] text-slate-500">
              <span className="text-slate-400 font-medium">{entry.lastVoltage.toFixed(1)}V</span>
            </span>
          )}
          {entry.lastSoc != null && (
            <span className="text-[11px] text-slate-500">
              <span className="text-slate-400 font-medium">{entry.lastSoc}%</span>
            </span>
          )}
          {entry.lastTemp != null && (
            <span className="text-[11px] text-slate-500">
              <span className="text-slate-400 font-medium">{entry.lastTemp.toFixed(0)}°C</span>
            </span>
          )}
          <span className="text-[11px] text-slate-700 ml-auto">
            {entry.totalSessions} {t('hist_sessions')}
          </span>
        </div>
      )}

      {/* Timestamp row */}
      <div className="flex items-center gap-1.5 mt-2 px-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span className="text-[11px] text-slate-600">{t('hist_last_seen')}: {fmtDate(entry.lastConnected)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {isCurrentlyConnected ? (
          <div className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {t('hist_status_connected')}
          </div>
        ) : isReconnecting ? (
          <div className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold"
            style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
            <span className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin-slow" />
            {t('hist_reconnecting')}
          </div>
        ) : (
          <button
            onClick={onReconnect}
            disabled={!canReconnect}
            className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all disabled:opacity-30"
            style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {t('hist_reconnect')}
          </button>
        )}
        <button
          onClick={onForget}
          className="px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all"
          style={{ background: 'rgba(239,68,68,0.07)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)' }}
        >
          {t('hist_forget')}
        </button>
      </div>
    </div>
  );
};

/* ── Icons ── */
function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={spinning ? { animation: 'spin-slow 1.4s linear infinite' } : {}}
    >
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}
function BleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
    </svg>
  );
}
function ScanWaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
    </svg>
  );
}
function QRIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
      <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
      <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/>
      <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3"/>
    </svg>
  );
}
