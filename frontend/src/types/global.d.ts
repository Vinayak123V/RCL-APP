// Global type declarations for the app

interface Window {
  electronAPI?: {
    startScan: () => Promise<void>;
    stopScan: () => Promise<void>;
    connect: (id: string) => Promise<void>;
    disconnect: () => Promise<void>;
    chargeOn: () => Promise<{ success: boolean; message: string }>;
    chargeOff: () => Promise<{ success: boolean; message: string }>;
    dischargeOn: () => Promise<{ success: boolean; message: string }>;
    dischargeOff: () => Promise<{ success: boolean; message: string }>;
    
    // Event listeners
    onDeviceFound: (callback: (device: any) => void) => void;
    onConnected: (callback: (id: string) => void) => void;
    onDisconnected: (callback: () => void) => void;
    onData: (callback: (data: any) => void) => void;
    onError: (callback: (msg: string) => void) => void;
    
    // Remove listeners
    removeAllListeners: (channel: string) => void;
  };
}
// Web Bluetooth API types (partial)
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  connected: boolean;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  readonly properties: {
    read?: boolean;
    write?: boolean;
    writeWithoutResponse?: boolean;
    notify?: boolean;
  };
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  readValue(): Promise<DataView>;
  writeValue(data: BufferSource): Promise<void>;
  writeValueWithoutResponse?(data: BufferSource): Promise<void>;
  value?: DataView;
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
  removeEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void;
}

interface Navigator {
  bluetooth?: {
    requestDevice(options: any): Promise<BluetoothDevice>;
  };
}