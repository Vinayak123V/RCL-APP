import { create } from 'zustand';
import { BatteryData, BLEDevice, DeviceConnectionState } from '../../../shared/types';
import { useDeviceHistoryStore } from './deviceHistoryStore';

const MAX_HISTORY = 60; // keep last 60 data points for charts

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface BmsState {
  // Connection
  devices: BLEDevice[];
  connectionStatus: ConnectionStatus;
  connectedDeviceId: string | null;
  scanning: boolean;
  error: string | null;

  // Battery data
  data: BatteryData | null;
  history: BatteryData[];

  // Command feedback
  lastCommandResult: { success: boolean; message: string } | null;

  // Actions
  setScanning: (v: boolean) => void;
  addDevice: (d: BLEDevice) => void;
  renameDevice: (id: string, newName: string) => void;
  clearDevices: () => void;
  setConnecting: (id: string) => void;
  setConnected: (id: string) => void;
  setDisconnected: () => void;
  setData: (d: BatteryData) => void;
  setError: (msg: string | null) => void;
  setCommandResult: (r: { success: boolean; message: string } | null) => void;
  
  // Per-device connection state management
  updateDeviceState: (deviceId: string, state: DeviceConnectionState) => void;
  resetAllDeviceStates: () => void;
}

export const useBmsStore = create<BmsState>((set) => ({
  devices: [],
  connectionStatus: 'disconnected',
  connectedDeviceId: null,
  scanning: false,
  error: null,
  data: null,
  history: [],
  lastCommandResult: null,

  setScanning: (v) => set({ scanning: v }),
  addDevice: (d) =>
    set((s) => {
      const historyStore = useDeviceHistoryStore.getState();
      const historicalDevice = historyStore.entries.find(e => e.id === d.id);
      const customName = historicalDevice ? historicalDevice.name : d.name;

      return {
        devices: s.devices.find((x) => x.id === d.id) 
          ? s.devices.map(dev => dev.id === d.id ? { ...dev, ...d, name: customName } : dev)
          : [...s.devices, { ...d, name: customName, connectionState: d.connectionState || 'idle' }],
      };
    }),
  renameDevice: (id, newName) => 
    set((s) => ({
      devices: s.devices.map(dev => dev.id === id ? { ...dev, name: newName } : dev)
    })),
  clearDevices: () => set({ devices: [] }),
  setConnecting: (id) => set((s) => ({ 
    connectionStatus: 'connecting', 
    connectedDeviceId: id, 
    error: null,
    devices: s.devices.map(dev => 
      dev.id === id ? { ...dev, connectionState: 'connecting' } : dev
    )
  })),
  setConnected: (id) => set((s) => ({ 
    connectionStatus: 'connected', 
    connectedDeviceId: id, 
    error: null,
    devices: s.devices.map(dev => 
      dev.id === id 
        ? { ...dev, connectionState: 'connected' }
        : dev.connectionState === 'connected' ? { ...dev, connectionState: 'disconnected' } : dev
    )
  })),
  setDisconnected: () => set((s) => ({
    connectionStatus: 'disconnected',
    connectedDeviceId: null,
    data: null,           // Clear battery data on disconnect
    history: [],          // Clear history
    lastCommandResult: null,
    devices: s.devices.map(dev => 
      dev.connectionState === 'connected' ? { ...dev, connectionState: 'disconnected' } : dev
    )
  })),
  setData: (d) =>
    set((s) => ({
      data: d,
      history: [...s.history.slice(-(MAX_HISTORY - 1)), d],
    })),
  setError: (msg) => set({ error: msg }),
  setCommandResult: (r) => set({ lastCommandResult: r }),
  
  // Per-device connection state management
  updateDeviceState: (deviceId: string, state: DeviceConnectionState) =>
    set((s) => ({
      devices: s.devices.map(dev =>
        dev.id === deviceId ? { ...dev, connectionState: state } : dev
      ),
    })),
  resetAllDeviceStates: () =>
    set((s) => ({
      devices: s.devices.map(dev => ({ ...dev, connectionState: 'idle' })),
    })),
}));

// Convenience selectors
export const useIsConnected = () => useBmsStore(s => s.connectionStatus === 'connected');
export const useIsConnecting = () => useBmsStore(s => s.connectionStatus === 'connecting');
