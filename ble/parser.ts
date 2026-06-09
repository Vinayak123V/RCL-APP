import { BatteryData, Warning } from '../shared/types';

/**
 * JBD BMS Protocol Parser
 * Parses raw BLE binary packets from JBD-compatible BMS devices.
 *
 * Packet format:
 * [0xDD] [CMD] [STATUS] [LEN] [...DATA] [CHECKSUM_H] [CHECKSUM_L] [0x77]
 */

const START_BYTE = 0xdd;
const END_BYTE = 0x77;
const CMD_BASIC_INFO = 0x03;
const CMD_CELL_INFO = 0x04;

function checksum(data: Buffer, start: number, len: number): number {
  let sum = 0;
  for (let i = start; i < start + len; i++) sum += data[i];
  return (~sum + 1) & 0xffff;
}

function validatePacket(buf: Buffer): boolean {
  if (buf.length < 7) return false;
  if (buf[0] !== START_BYTE) return false;
  if (buf[buf.length - 1] !== END_BYTE) return false;
  const len = buf[3];
  if (buf.length < len + 7) return false;
  const cs = checksum(buf, 4, len);
  const csH = buf[4 + len];
  const csL = buf[5 + len];
  return cs === ((csH << 8) | csL);
}

const DATA = 4;

export function parseBasicInfo(buf: Buffer): Partial<BatteryData> {
  const voltage = buf.readUInt16BE(DATA + 0x00) / 100;
  const current = buf.readInt16BE(DATA + 0x02) / 100;

  const remainCapacity = buf.readUInt16BE(DATA + 0x04) / 100;
  const fullCapacity   = buf.readUInt16BE(DATA + 0x06) / 100;

  let soc = buf[DATA + 0x13];
  if (soc <= 0 || soc > 100) {
    if (fullCapacity > 0) soc = Math.min(100, Math.round((remainCapacity / fullCapacity) * 100));
  }

  const tempCount = Math.min(buf[DATA + 0x16], 8);
  const temperatures: number[] = [];
  for (let i = 0; i < tempCount; i++) {
    const raw = buf.readUInt16BE(DATA + 0x17 + i * 2);
    const c = (raw - 2731) / 10;
    if (c >= -40 && c <= 120) temperatures.push(c);
  }

  const mosStatus = buf[DATA + 0x14];
  const chargeMos = !!(mosStatus & 0x01);
  const dischargeMos = !!(mosStatus & 0x02);

  const warnings: Warning[] = [];
  const protection = buf.readUInt16BE(DATA + 0x10);
  if (protection & 0x0001) warnings.push({ type: 'overvoltage', message: 'Cell overvoltage' });
  if (protection & 0x0002) warnings.push({ type: 'undervoltage', message: 'Cell undervoltage' });
  if (protection & 0x0008) warnings.push({ type: 'overcurrent', message: 'Discharge overcurrent' });
  if (protection & 0x0010) warnings.push({ type: 'overtemp', message: 'Overtemperature' });

  let status: BatteryData['status'] = 'idle';
  if (current > 0.1) status = 'charging';
  else if (current < -0.1) status = 'discharging';

  return { voltage, current, soc, remainCapacity, fullCapacity, temperatures, chargeMos, dischargeMos, warnings, status };
}

export function parseCellInfo(buf: Buffer): { cells: number[] } {
  const cellCount = buf[3] / 2;
  const cells: number[] = [];
  for (let i = 0; i < cellCount; i++) {
    cells.push(buf.readUInt16BE(4 + i * 2) / 1000);
  }
  return { cells };
}

export function parsePacket(buf: Buffer): Partial<BatteryData> | null {
  if (!validatePacket(buf)) return null;
  const cmd = buf[1];
  if (cmd === CMD_BASIC_INFO) return parseBasicInfo(buf);
  if (cmd === CMD_CELL_INFO) return parseCellInfo(buf);
  return null;
}

/** Build a JBD read command packet */
export function buildReadCommand(cmd: number): Buffer {
  const buf = Buffer.alloc(7);
  buf[0] = START_BYTE;
  buf[1] = cmd;
  buf[2] = 0x00; // read
  buf[3] = 0x00; // length
  const cs = checksum(buf, 2, 2);
  buf[4] = (cs >> 8) & 0xff;
  buf[5] = cs & 0xff;
  buf[6] = END_BYTE;
  return buf;
}

/** Build a MOS control command */
export function buildMosCommand(type: 'charge' | 'discharge', enable: boolean): Buffer {
  const cmd = type === 'charge' ? 0xe1 : 0xe2;
  const val = enable ? 0x01 : 0x00;
  const buf = Buffer.alloc(8);
  buf[0] = START_BYTE;
  buf[1] = cmd;
  buf[2] = 0x00;
  buf[3] = 0x01;
  buf[4] = val;
  const cs = checksum(buf, 2, 3);
  buf[5] = (cs >> 8) & 0xff;
  buf[6] = cs & 0xff;
  buf[7] = END_BYTE;
  return buf;
}
