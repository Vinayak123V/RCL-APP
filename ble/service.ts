import { EventEmitter } from 'events';
import { BLEDevice, BatteryData } from '../shared/types';
import { parsePacket, buildReadCommand, buildMosCommand } from './parser';
import { generateMockData } from './mock';

const BMS_SERVICE_UUID = 'ff00';
const BMS_NOTIFY_CHAR_UUID = 'ff01';
const BMS_WRITE_CHAR_UUID = 'ff02';

// Load noble lazily — requires native node-gyp build, only on real BLE hardware
let noble: any = null;
function loadNoble(): any {
  if (noble) return noble;
  try {
    noble = require('@abandonware/noble');
    return noble;
  } catch {
    console.warn('[BLE] noble not available — switching to mock mode');
    process.env.BLE_MOCK = 'true';
    return null;
  }
}

function isMock(): boolean {
  return process.env.BLE_MOCK === 'true';
}

export class BLEService extends EventEmitter {
  private scanning = false;
  private peripheral: any = null;
  private writeChar: any = null;
  private notifyChar: any = null;
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private mockTick = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastDeviceId: string | null = null;
  private batteryState: Partial<BatteryData> = {};

  constructor() {
    super();
    if (!isMock()) {
      const n = loadNoble();
      if (n) this.initNoble(n);
    }
  }

  private initNoble(n: any) {
    n.on('stateChange', (state: string) => {
      if (state === 'poweredOn' && this.scanning) n.startScanning([], true);
    });
    n.on('discover', (peripheral: any) => {
      const device: BLEDevice = {
        id: peripheral.id,
        name: peripheral.advertisement.localName || 'Unknown',
        address: peripheral.address,
        rssi: peripheral.rssi,
      };
      this.emit('device', device);
    });
  }

  startScan() {
    if (isMock()) {
      setTimeout(() => {
        this.emit('device', {
          id: 'mock-bms-001',
          name: 'JBD-BMS-MOCK',
          address: 'AA:BB:CC:DD:EE:FF',
          rssi: -65,
        } as BLEDevice);
      }, 1000);
      return;
    }
    const n = loadNoble();
    if (!n) return;
    this.scanning = true;
    n.startScanning([], true);
  }

  stopScan() {
    this.scanning = false;
    if (!isMock() && noble) noble.stopScanning();
  }

  async connect(deviceId: string) {
    this.lastDeviceId = deviceId;

    if (isMock()) {
      this.emit('connected', deviceId);
      this.startMockStream();
      return;
    }

    const n = loadNoble();
    if (!n) return;

    const peripheral = n._peripherals[deviceId];
    if (!peripheral) throw new Error('Device not found');

    this.peripheral = peripheral;
    peripheral.on('disconnect', () => {
      this.emit('disconnected');
      this.scheduleReconnect();
    });

    await peripheral.connectAsync();
    const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [BMS_SERVICE_UUID],
      [BMS_NOTIFY_CHAR_UUID, BMS_WRITE_CHAR_UUID]
    );

    this.writeChar = characteristics.find((c: any) => c.uuid === BMS_WRITE_CHAR_UUID) || null;
    this.notifyChar = characteristics.find((c: any) => c.uuid === BMS_NOTIFY_CHAR_UUID) || null;

    if (this.notifyChar) {
      await this.notifyChar.subscribeAsync();
      this.notifyChar.on('data', (data: Buffer) => this.handleData(data));
    }

    this.emit('connected', deviceId);
    this.startPolling();
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.mockInterval) clearInterval(this.mockInterval);
    if (this.peripheral) this.peripheral.disconnect();
    this.peripheral = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.emit('disconnected');
  }

  async sendCommand(type: 'charge' | 'discharge', enable: boolean): Promise<boolean> {
    if (isMock()) {
      this.batteryState = {
        ...this.batteryState,
        [type === 'charge' ? 'chargeMos' : 'dischargeMos']: enable,
      };
      return true;
    }
    if (!this.writeChar) return false;
    try {
      await this.writeChar.writeAsync(buildMosCommand(type, enable), false);
      return true;
    } catch {
      return false;
    }
  }

  async sendConfiguration(paramName: string, value: number): Promise<boolean> {
    if (isMock()) return true;
    if (!this.writeChar) return false;
    
    try {
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
      if (!config) return false;

      const reg = config.reg;
      const len = 0x02;
      let val = Math.round(value * config.scale);
      if (paramName.includes('Temp')) {
        val = Math.round(2731 + (value * 10));
      }

      const b0 = (val >> 8) & 0xFF;
      const b1 = val & 0xFF;
      
      const sum = reg + len + b0 + b1;
      const checksum = (0x10000 - sum) & 0xFFFF;
      
      const cmd = Buffer.from([0xDD, 0x5A, reg, len, b0, b1, (checksum >> 8) & 0xFF, checksum & 0xFF, 0x77]);
      const unlockPacket = Buffer.from([0xDD, 0x5A, 0x00, 0x02, 0x56, 0x78, 0xFF, 0x32, 0x77]);

      // Unlock EEPROM
      await this.writeChar.writeAsync(unlockPacket, false);
      await new Promise(r => setTimeout(r, 100));

      // Write Design Capacity
      await this.writeChar.writeAsync(cmd, false);
      await new Promise(r => setTimeout(r, 150));

      // Write Cycle Capacity if nominalCapacity
      if (paramName === 'nominalCapacity') {
        const reg2 = 0x11;
        const sum2 = reg2 + len + b0 + b1;
        const chk2 = (0x10000 - sum2) & 0xFFFF;
        const cmd2 = Buffer.from([0xDD, 0x5A, reg2, len, b0, b1, (chk2 >> 8) & 0xFF, chk2 & 0xFF, 0x77]);
        await this.writeChar.writeAsync(cmd2, false);
        await new Promise(r => setTimeout(r, 150));
      }

      return true;
    } catch {
      return false;
    }
  }

  private handleData(data: Buffer) {
    const parsed = parsePacket(data);
    if (!parsed) return;
    this.batteryState = { ...this.batteryState, ...parsed };
    if (this.batteryState.voltage !== undefined && this.batteryState.cells !== undefined) {
      this.emit('data', { ...this.batteryState, timestamp: new Date().toISOString() } as BatteryData);
    }
  }

  private startPolling() {
    setInterval(async () => {
      if (!this.writeChar) return;
      await this.writeChar.writeAsync(buildReadCommand(0x03), false);
      setTimeout(async () => {
        if (this.writeChar) await this.writeChar.writeAsync(buildReadCommand(0x04), false);
      }, 200);
    }, 1000);
  }

  private startMockStream() {
    this.mockInterval = setInterval(() => {
      this.emit('data', generateMockData(this.mockTick++));
    }, 1000);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.lastDeviceId) this.connect(this.lastDeviceId).catch(() => this.scheduleReconnect());
    }, 3000);
  }
}

export const bleService = new BLEService();
