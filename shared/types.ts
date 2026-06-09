export interface BatteryData {
  voltage: number;
  current: number;
  soc: number;
  temperatures: number[];
  cells: number[];
  remainCapacity?: number;
  fullCapacity?: number;
  cycles?: number;
  chargeMos: boolean;
  dischargeMos: boolean;
  status: 'charging' | 'discharging' | 'idle';
  warnings: Warning[];
  timestamp: string;
}

export interface Warning {
  type: 'overvoltage' | 'undervoltage' | 'overtemp' | 'overcurrent';
  message: string;
}

export type DeviceConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface BLEDevice {
  id: string;
  name: string;
  address: string;
  rssi: number;
  connectionState?: DeviceConnectionState;
}

export interface CommandResult {
  success: boolean;
  message: string;
}

export interface HistoryRecord extends BatteryData {
  id: number;
}

// IPC channel names
export const IPC = {
  BLE_SCAN_START: 'ble:scan:start',
  BLE_SCAN_STOP: 'ble:scan:stop',
  BLE_DEVICES_FOUND: 'ble:devices:found',
  BLE_CONNECT: 'ble:connect',
  BLE_DISCONNECT: 'ble:disconnect',
  BLE_CONNECTED: 'ble:connected',
  BLE_DISCONNECTED: 'ble:disconnected',
  BLE_DATA: 'ble:data',
  BLE_ERROR: 'ble:error',
  CMD_CHARGE_ON: 'cmd:charge:on',
  CMD_CHARGE_OFF: 'cmd:charge:off',
  CMD_DISCHARGE_ON: 'cmd:discharge:on',
  CMD_DISCHARGE_OFF: 'cmd:discharge:off',
  CMD_RESULT: 'cmd:result',
} as const;
