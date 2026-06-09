import { useEffect, useRef, useCallback } from 'react';
import { useBmsStore } from '../store/bmsStore';
import { useSettingsStore } from '../store/settingsStore';
import { BatteryData, BLEDevice } from '../../../shared/types';

// Mock BLE devices that appear during scan
const MOCK_DEVICES: BLEDevice[] = [
  { id: 'mock-001', name: 'JBD-BMS-001',  address: 'AA:BB:CC:DD:EE:01', rssi: -52 },
  { id: 'mock-002', name: 'JBD-SP04S-02', address: 'AA:BB:CC:DD:EE:02', rssi: -68 },
  { id: 'mock-003', name: 'RCL-BMS-PRO',  address: 'AA:BB:CC:DD:EE:03', rssi: -75 },
];

function generateMockData(base: Partial<BatteryData> = {}): BatteryData {
  const jitter = (v: number, range: number) => +(v + (Math.random() - 0.5) * range).toFixed(3);

  const voltage  = jitter(base.voltage  ?? 52.3,  0.4);
  const current  = jitter(base.current  ?? -10.2, 1.0);
  const soc      = Math.max(0, Math.min(100, jitter(base.soc ?? 85, 0.5)));
  const temps    = [jitter(30, 1.5), jitter(31, 1.5)];
  const cells    = Array.from({ length: 16 }, (_, i) =>
    jitter((base.cells?.[i] ?? 3.27), 0.02)
  );

  const status: BatteryData['status'] = current > 0.5 ? 'charging' : current < -0.5 ? 'discharging' : 'idle';

  return {
    voltage,
    current,
    soc,
    temperatures: temps,
    cells,
    chargeMos:    base.chargeMos    ?? true,
    dischargeMos: base.dischargeMos ?? true,
    status,
    warnings: [],
    timestamp: new Date().toISOString(),
  };
}

export function useMockBLE() {
  const store = useBmsStore();
  const settings = useSettingsStore();
  const dataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const lastDataRef     = useRef<Partial<BatteryData>>({});

  // Check if real Electron API is available
  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Wire up real Electron listeners if available
  useEffect(() => {
    if (!hasElectron) return;
    const api = window.electronAPI!;
    api.onDeviceFound(store.addDevice);
    api.onConnected(store.setConnected);
    api.onDisconnected(store.setDisconnected);
    api.onData(store.setData);
    api.onError((msg) => store.setError(msg));
    return () => {
      ['ble:devices:found','ble:connected','ble:disconnected','ble:data','ble:error']
        .forEach(ch => api.removeAllListeners(ch));
    };
  }, [hasElectron]);

  // Start mock data stream when connected
  const startDataStream = useCallback((deviceId: string) => {
    if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
    lastDataRef.current = {};
    dataIntervalRef.current = setInterval(() => {
      const d = generateMockData(lastDataRef.current);
      lastDataRef.current = d;
      store.setData(d);
    }, 2000);
    // Emit first data immediately
    const first = generateMockData();
    lastDataRef.current = first;
    store.setData(first);
  }, []);

  const stopDataStream = useCallback(() => {
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
      dataIntervalRef.current = null;
    }
  }, []);

  const startScan = useCallback(async () => {
    if (hasElectron) { await window.electronAPI!.startScan(); return; }

    store.clearDevices();
    store.setScanning(true);

    // Stagger mock device discovery
    MOCK_DEVICES.forEach((d, i) => {
      setTimeout(() => store.addDevice(d), 600 + i * 800);
    });

    scanTimeoutRef.current = setTimeout(() => store.setScanning(false), 5000);
  }, [hasElectron]);

  const stopScan = useCallback(async () => {
    if (hasElectron) { await window.electronAPI!.stopScan(); return; }
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    store.setScanning(false);
  }, [hasElectron]);

  const connect = useCallback(async (id: string) => {
    if (hasElectron) { await window.electronAPI!.connect(id); return; }

    // Simulate connection delay
    store.setScanning(false);
    await new Promise(r => setTimeout(r, 800));

    // Ensure the device exists in the store so the UI can display its name/address.
    // It may already be there from a BLE scan; if not (e.g. auto-connect or QR/manual),
    // look it up from the mock list or create a minimal placeholder.
    const known = useBmsStore.getState().devices.find(d => d.id === id);
    if (!known) {
      const mock = MOCK_DEVICES.find(d => d.id === id);
      // For QR/manual connections the id may be a MAC address — use it as address too
      const isMac = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(id);
      store.addDevice(mock ?? {
        id,
        name: isMac ? 'BMS Device' : id,
        address: isMac ? id : id,
        rssi: -70,
      });
    }

    store.setConnected(id);
    settings.setLastDevice(id);
    startDataStream(id);
  }, [hasElectron, startDataStream]);

  const disconnect = useCallback(async () => {
    if (hasElectron) { await window.electronAPI!.disconnect(); return; }
    stopDataStream();
    store.setDisconnected();
  }, [hasElectron, stopDataStream]);

  const sendCommand = useCallback(async (
    action: 'chargeOn' | 'chargeOff' | 'dischargeOn' | 'dischargeOff'
  ) => {
    if (hasElectron) {
      const result = await window.electronAPI![action]();
      store.setCommandResult(result);
      setTimeout(() => store.setCommandResult(null), 3000);
      return;
    }
    // Mock command
    const isOn = action.endsWith('On');
    const isCharge = action.startsWith('charge');
    lastDataRef.current = {
      ...lastDataRef.current,
      ...(isCharge ? { chargeMos: isOn } : { dischargeMos: isOn }),
    };
    store.setCommandResult({ success: true, message: `${isCharge ? 'Charge' : 'Discharge'} MOS ${isOn ? 'enabled' : 'disabled'}` });
    setTimeout(() => store.setCommandResult(null), 3000);
  }, [hasElectron]);

  // Auto-connect on mount if setting is enabled
  useEffect(() => {
    if (!hasElectron && settings.autoConnect && settings.lastDeviceId) {
      const device = MOCK_DEVICES.find(d => d.id === settings.lastDeviceId);
      if (device) {
        // Add device to store first so the UI can show its name immediately
        store.addDevice(device);
        setTimeout(() => connect(device.id), 1200);
      }
    }
  }, []); // run once on mount

  // Cleanup on unmount
  useEffect(() => () => {
    stopDataStream();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
  }, []);

  return { startScan, stopScan, connect, disconnect, sendCommand };
}
