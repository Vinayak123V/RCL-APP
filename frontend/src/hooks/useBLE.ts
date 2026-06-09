/**
 * useBLE — BLE hook with three tiers:
 *
 * 1. Electron (window.electronAPI)  — full IPC-based BLE, used in packaged app
 * 2. Web Bluetooth (navigator.bluetooth) — real BLE scan in Chrome/Edge browser
 * 3. Demo mode (settings.demoMode)  — simulated devices + data, opt-in only
 *
 * Web Bluetooth notes:
 *  - Requires HTTPS or localhost
 *  - Requires a user gesture to call requestDevice()
 *  - Chrome/Edge only (not Firefox/Safari)
 *  - navigator.bluetooth.requestDevice() shows the browser's native device picker
 *    (no background scan list — this is a browser security restriction)
 *  - After pairing, we read JBD BMS characteristics to get real battery data
 */
import { useEffect, useRef, useCallback } from 'react';
import { useBmsStore } from '../store/bmsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceHistoryStore, ConnectionType } from '../store/deviceHistoryStore';
import { BatteryData, BLEDevice } from '../../../shared/types';
import {
  CMD_BASIC_INFO,
  CMD_CELL_VOLTAGES,
  JBD_SERVICE,
  JBD_NOTIFY,
  JBD_WRITE,
  ingestJbdBytes,
  isMeaninglessBleChunk,
  JbdParsed,
} from '../lib/jbdBleProtocol';
import { hasWebBluetooth, webBluetoothBlockedReason } from '../lib/blePlatform';

export { hasWebBluetooth } from '../lib/blePlatform';

const POLL_INTERVAL_MS      = 2000;
const POLL_FAST_MS          = 1000;
const WEB_POST_WRITE_MS     = 450;
const WEB_NOTIFY_WAIT_MS    = 2200;
const WEB_NOTIFY_CHUNKS     = 3;
const NO_DATA_TIMEOUT_MS    = 15000;
const GATT_SETTLE_MS        = 600;

// ─── Demo-only data ───────────────────────────────────────────────────────────
const DEMO_DEVICES: BLEDevice[] = [
  { id: 'demo-001', name: 'JBD-BMS-001',  address: 'AA:BB:CC:DD:EE:01', rssi: -52, connectionState: 'idle' },
  { id: 'demo-002', name: 'JBD-SP04S-02', address: 'AA:BB:CC:DD:EE:02', rssi: -68, connectionState: 'idle' },
  { id: 'demo-003', name: 'RCL-BMS-PRO',  address: 'AA:BB:CC:DD:EE:03', rssi: -75, connectionState: 'idle' },
];

function makeDemoData(base: Partial<BatteryData> = {}): BatteryData {
  const j = (v: number, r: number) => +(v + (Math.random() - 0.5) * r).toFixed(3);
  const voltage = j(base.voltage ?? 52.3, 0.4);
  const current = j(base.current ?? -10.2, 1.0);
  const soc     = Math.max(0, Math.min(100, j(base.soc ?? 85, 0.5)));
  const cells   = Array.from({ length: 16 }, (_, i) => j(base.cells?.[i] ?? 3.27, 0.02));
  const status: BatteryData['status'] = current > 0.5 ? 'charging' : current < -0.5 ? 'discharging' : 'idle';
  return {
    voltage, current, soc,
    temperatures: [j(30, 1.5), j(31, 1.5)],
    cells,
    chargeMos:    base.chargeMos    ?? true,
    dischargeMos: base.dischargeMos ?? true,
    status,
    warnings: [],
    timestamp: new Date().toISOString(),
  };
}

function dataViewToBytes(dv: DataView): number[] {
  return Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
}

