/**
 * useCapacitorBLE — Android / iOS BLE via @capacitor-community/bluetooth-le.
 *
 * JBD / GQ SPP (service 0xFF00):
 *   FF01 — NOTIFY + READ  (Module → Phone)
 *   FF02 — WRITE NO RESPONSE (Phone → Module)
 *
 * Protocol: write DD A5 03/04… to FF02, response on FF01 (often 2 notify chunks).
 * Many phones also need READ on FF01 after each write (iOS especially).
 */

import { useCallback, useRef, useEffect } from 'react';
import {
  BleClient,
  ScanResult,
  ScanMode,
  ConnectionPriority,
  dataViewToNumbers,
  numbersToDataView,
} from '@capacitor-community/bluetooth-le';
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

const SCAN_DURATION_MS   = 15_000;
const POLL_INTERVAL_MS   =  2_000;
const POLL_FAST_MS       =    800;
const GATT_SETTLE_MS     =    400;
const WRITE_READ_GAP_MS  =    120;
const READ_RETRIES       =      4;
const NO_DATA_TIMEOUT_MS = 12_000;

function jbdDeviceName(result: ScanResult): string {
  const gap = result.localName?.trim() || result.device.name?.trim();
  if (gap) return gap;

  if (result.manufacturerData) {
    for (const key of Object.keys(result.manufacturerData)) {
      const dv = result.manufacturerData[key];
      if (!dv || dv.byteLength < 2) continue;
      try {
        const bytes = dataViewToNumbers(dv);
        const ascii = bytes
          .map(b => (b >= 0x20 && b < 0x7F) ? String.fromCharCode(b) : '')
          .join('')
          .trim();
        if (ascii.length >= 4) return ascii;
      } catch { /* ignore */ }
    }
  }

  return `BMS ${result.device.deviceId}`;
}

