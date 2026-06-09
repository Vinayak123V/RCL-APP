/**
 * deviceHistoryStore — persists previously-connected BLE devices across sessions.
 *
 * Each entry is keyed by MAC address (or device.id for Web BT where MAC is unavailable).
 * On every successful connect the entry is upserted; on disconnect the status is updated.
 */
import { create } from 'zustand';

export type ConnectionType = 'BLE' | 'QR' | 'Manual';
export type HistoryStatus  = 'connected' | 'disconnected';

export interface HistoricalDevice {
  /** Stable key — MAC address when available, otherwise Web BT opaque id */
  id: string;
  name: string;
  address: string;
  rssi: number;
  connectionType: ConnectionType;
  firstConnected: string;   // ISO timestamp
  lastConnected: string;    // ISO timestamp
  status: HistoryStatus;
  totalSessions: number;
  // Last known telemetry (optional — populated from BatteryData)
  lastVoltage?: number;
  lastSoc?: number;
  lastTemp?: number;
}

interface DeviceHistoryState {
  entries: HistoricalDevice[];

  /** Upsert on successful connect */
  recordConnect: (
    device: { id: string; name: string; address: string; rssi: number },
    connectionType: ConnectionType
  ) => void;

  /** Mark device as disconnected */
  recordDisconnect: (deviceId: string) => void;

  /** Update last-known telemetry */
  updateTelemetry: (deviceId: string, voltage: number, soc: number, temp: number) => void;

  /** Remove a single entry */
  forget: (deviceId: string) => void;

  /** Rename a device */
  renameDevice: (deviceId: string, newName: string) => void;

  /** Wipe everything */
  clearAll: () => void;

  /** Load from localStorage */
  hydrate: () => void;
}

const STORAGE_KEY = 'bms_device_history';

function load(): HistoricalDevice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoricalDevice[]) : [];
  } catch {
    return [];
  }
}

function save(entries: HistoricalDevice[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* quota exceeded — silently ignore */ }
}

export const useDeviceHistoryStore = create<DeviceHistoryState>((set, get) => ({
  entries: [],

  hydrate: () => set({ entries: load() }),

  recordConnect: (device, connectionType) => {
    const now = new Date().toISOString();
    set((s) => {
      const existing = s.entries.find((e) => e.id === device.id);
      let next: HistoricalDevice[];

      if (existing) {
        next = s.entries.map((e) =>
          e.id === device.id
            ? {
                ...e,
                name: e.name || device.name,
                rssi: device.rssi || e.rssi,
                connectionType,
                lastConnected: now,
                status: 'connected',
                totalSessions: e.totalSessions + 1,
              }
            : e
        );
      } else {
        const entry: HistoricalDevice = {
          id: device.id,
          name: device.name || 'Unknown Device',
          address: device.address,
          rssi: device.rssi,
          connectionType,
          firstConnected: now,
          lastConnected: now,
          status: 'connected',
          totalSessions: 1,
        };
        // Most-recent first
        next = [entry, ...s.entries];
      }

      save(next);
      return { entries: next };
    });
  },

  recordDisconnect: (deviceId) => {
    set((s) => {
      const next = s.entries.map((e) =>
        e.id === deviceId ? { ...e, status: 'disconnected' as HistoryStatus } : e
      );
      save(next);
      return { entries: next };
    });
  },

  updateTelemetry: (deviceId, voltage, soc, temp) => {
    set((s) => {
      const next = s.entries.map((e) =>
        e.id === deviceId
          ? { ...e, lastVoltage: voltage, lastSoc: soc, lastTemp: temp }
          : e
      );
      save(next);
      return { entries: next };
    });
  },

  forget: (deviceId) => {
    set((s) => {
      const next = s.entries.filter((e) => e.id !== deviceId);
      save(next);
      return { entries: next };
    });
  },

  renameDevice: (deviceId, newName) => {
    set((s) => {
      const next = s.entries.map((e) =>
        e.id === deviceId ? { ...e, name: newName } : e
      );
      save(next);
      return { entries: next };
    });
  },

  clearAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ entries: [] });
  },
}));