async function webWriteJbd(
  ch: BluetoothRemoteGATTCharacteristic,
  cmd: Uint8Array,
): Promise<void> {
  const data = new Uint8Array(cmd);
  if (ch.properties.writeWithoutResponse && ch.writeValueWithoutResponse) {
    await ch.writeValueWithoutResponse(data);
    return;
  }
  if (ch.properties.write) {
    await ch.writeValue(data);
    return;
  }
  if (ch.writeValueWithoutResponse) {
    await ch.writeValueWithoutResponse(data);
  } else {
    await ch.writeValue(data);
  }
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

/** Chrome allows only one GATT operation at a time — serialize read/write. */
function createGattQueue() {
  let chain = Promise.resolve();
  return <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(() => fn(), () => fn());
    chain = next.then(() => undefined, () => undefined);
    return next;
  };
}

const WEB_GATT_QUEUE = createGattQueue();

function bindWebDisconnectListener(
  device: BluetoothDevice,
  handler: () => void,
): void {
  const tagged = device as BluetoothDevice & { __rclDisconnectBound?: boolean };
  if (tagged.__rclDisconnectBound) return;
  device.addEventListener('gattserverdisconnected', handler);
  tagged.__rclDisconnectBound = true;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useBLE() {
  const store    = useBmsStore();
  const settings = useSettingsStore();
  const history  = useDeviceHistoryStore();

  // Refs for cleanup
  const dataIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimeoutRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const noDataTimeoutRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const lastDataRef        = useRef<Partial<BatteryData>>({});
  const webBTDeviceRef     = useRef<BluetoothDevice | null>(null);
  const writeCharRef       = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const notifyCharRef      = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const rxBufferRef        = useRef<number[]>([]);
  const hasPublishedDataRef = useRef(false);
  const webConnectInProgress = useRef(false);
  const parsedPacketCount   = useRef(0);
  const notifyResolvers     = useRef<Array<() => void>>([]);
  const webSession          = useRef(0);
  const webIntentionalDisconnect = useRef(false);

  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // ── Electron IPC listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!hasElectron) return;
    const api = window.electronAPI!;
    api.onDeviceFound(store.addDevice);
    api.onConnected((id: string) => {
      store.setConnected(id);
      // Record in history — device info comes from the scanned list
      const dev = useBmsStore.getState().devices.find(d => d.id === id);
      if (dev) history.recordConnect(dev, 'BLE');
    });
    api.onDisconnected(() => {
      const id = useBmsStore.getState().connectedDeviceId;
      if (id) history.recordDisconnect(id);
      store.setDisconnected();
    });
    api.onData((d: BatteryData) => {
      store.setData(d);
      const id = useBmsStore.getState().connectedDeviceId;
      if (id && d.voltage && d.soc != null) {
        history.updateTelemetry(id, d.voltage, d.soc, d.temperatures?.[0] ?? 0);
      }
    });
    api.onError(msg => store.setError(msg));
    return () => {
      ['ble:devices:found', 'ble:connected', 'ble:disconnected', 'ble:data', 'ble:error']
        .forEach(ch => api.removeAllListeners(ch));
    };
  }, [hasElectron]);

  // ── Demo stream helpers ───────────────────────────────────────────────────
  const startDemoStream = useCallback(() => {
    if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
    lastDataRef.current = {};
    const first = makeDemoData();
    lastDataRef.current = first;
    store.setData(first);
    dataIntervalRef.current = setInterval(() => {
      const d = makeDemoData(lastDataRef.current);
      lastDataRef.current = d;
      store.setData(d);
      // Update telemetry in history
      const id = useBmsStore.getState().connectedDeviceId;
      if (id) history.updateTelemetry(id, d.voltage, d.soc, d.temperatures?.[0] ?? 0);
    }, POLL_INTERVAL_MS);
  }, []);

  const stopDemoStream = useCallback(() => {
    if (dataIntervalRef.current) { clearInterval(dataIntervalRef.current); dataIntervalRef.current = null; }
  }, []);

  const clearNoDataTimer = useCallback(() => {
    if (noDataTimeoutRef.current) {
      clearTimeout(noDataTimeoutRef.current);
      noDataTimeoutRef.current = null;
    }
  }, []);

  const publishBatteryData = useCallback(() => {
    const d = lastDataRef.current;
    if (d.voltage === undefined || d.soc == null) return;

    const full: BatteryData = {
      voltage:      d.voltage,
      current:      d.current      ?? 0,
      soc:          d.soc,
      temperatures: d.temperatures?.length ? d.temperatures : [0],
      cells:        d.cells ?? [],
      cycles:       d.cycles,
      chargeMos:    d.chargeMos    ?? false,
      dischargeMos: d.dischargeMos ?? false,
      status:       d.status       ?? 'idle',
      warnings:     d.warnings     ?? [],
      timestamp:    d.timestamp    ?? new Date().toISOString(),
      remainCapacity: d.remainCapacity,
      fullCapacity:   d.fullCapacity,
    };

    hasPublishedDataRef.current = true;
    clearNoDataTimer();
    store.setData(full);
    const id = useBmsStore.getState().connectedDeviceId;
    if (id) history.updateTelemetry(id, full.voltage, full.soc, full.temperatures[0] ?? 0);
  }, [clearNoDataTimer]);

  const applyParsed = useCallback((parsed: JbdParsed) => {
    if (parsed.basic) {
      const { cycles, ...rest } = parsed.basic;
      lastDataRef.current = { ...lastDataRef.current, ...rest, cycles };
      publishBatteryData();
    }
    if (parsed.cells?.length) {
      lastDataRef.current = { ...lastDataRef.current, cells: parsed.cells };
      publishBatteryData();
    }
  }, [publishBatteryData]);

  const processRxChunk = useCallback((value: DataView) => {
    const bytes = dataViewToBytes(value);
    if (isMeaninglessBleChunk(bytes)) return;

    const parsed = ingestJbdBytes(rxBufferRef.current, bytes);
    if (parsed.length > 0) {
      parsedPacketCount.current += parsed.length;
      for (const p of parsed) applyParsed(p);
      const resolvers = notifyResolvers.current.splice(0);
      for (const resolve of resolvers) resolve();
    }
  }, [applyParsed]);

  const handleNotification = useCallback((event: Event) => {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    if (target.value) processRxChunk(target.value);
  }, [processRxChunk]);

  const waitForJbdPackets = useCallback((sinceCount: number, timeoutMs: number) => {
    if (parsedPacketCount.current > sinceCount) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let onPacket: () => void;
      const timer = setTimeout(() => {
        const idx = notifyResolvers.current.indexOf(onPacket);
        if (idx >= 0) notifyResolvers.current.splice(idx, 1);
        resolve();
      }, timeoutMs);

      onPacket = () => {
        clearTimeout(timer);
        const idx = notifyResolvers.current.indexOf(onPacket);
        if (idx >= 0) notifyResolvers.current.splice(idx, 1);
        resolve();
      };
      notifyResolvers.current.push(onPacket);
    });
  }, []);

  const webWriteAndCollect = useCallback(async (cmd: Uint8Array) => {
    const writeCh = writeCharRef.current;
    if (!writeCh || !webBTDeviceRef.current?.gatt?.connected) return;

    const countBefore = parsedPacketCount.current;

    // Serialized write — concurrent read+write on Chrome drops the GATT link
    await WEB_GATT_QUEUE(() => webWriteJbd(writeCh, cmd));
    await sleep(WEB_POST_WRITE_MS);

    // Data arrives on FF01 notifications (not readValue — avoids GATT conflicts)
    for (let i = 0; i < WEB_NOTIFY_CHUNKS; i++) {
      if (parsedPacketCount.current > countBefore) break;
      await waitForJbdPackets(countBefore, WEB_NOTIFY_WAIT_MS);
    }
  }, [waitForJbdPackets]);

  const requestWebBmsSnapshot = useCallback(async () => {
    await webWriteAndCollect(CMD_BASIC_INFO);
    await sleep(WEB_POST_WRITE_MS);
    await webWriteAndCollect(CMD_CELL_VOLTAGES);
  }, [webWriteAndCollect]);

  const startNoDataWatchdog = useCallback(() => {
    clearNoDataTimer();
    hasPublishedDataRef.current = false;
    noDataTimeoutRef.current = setTimeout(() => {
      if (!hasPublishedDataRef.current && webBTDeviceRef.current?.gatt?.connected) {
        store.setError(
          'Connected but no BMS data received. Close other BLE apps, use Chrome on HTTPS/localhost, and reconnect.',
        );
      }
    }, NO_DATA_TIMEOUT_MS);
  }, [clearNoDataTimer]);

  const startWebBTPolling = useCallback(() => {
    if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);

    const poll = async () => {
      if (!webBTDeviceRef.current?.gatt?.connected || webConnectInProgress.current) return;
      try {
        await requestWebBmsSnapshot();
      } catch { /* disconnect handler cleans up */ }
    };

    poll();
    dataIntervalRef.current = setInterval(poll, POLL_FAST_MS);

    const slowDown = setInterval(() => {
      if (hasPublishedDataRef.current && dataIntervalRef.current) {
        clearInterval(slowDown);
        clearInterval(dataIntervalRef.current!);
        dataIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
      }
    }, 500);
  }, [requestWebBmsSnapshot]);

  const handleWebBTDisconnect = useCallback(() => {
    // Ignore disconnect events fired while connect() is still setting up GATT
    if (webConnectInProgress.current) return;

    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
      dataIntervalRef.current = null;
    }
    clearNoDataTimer();
    notifyResolvers.current = [];

    const connectedId = store.connectedDeviceId;
    if (connectedId) {
      store.updateDeviceState(connectedId, 'disconnected');
      if (!webIntentionalDisconnect.current) {
        history.recordDisconnect(connectedId);
      }
    }

    writeCharRef.current  = null;
    notifyCharRef.current = null;
    rxBufferRef.current = [];
    parsedPacketCount.current = 0;
    webIntentionalDisconnect.current = false;
    store.setDisconnected();
  }, [clearNoDataTimer]);

  // ── Auto-connect on mount (Electron only) ─────────────────────────────────
  useEffect(() => {
    if (hasElectron && settings.autoConnect && settings.lastDeviceId) {
      window.electronAPI!.connect(settings.lastDeviceId).catch(() => {});
    }
    // Demo mode: auto-connect to last device from history
    if (!hasElectron && settings.demoMode && settings.autoConnect && settings.lastDeviceId) {
      const lastId = settings.lastDeviceId;
      // Small delay so the UI is ready
      setTimeout(() => {
        const histEntries = useDeviceHistoryStore.getState().entries;
        const lastEntry = histEntries.find(e => e.id === lastId);
        if (lastEntry) {
          connect(lastId, lastEntry.connectionType).catch(() => {});
        }
      }, 500);
    }
  }, []);

  // Do not disconnect GATT on unmount — React Strict Mode would drop Chrome links instantly.
  useEffect(() => () => {
    stopDemoStream();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
    clearNoDataTimer();
  }, [stopDemoStream, clearNoDataTimer]);

  // ── Public API ────────────────────────────────────────────────────────────

  const startScan = useCallback(async () => {
    // 1. Electron
    if (hasElectron) { await window.electronAPI!.startScan(); return; }

    // 2. Web Bluetooth — requestDevice() IS the scan (browser shows native picker)
    const webBlocked = webBluetoothBlockedReason();
    if (webBlocked) {
      store.setError(webBlocked);
      return;
    }
    if (hasWebBluetooth()) {
      store.clearDevices();
      store.setScanning(true);
      store.setError(null);
      try {
        const device = await navigator.bluetooth!.requestDevice({
          acceptAllDevices: true,
          optionalServices: [JBD_SERVICE, 'battery_service', '0000180a-0000-1000-8000-00805f9b34fb'],
        });

        // Device selected — add to store immediately so it shows in the list
        const bleDevice: BLEDevice = {
          id:      device.id,
          name:    device.name || 'Unknown BLE Device',
          address: device.id,   // Web BT doesn't expose MAC — use opaque id
          rssi:    0,           // Web BT doesn't expose RSSI at scan time
        };
        store.addDevice(bleDevice);

        // Keep a ref so we can connect to it
        webBTDeviceRef.current = device;
        bindWebDisconnectListener(device, handleWebBTDisconnect);
        
        // Auto-connect as soon as the user selects the device in the browser dialog
        setTimeout(() => connect(device.id), 100);
      } catch (err: any) {
        if (err?.name !== 'NotFoundError') {
          // NotFoundError = user cancelled picker — not an error
          store.setError(err?.message ?? 'Bluetooth scan failed');
        }
      } finally {
        store.setScanning(false);
      }
      return;
    }

    // 3. Demo mode
    if (settings.demoMode) {
      store.clearDevices();
      store.setScanning(true);
      DEMO_DEVICES.forEach((d, i) => setTimeout(() => store.addDevice(d), 600 + i * 800));
      scanTimeoutRef.current = setTimeout(() => store.setScanning(false), 5000);
      return;
    }

    store.setError('Bluetooth is not available. Use Chrome or Edge on HTTPS/localhost, or enable Demo Mode.');
  }, [hasElectron, settings.demoMode, handleWebBTDisconnect]);

  const stopScan = useCallback(async () => {
    if (hasElectron) { await window.electronAPI!.stopScan(); return; }
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    store.setScanning(false);
  }, [hasElectron]);

  const connect = useCallback(async (id: string, connectionType: ConnectionType = 'BLE') => {
    // Update device state to connecting
    store.updateDeviceState(id, 'connecting');
    
    // 1. Electron
    if (hasElectron) {
      store.setConnecting(id);
      try {
        await window.electronAPI!.connect(id);
        // History recorded in the onConnected IPC listener above
      } catch (err: any) {
        store.updateDeviceState(id, 'failed');
        store.setError(err?.message ?? 'Connection failed');
      }
      return;
    }

    const webBlocked = webBluetoothBlockedReason();
    if (webBlocked) {
      store.updateDeviceState(id, 'failed');
      store.setError(webBlocked);
      return;
    }

    // 2. Web Bluetooth (Chrome / Edge on HTTPS or localhost)
    if (hasWebBluetooth()) {
      if (webConnectInProgress.current) return;
      webConnectInProgress.current = true;
      const session = ++webSession.current;

      store.setConnecting(id);
      store.setError(null);

      let device: BluetoothDevice | null = null;

      try {
        device = webBTDeviceRef.current?.id === id ? webBTDeviceRef.current : null;

        if (!device) {
          device = await navigator.bluetooth!.requestDevice({
            acceptAllDevices: true,
            optionalServices: [JBD_SERVICE, 'battery_service', '0000180a-0000-1000-8000-00805f9b34fb'],
          });
          webBTDeviceRef.current = device;
          bindWebDisconnectListener(device, handleWebBTDisconnect);
        }

        const server = await WEB_GATT_QUEUE(() => device!.gatt!.connect());

        let service: BluetoothRemoteGATTService;
        try {
          service = await WEB_GATT_QUEUE(() => server.getPrimaryService(JBD_SERVICE));
        } catch {
          if (session !== webSession.current) return;
          const bleDevice: BLEDevice = {
            id: device.id,
            name: device.name || 'BLE Device',
            address: device.id,
            rssi: 0,
            connectionState: 'connected',
          };
          store.addDevice(bleDevice);
          store.setConnected(device.id);
          settings.setLastDevice(device.id);
          history.recordConnect(bleDevice, connectionType);
          store.setError('Connected but no JBD BMS service (0xFF00) found. Pick the BMS in the Chrome device list.');
          return;
        }

        const writeCh = await WEB_GATT_QUEUE(() => service.getCharacteristic(JBD_WRITE));
        const notifyCh = await WEB_GATT_QUEUE(() => service.getCharacteristic(JBD_NOTIFY));

        if (session !== webSession.current) return;

        writeCharRef.current  = writeCh;
        notifyCharRef.current = notifyCh;
        rxBufferRef.current = [];
        lastDataRef.current = {};
        hasPublishedDataRef.current = false;
        parsedPacketCount.current = 0;
        notifyResolvers.current = [];

        const notifyTagged = notifyCh as BluetoothRemoteGATTCharacteristic & {
          __rclNotifyBound?: boolean;
        };
        if (!notifyTagged.__rclNotifyBound) {
          await WEB_GATT_QUEUE(() => notifyCh.startNotifications());
          notifyCh.addEventListener('characteristicvaluechanged', handleNotification);
          notifyTagged.__rclNotifyBound = true;
        }

        await sleep(GATT_SETTLE_MS);

        if (session !== webSession.current) return;

        const bleDevice: BLEDevice = {
          id:      device.id,
          name:    device.name || 'JBD BMS',
          address: device.id,
          rssi:    0,
          connectionState: 'connected',
        };
        store.addDevice(bleDevice);
        store.updateDeviceState(device.id, 'connected');
        store.setConnected(device.id);
        settings.setLastDevice(device.id);
        history.recordConnect(bleDevice, connectionType);
      } catch (err: any) {
        webSession.current++;
        store.updateDeviceState(id, 'failed');
        useBmsStore.setState({ connectionStatus: 'disconnected', connectedDeviceId: null });
        if (err?.name !== 'NotFoundError') {
          const msg = err?.message ?? 'Connection failed';
          store.setError(
            msg.includes('cancel') || err?.name === 'NotFoundError'
              ? 'Device selection cancelled.'
              : `${msg} Close the JBD app and retry.`,
          );
        }
        if (device?.gatt?.connected) {
          try { device.gatt.disconnect(); } catch { /* ignore */ }
        }
        writeCharRef.current = null;
        notifyCharRef.current = null;
        return;
      } finally {
        webConnectInProgress.current = false;
      }

      if (session !== webSession.current || !device?.gatt?.connected) return;

      startNoDataWatchdog();
      try {
        await requestWebBmsSnapshot();
      } catch {
        store.setError('Connected — reading BMS data…');
      }

      if (session === webSession.current && device.gatt?.connected) {
        startWebBTPolling();
      }
      return;
    }

    // 3. Demo mode
    if (settings.demoMode) {
      store.setConnecting(id);
      await new Promise(r => setTimeout(r, 800));
      const known = useBmsStore.getState().devices.find(d => d.id === id);
      let devInfo: BLEDevice;
      if (!known) {
        const demo = DEMO_DEVICES.find(d => d.id === id);
        const isMac = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(id);
        devInfo = demo ?? { id, name: isMac ? 'BMS Device' : id, address: id, rssi: -70, connectionState: 'connected' };
        store.addDevice(devInfo);
      } else {
        devInfo = known;
        store.updateDeviceState(id, 'connected');
      }
      store.setConnected(id);
      settings.setLastDevice(id);
      history.recordConnect(devInfo, connectionType);
      startDemoStream();
      return;
    }

    store.updateDeviceState(id, 'failed');
    store.setError('Bluetooth not available. Enable Demo Mode to test the UI.');
  }, [
    hasElectron, settings.demoMode, handleWebBTDisconnect, handleNotification,
    startWebBTPolling, startDemoStream, requestWebBmsSnapshot, startNoDataWatchdog,
  ]);

  const disconnect = useCallback(async () => {
    const connectedId = store.connectedDeviceId;
    
    // 1. Electron
    if (hasElectron) { 
      if (connectedId) {
        store.updateDeviceState(connectedId, 'disconnected');
        history.recordDisconnect(connectedId);
      }
      await window.electronAPI!.disconnect(); 
      return; 
    }

    // 2. Web Bluetooth
    if (webBTDeviceRef.current?.gatt?.connected) {
      webSession.current++;
      webIntentionalDisconnect.current = true;
      clearNoDataTimer();
      if (connectedId) {
        store.updateDeviceState(connectedId, 'disconnected');
        history.recordDisconnect(connectedId);
      }
      const dev = webBTDeviceRef.current;
      const notifyCh = notifyCharRef.current;
      if (notifyCh) {
        try {
          notifyCh.removeEventListener('characteristicvaluechanged', handleNotification);
          await WEB_GATT_QUEUE(() => notifyCh.stopNotifications());
        } catch { /* ignore */ }
      }
      try { dev.gatt!.disconnect(); } catch { /* ignore */ }
      handleWebBTDisconnect();
      return;
    }

    // 3. Demo / fallback
    if (connectedId) {
      store.updateDeviceState(connectedId, 'disconnected');
      history.recordDisconnect(connectedId);
    }
    stopDemoStream();
    store.setDisconnected();
  }, [hasElectron, handleNotification, handleWebBTDisconnect, stopDemoStream, clearNoDataTimer]);

  const sendCommand = useCallback(async (
    action: 'chargeOn' | 'chargeOff' | 'dischargeOn' | 'dischargeOff'
  ) => {
    // 1. Electron
    if (hasElectron) {
      const result = await window.electronAPI![action]();
      store.setCommandResult(result);
      setTimeout(() => store.setCommandResult(null), 3000);
      return;
    }

    // 2. Web Bluetooth — JBD MOS control commands
    if (writeCharRef.current) {
      const reg   = action.startsWith('charge') ? 0xE1 : 0xE2;
      const val   = action.endsWith('On') ? 0x01 : 0x00;
      const sum   = (0xFF - ((0x5A + reg + 0x01 + val) & 0xFF) + 1) & 0xFF;
      const cmd   = new Uint8Array([0xDD, 0x5A, reg, 0x01, val, sum, 0x77]);
      const writeCh = writeCharRef.current;
      try {
        await WEB_GATT_QUEUE(() => webWriteJbd(writeCh, cmd));
        const label = action.startsWith('charge') ? 'Charge' : 'Discharge';
        store.setCommandResult({ success: true, message: `${label} MOS ${action.endsWith('On') ? 'enabled' : 'disabled'}` });
      } catch (e: any) {
        store.setCommandResult({ success: false, message: e?.message ?? 'Command failed' });
      }
      setTimeout(() => store.setCommandResult(null), 3000);
      return;
    }

    // 3. Demo mode
    if (settings.demoMode) {
      const isOn = action.endsWith('On');
      const isCharge = action.startsWith('charge');
      lastDataRef.current = {
        ...lastDataRef.current,
        ...(isCharge ? { chargeMos: isOn } : { dischargeMos: isOn }),
      };
      store.setCommandResult({ success: true, message: `${isCharge ? 'Charge' : 'Discharge'} MOS ${isOn ? 'enabled' : 'disabled'}` });
      setTimeout(() => store.setCommandResult(null), 3000);
      return;
    }

    store.setError('BLE not available.');
  }, [hasElectron, settings.demoMode]);

  const sendConfiguration = useCallback(async (paramName: string, value: number) => {
    // Map parameters to dummy register addresses (since we are bypassing backend, 
    // we use these to show data flowing properly via BLE)
    const paramMap: Record<string, { reg: number, scale: number }> = {
      'highCellVolt': { reg: 0x01, scale: 1000 }, // Changed from 0x10 to 0x01 to free up 0x10
      'lowCellVolt': { reg: 0x11, scale: 1000 },
      'highTemp': { reg: 0x12, scale: 10 },
      'lowTemp': { reg: 0x13, scale: 10 },
      'chargeCurrent': { reg: 0x14, scale: 100 },
      'dischargeCurrent': { reg: 0x15, scale: 100 },
      'nominalCapacity': { reg: 0x10, scale: 100 } // Nominal capacity is at register 0x10
    };

    const config = paramMap[paramName];
    if (!config) {
      store.setError(`Unknown parameter: ${paramName}`);
      return;
    }

    const reg = config.reg;
    const len = 0x02; // 2 bytes of data
    // Scale the value based on the parameter type (e.g. V to mV)
    // Adding 273.1 offset for temperatures is standard in JBD but keeping it simple with raw scaling for this mock
    let val = Math.round(value * config.scale);
    
    // For temperature, JBD typically uses 2731 + temp * 10
    if (paramName.includes('Temp')) {
      val = Math.round(2731 + (value * 10));
    }

    const b0 = (val >> 8) & 0xFF;
    const b1 = val & 0xFF;
    
    // JBD Checksum is 0x10000 - (sum of register + length + data bytes)
    const sum = reg + len + b0 + b1;
    const checksum = (0x10000 - sum) & 0xFFFF;
    const chkH = (checksum >> 8) & 0xFF;
    const chkL = checksum & 0xFF;
    
    // Final Packet Array
    const packet = [0xDD, 0x5A, reg, len, b0, b1, chkH, chkL, 0x77];
    const cmd = new Uint8Array(packet);

    // If setting nominal capacity, we should also set Cycle Capacity (0x11) 
    // because Cycle Capacity is what the BMS actually reports as Full Capacity in the 0x03 packet.
    let cmd2: Uint8Array | null = null;
    if (paramName === 'nominalCapacity') {
      const reg2 = 0x11;
      const sum2 = reg2 + len + b0 + b1;
      const chk2 = (0x10000 - sum2) & 0xFFFF;
      cmd2 = new Uint8Array([0xDD, 0x5A, reg2, len, b0, b1, (chk2 >> 8) & 0xFF, chk2 & 0xFF, 0x77]);
    }

    // Factory unlock sequence: Write 0x5678 to register 0x00
    // Checksum: 0x10000 - (0x00 + 0x02 + 0x56 + 0x78) = 0xFF32
    const unlockPacket = new Uint8Array([0xDD, 0x5A, 0x00, 0x02, 0x56, 0x78, 0xFF, 0x32, 0x77]);

    // 1. Electron
    if (hasElectron) {
      store.setCommandResult({ success: true, message: `Electron: Set ${paramName} to ${value} (Simulated)` });
      setTimeout(() => store.setCommandResult(null), 3000);
      return;
    }

    // 2. Web Bluetooth — JBD EEPROM Write (0x5A)
    if (writeCharRef.current) {
      const writeCh = writeCharRef.current;
      try {
        // Unlock EEPROM
        await WEB_GATT_QUEUE(() => webWriteJbd(writeCh, unlockPacket));
        await new Promise(r => setTimeout(r, 100)); // Delay for BMS to process

        // Write new parameter value (Design Capacity / target)
        await WEB_GATT_QUEUE(() => webWriteJbd(writeCh, cmd));
        await new Promise(r => setTimeout(r, 150)); 
        
        // Write Cycle Capacity if needed
        if (cmd2) {
          await WEB_GATT_QUEUE(() => webWriteJbd(writeCh, cmd2));
          await new Promise(r => setTimeout(r, 150));
        }

        // Refresh Basic Info immediately to show updated capacity in UI
        await WEB_GATT_QUEUE(() => webWriteJbd(writeCh, CMD_BASIC_INFO));
        
        store.setCommandResult({ success: true, message: `Set ${paramName} to ${value} successfully` });
      } catch (e: any) {
        store.setCommandResult({ success: false, message: e?.message ?? 'Write failed' });
      }
      setTimeout(() => store.setCommandResult(null), 3000);
      return;
    }

    // 3. Demo mode
    if (settings.demoMode) {
      store.setCommandResult({ success: true, message: `Demo: Set ${paramName} to ${value} successfully` });
      setTimeout(() => store.setCommandResult(null), 3000);
      return;
    }

    store.setError('BLE not available.');
  }, [hasElectron, settings.demoMode]);

  return { startScan, stopScan, connect, disconnect, sendCommand, sendConfiguration };
}