export function useCapacitorBLE() {
  const store    = useBmsStore();
  const settings = useSettingsStore();
  const history  = useDeviceHistoryStore();

  const connectedId       = useRef<string | null>(null);
  const pollInterval        = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimeout         = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const noDataTimeout       = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const rxBuffer            = useRef<number[]>([]);
  const lastData            = useRef<Partial<BatteryData>>({});
  const bleReady            = useRef(false);
  const connectInProgress   = useRef(false);
  const bleSession          = useRef(0);
  const hasPublishedData    = useRef(false);

  async function ensureReady() {
    if (bleReady.current) return;
    await BleClient.initialize({ androidNeverForLocation: true });
    bleReady.current = true;
  }

  useEffect(() => () => {
    _stopPoll();
    _clearScanTimer();
    _clearNoDataTimer();
  }, []);

  function _stopPoll() {
    if (pollInterval.current) { clearInterval(pollInterval.current); pollInterval.current = null; }
  }
  function _clearScanTimer() {
    if (scanTimeout.current) { clearTimeout(scanTimeout.current); scanTimeout.current = null; }
  }
  function _clearNoDataTimer() {
    if (noDataTimeout.current) { clearTimeout(noDataTimeout.current); noDataTimeout.current = null; }
  }

  const publishBatteryData = useCallback(() => {
    const d = lastData.current;
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

    hasPublishedData.current = true;
    _clearNoDataTimer();
    store.setData(full);
    const id = connectedId.current;
    if (id) {
      history.updateTelemetry(id, full.voltage, full.soc, full.temperatures[0] ?? 0);
    }
  }, []);

  const applyParsed = useCallback((parsed: JbdParsed) => {
    if (parsed.basic) {
      const { cycles, ...rest } = parsed.basic;
      lastData.current = { ...lastData.current, ...rest, cycles };
      publishBatteryData();
    }
    if (parsed.cells?.length) {
      lastData.current = { ...lastData.current, cells: parsed.cells };
      publishBatteryData();
    }
  }, [publishBatteryData]);

  const processRxChunk = useCallback((value: DataView) => {
    const chunk = dataViewToNumbers(value);
    if (isMeaninglessBleChunk(chunk)) return;
    const chunks = ingestJbdBytes(rxBuffer.current, chunk);
    for (const p of chunks) applyParsed(p);
  }, [applyParsed]);

  const handleNotification = useCallback((value: DataView) => {
    processRxChunk(value);
  }, [processRxChunk]);

  /** Write command to FF02, then READ FF01 (notify may not fire on some stacks). */
  const writeAndRead = useCallback(async (deviceId: string, cmd: Uint8Array) => {
    await BleClient.writeWithoutResponse(
      deviceId, JBD_SERVICE, JBD_WRITE,
      numbersToDataView(Array.from(cmd)),
    );

    for (let i = 0; i < READ_RETRIES; i++) {
      await new Promise(r => setTimeout(r, WRITE_READ_GAP_MS));
      try {
        const raw = await BleClient.read(deviceId, JBD_SERVICE, JBD_NOTIFY);
        if (raw.byteLength > 0) processRxChunk(raw);
      } catch { /* read may fail while packet still in flight */ }
    }
  }, [processRxChunk]);

  const requestBmsSnapshot = useCallback(async (deviceId: string) => {
    await writeAndRead(deviceId, CMD_BASIC_INFO);
    await new Promise(r => setTimeout(r, WRITE_READ_GAP_MS));
    await writeAndRead(deviceId, CMD_CELL_VOLTAGES);
  }, [writeAndRead]);

  const startNoDataWatchdog = useCallback(() => {
    _clearNoDataTimer();
    hasPublishedData.current = false;
    noDataTimeout.current = setTimeout(() => {
      if (!hasPublishedData.current && connectedId.current) {
        store.setError(
          'Connected but no BMS data received. Close the JBD app, stay near the device, and tap Connect again.',
        );
      }
    }, NO_DATA_TIMEOUT_MS);
  }, []);

  const startPoll = useCallback((deviceId: string) => {
    _stopPoll();
    lastData.current = {};
    rxBuffer.current = [];

    const poll = async () => {
      if (!connectedId.current) return;
      try {
        await requestBmsSnapshot(deviceId);
      } catch { /* disconnect callback handles cleanup */ }
    };

    poll();
    const interval = hasPublishedData.current ? POLL_INTERVAL_MS : POLL_FAST_MS;
    pollInterval.current = setInterval(poll, interval);

    // Switch to slower poll after first data
    const checkSlow = setInterval(() => {
      if (hasPublishedData.current && pollInterval.current) {
        clearInterval(checkSlow);
        _stopPoll();
        pollInterval.current = setInterval(poll, POLL_INTERVAL_MS);
      }
    }, 500);
  }, [requestBmsSnapshot]);

  const startScan = useCallback(async () => {
    try {
      await ensureReady();
      store.clearDevices();
      store.setScanning(true);
      store.setError(null);

      try {
        const bonded = await BleClient.getBondedDevices();
        for (const b of bonded) {
          store.addDevice({
            id: b.deviceId, name: b.name || `BMS ${b.deviceId}`,
            address: b.deviceId, rssi: 0, connectionState: 'idle',
          });
        }
      } catch { /* Android-only */ }

      try {
        const connected = await BleClient.getConnectedDevices([JBD_SERVICE]);
        for (const c of connected) {
          store.addDevice({
            id: c.deviceId, name: c.name || `BMS ${c.deviceId}`,
            address: c.deviceId, rssi: 0, connectionState: 'idle',
          });
        }
      } catch { /* ignore */ }

      await BleClient.requestLEScan(
        { allowDuplicates: true, scanMode: ScanMode.SCAN_MODE_LOW_LATENCY },
        (result: ScanResult) => {
          store.addDevice({
            id:      result.device.deviceId,
            name:    jbdDeviceName(result),
            address: result.device.deviceId,
            rssi:    result.rssi ?? 0,
            connectionState: 'idle',
          } as BLEDevice);
        },
      );

      scanTimeout.current = setTimeout(async () => {
        await BleClient.stopLEScan().catch(() => {});
        store.setScanning(false);
      }, SCAN_DURATION_MS);

    } catch (err: any) {
      const raw: string = err?.message ?? 'Bluetooth scan failed';
      let msg = raw;
      if (raw.toLowerCase().includes('location')) {
        msg = 'Location permission required for BLE scan on Android 6–11.';
      } else if (raw.toLowerCase().includes('bluetooth') || raw.toLowerCase().includes('disabled')) {
        msg = 'Bluetooth is disabled or permission denied.';
      }
      store.setError(msg);
      store.setScanning(false);
    }
  }, []);

  const stopScan = useCallback(async () => {
    _clearScanTimer();
    await BleClient.stopLEScan().catch(() => {});
    store.setScanning(false);
  }, []);

  const handlePeripheralDisconnect = useCallback((session: number) => {
    if (session !== bleSession.current) return;
    _stopPoll();
    _clearNoDataTimer();
    const cid = connectedId.current;
    connectedId.current = null;
    if (cid) {
      store.updateDeviceState(cid, 'disconnected');
      history.recordDisconnect(cid);
    }
    store.setDisconnected();
  }, []);

  const teardownGatt = useCallback(async (deviceId: string) => {
    try {
      await BleClient.stopNotifications(deviceId, JBD_SERVICE, JBD_NOTIFY);
    } catch { /* not subscribed */ }
    await BleClient.disconnect(deviceId).catch(() => {});
  }, []);

  const connect = useCallback(async (id: string, connectionType: ConnectionType = 'BLE') => {
    if (connectInProgress.current) return;

    connectInProgress.current = true;
    const session = ++bleSession.current;

    store.updateDeviceState(id, 'connecting');
    store.setConnecting(id);
    store.setError(null);

    try {
      await ensureReady();

      const previousId = connectedId.current;
      if (previousId) {
        _stopPoll();
        _clearNoDataTimer();
        await teardownGatt(previousId);
        connectedId.current = null;
      }

      await BleClient.stopLEScan().catch(() => {});
      _clearScanTimer();
      store.setScanning(false);

      await BleClient.connect(id, () => {
        handlePeripheralDisconnect(session);
      }, { timeout: 15000 });

      if (session !== bleSession.current) {
        await BleClient.disconnect(id).catch(() => {});
        return;
      }

      connectedId.current = id;
      rxBuffer.current = [];
      lastData.current = {};
      hasPublishedData.current = false;

      await BleClient.discoverServices(id);
      await BleClient.requestConnectionPriority(
        id, ConnectionPriority.CONNECTION_PRIORITY_HIGH,
      ).catch(() => {});

      await new Promise(r => setTimeout(r, GATT_SETTLE_MS));

      if (session !== bleSession.current) {
        await teardownGatt(id);
        return;
      }

      await BleClient.startNotifications(id, JBD_SERVICE, JBD_NOTIFY, handleNotification);

      if (session !== bleSession.current) {
        await teardownGatt(id);
        return;
      }

      startNoDataWatchdog();
      await requestBmsSnapshot(id);
      startPoll(id);

      const devInfo: BLEDevice =
        useBmsStore.getState().devices.find(d => d.id === id) ??
        { id, name: `BMS ${id}`, address: id, rssi: 0, connectionState: 'connected' };

      store.updateDeviceState(id, 'connected');
      store.setConnected(id);
      settings.setLastDevice(id);
      history.recordConnect(devInfo, connectionType);

    } catch (err: any) {
      if (session === bleSession.current) {
        bleSession.current++;
        connectedId.current = null;
        _stopPoll();
        _clearNoDataTimer();
        await BleClient.disconnect(id).catch(() => {});
        store.updateDeviceState(id, 'failed');
        useBmsStore.setState({ connectionStatus: 'disconnected', connectedDeviceId: null });

        const raw: string = err?.message ?? 'Connection failed';
        let msg = raw;
        if (raw.toLowerCase().includes('timeout')) {
          msg = 'Connection timed out. Power on the BMS and move closer, then retry.';
        } else if (raw.toLowerCase().includes('notification') || raw.toLowerCase().includes('subscribe')) {
          msg = 'Could not enable BMS notifications (0xFF01). Close other BLE apps and retry.';
        } else if (raw.toLowerCase().includes('gatt')) {
          msg = `GATT error: ${raw}. Power-cycle the BMS and retry.`;
        }
        store.setError(msg);
      }
    } finally {
      connectInProgress.current = false;
    }
  }, [
    handleNotification, startPoll, handlePeripheralDisconnect, teardownGatt,
    requestBmsSnapshot, startNoDataWatchdog,
  ]);

  const disconnect = useCallback(async () => {
    bleSession.current++;
    const id = connectedId.current ?? store.connectedDeviceId;
    _stopPoll();
    _clearNoDataTimer();
    connectedId.current = null;
    if (id) {
      store.updateDeviceState(id, 'disconnected');
      history.recordDisconnect(id);
      await teardownGatt(id);
    }
    store.setDisconnected();
  }, [teardownGatt]);

  const sendCommand = useCallback(async (
    action: 'chargeOn' | 'chargeOff' | 'dischargeOn' | 'dischargeOff',
  ) => {
    const id = connectedId.current;
    if (!id) { store.setError('No device connected'); return; }

    const reg = action.startsWith('charge') ? 0xE1 : 0xE2;
    const val = action.endsWith('On')       ? 0x01 : 0x00;
    const sum = (0xFF - ((0x5A + reg + 0x01 + val) & 0xFF) + 1) & 0xFF;
    const cmd = [0xDD, 0x5A, reg, 0x01, val, sum, 0x77];

    try {
      await BleClient.writeWithoutResponse(id, JBD_SERVICE, JBD_WRITE, numbersToDataView(cmd));
      const label = action.startsWith('charge') ? 'Charge' : 'Discharge';
      store.setCommandResult({
        success: true,
        message: `${label} MOS ${action.endsWith('On') ? 'enabled' : 'disabled'}`,
      });
    } catch (e: any) {
      store.setCommandResult({ success: false, message: e?.message ?? 'Command failed' });
    }
    setTimeout(() => store.setCommandResult(null), 3000);
  }, []);

  const sendConfiguration = useCallback(async (paramName: string, value: number) => {
    const id = connectedId.current;
    if (!id) { store.setError('No device connected'); return; }

    const paramMap: Record<string, { reg: number, scale: number }> = {
      'highCellVolt': { reg: 0x01, scale: 1000 },
      'lowCellVolt': { reg: 0x11, scale: 1000 },
      'highTemp': { reg: 0x12, scale: 10 },
      'lowTemp': { reg: 0x13, scale: 10 },
      'chargeCurrent': { reg: 0x14, scale: 100 },
      'dischargeCurrent': { reg: 0x15, scale: 100 },
      'nominalCapacity': { reg: 0x10, scale: 100 }
    };

    const config = paramMap[paramName];
    if (!config) {
      store.setError(`Unknown parameter: ${paramName}`);
      return;
    }

    const reg = config.reg;
    const len = 0x02; // 2 bytes of data
    let val = Math.round(value * config.scale);
    
    if (paramName.includes('Temp')) {
      val = Math.round(2731 + (value * 10));
    }

    const b0 = (val >> 8) & 0xFF;
    const b1 = val & 0xFF;
    
    const sum = reg + len + b0 + b1;
    const checksum = (0x10000 - sum) & 0xFFFF;
    const chkH = (checksum >> 8) & 0xFF;
    const chkL = checksum & 0xFF;
    
    const packet = [0xDD, 0x5A, reg, len, b0, b1, chkH, chkL, 0x77];

    let packet2: number[] | null = null;
    if (paramName === 'nominalCapacity') {
      const reg2 = 0x11;
      const sum2 = reg2 + len + b0 + b1;
      const chk2 = (0x10000 - sum2) & 0xFFFF;
      packet2 = [0xDD, 0x5A, reg2, len, b0, b1, (chk2 >> 8) & 0xFF, chk2 & 0xFF, 0x77];
    }

    const unlockPacket = [0xDD, 0x5A, 0x00, 0x02, 0x56, 0x78, 0xFF, 0x32, 0x77];

    try {
      // Unlock EEPROM
      await BleClient.writeWithoutResponse(id, JBD_SERVICE, JBD_WRITE, numbersToDataView(unlockPacket));
      await new Promise(r => setTimeout(r, 100));

      // Write Design Capacity
      await BleClient.writeWithoutResponse(id, JBD_SERVICE, JBD_WRITE, numbersToDataView(packet));
      await new Promise(r => setTimeout(r, 150));
      
      // Write Cycle Capacity if needed
      if (packet2) {
        await BleClient.writeWithoutResponse(id, JBD_SERVICE, JBD_WRITE, numbersToDataView(packet2));
        await new Promise(r => setTimeout(r, 150));
      }

      // Refresh Basic Info immediately
      await BleClient.writeWithoutResponse(id, JBD_SERVICE, JBD_WRITE, numbersToDataView(Array.from(CMD_BASIC_INFO)));
      
      store.setCommandResult({ success: true, message: `Set ${paramName} to ${value} successfully` });
    } catch (e: any) {
      store.setCommandResult({ success: false, message: e?.message ?? 'Write failed' });
    }
    setTimeout(() => store.setCommandResult(null), 3000);
  }, []);

  return { startScan, stopScan, connect, disconnect, sendCommand, sendConfiguration };
}
