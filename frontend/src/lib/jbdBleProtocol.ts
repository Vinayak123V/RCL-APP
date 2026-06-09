import { BatteryData } from '../../../shared/types';

/** Write to FF02 — request basic info (JBD / GQ SPP UART tunnel) */
export const CMD_BASIC_INFO = new Uint8Array([0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77]);
/** Write to FF02 — request cell voltages */
export const CMD_CELL_VOLTAGES = new Uint8Array([0xDD, 0xA5, 0x04, 0x00, 0xFF, 0xFC, 0x77]);

export const JBD_SERVICE = '0000ff00-0000-1000-8000-00805f9b34fb';
export const JBD_NOTIFY  = '0000ff01-0000-1000-8000-00805f9b34fb';
export const JBD_WRITE   = '0000ff02-0000-1000-8000-00805f9b34fb';

const MAX_PACKET = 140;

/** First data byte in a 0x03 response (after DD, cmd, status, len). */
const DATA = 4;

/** JBD 0x03 "Basic Info" field offsets — see JBD_REGISTER_MAP.md */
const OFF = {
  VOLTAGE:    DATA + 0x00,
  CURRENT:    DATA + 0x02,
  REMAIN_CAP: DATA + 0x04,
  FULL_CAP:   DATA + 0x06,
  CYCLES:     DATA + 0x08,
  ERRORS:     DATA + 0x10,
  SOC:        DATA + 0x13,
  FET:        DATA + 0x14,
  CELL_CNT:   DATA + 0x15,
  NTC_CNT:    DATA + 0x16,
  NTC_FIRST:  DATA + 0x17,
} as const;

const KELVIN_OFFSET = 2731;

export interface JbdParsed {
  basic?: Partial<BatteryData> & { cycles?: number };
  cells?: number[];
}

/** Length byte at index 3 (status 0x00 at index 2). Also supports 16-bit BE len at 2–3. */
export function jbdResponsePayloadLen(buf: number[]): number {
  if (buf.length < 4) return -1;
  if (buf[2] === 0x00 && buf[3] > 0 && buf[3] < 64) return buf[3];
  const len16 = ((buf[2] & 0xff) << 8) | (buf[3] & 0xff);
  return len16 > 0 && len16 <= MAX_PACKET ? len16 : -1;
}

export function jbdPacketTotal(buf: number[]): number {
  const len = jbdResponsePayloadLen(buf);
  if (len < 0 || len > MAX_PACKET) return -1;
  return len + 7;
}

export function drainJbdPackets(buffer: number[]): number[][] {
  const out: number[][] = [];

  while (buffer.length >= 7) {
    if (buffer[0] === 0xff && buffer[1] === 0xaa) {
      buffer.splice(0, Math.min(5, buffer.length));
      continue;
    }

    const start = buffer.indexOf(0xdd);
    if (start === -1) {
      if (buffer.length > MAX_PACKET) buffer.length = 0;
      break;
    }
    if (start > 0) buffer.splice(0, start);

    const total = jbdPacketTotal(buffer);
    if (total < 0) {
      buffer.shift();
      continue;
    }
    if (buffer.length < total) break;

    const packet = buffer.splice(0, total);
    if (packet[total - 1] === 0x77) out.push(packet);
  }

  return out;
}

/** NTC raw → °C (JBD: 0.1 K absolute, 2731 + temp×10). */
export function jbdNtcToCelsius(raw: number): number {
  return +((raw - KELVIN_OFFSET) / 10).toFixed(1);
}

function isPlausibleTempC(t: number): boolean {
  return t >= -40 && t <= 120;
}

function isPlausibleSoc(soc: number): boolean {
  return soc >= 0 && soc <= 100;
}

export function parseJbdPacket(packet: number[]): JbdParsed | null {
  if (packet[0] !== 0xdd) return null;
  const cmd = packet[1];
  if (cmd !== 0x03 && cmd !== 0x04) return null;

  const view = new DataView(new Uint8Array(packet).buffer);
  if (cmd === 0x03) {
    const basic = parseBasicInfo(view, packet);
    return basic ? { basic } : null;
  }
  const cells = parseCellInfo(view);
  return cells ? { cells } : null;
}

function parseBasicInfo(buf: DataView, raw: number[]): (Partial<BatteryData> & { cycles?: number }) | null {
  try {
    const len = jbdResponsePayloadLen(raw);
    if (len < 23 || buf.byteLength < len + 7) return null;
    if (raw[2] === 0x80) return null;

    const voltage = buf.getUint16(OFF.VOLTAGE, false) / 100;
    const current = buf.getInt16(OFF.CURRENT, false) / 100;
    const cycles  = buf.getUint16(OFF.CYCLES, false);
    const errors  = buf.getUint16(OFF.ERRORS, false);

    const remainCapacity = buf.getUint16(OFF.REMAIN_CAP, false) / 100;
    const fullCapacity   = buf.getUint16(OFF.FULL_CAP, false) / 100;

    let soc = buf.getUint8(OFF.SOC);
    if (!isPlausibleSoc(soc)) {
      if (fullCapacity > 0) {
        soc = Math.min(100, Math.max(0, Math.round((remainCapacity / fullCapacity) * 100)));
      }
    }

    const fetStatus    = buf.getUint8(OFF.FET);
    const chargeMos    = !!(fetStatus & 0x01);
    const dischargeMos = !!(fetStatus & 0x02);

    let ntcCount = buf.getUint8(OFF.NTC_CNT);
    if (ntcCount > 8) ntcCount = 0;

    const temperatures: number[] = [];
    for (let i = 0; i < ntcCount; i++) {
      const off = OFF.NTC_FIRST + i * 2;
      if (off + 1 >= DATA + len) break;
      const rawT = buf.getUint16(off, false);
      const c    = jbdNtcToCelsius(rawT);
      if (isPlausibleTempC(c)) temperatures.push(c);
    }

    const warnings: BatteryData['warnings'] = [];
    if (errors & 0x0001) warnings.push({ type: 'overvoltage',  message: 'Cell overvoltage' });
    if (errors & 0x0002) warnings.push({ type: 'undervoltage', message: 'Cell undervoltage' });
    if (errors & 0x0004) warnings.push({ type: 'overvoltage',  message: 'Pack overvoltage' });
    if (errors & 0x0008) warnings.push({ type: 'undervoltage', message: 'Pack undervoltage' });
    if (errors & 0x0010) warnings.push({ type: 'overcurrent',  message: 'Charge overcurrent' });
    if (errors & 0x0020) warnings.push({ type: 'overcurrent',  message: 'Discharge overcurrent' });
    if (errors & 0x0040) warnings.push({ type: 'overcurrent',  message: 'Short circuit' });
    if (errors & 0x0100) warnings.push({ type: 'overtemp',     message: 'Charge overtemperature' });
    if (errors & 0x0200) warnings.push({ type: 'overtemp',     message: 'Charge undertemperature' });
    if (errors & 0x0400) warnings.push({ type: 'overtemp',     message: 'Discharge overtemperature' });
    if (errors & 0x0800) warnings.push({ type: 'overtemp',     message: 'Discharge undertemperature' });

    const status: BatteryData['status'] =
      current > 0.05 ? 'charging' : current < -0.05 ? 'discharging' : 'idle';

    return {
      voltage,
      current,
      soc,
      remainCapacity,
      fullCapacity,
      cycles,
      temperatures: temperatures.length ? temperatures : [0],
      chargeMos,
      dischargeMos,
      status,
      warnings,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function parseCellInfo(buf: DataView): number[] | null {
  try {
    if (buf.byteLength < 7) return null;
    if (buf.getUint8(0) !== 0xdd || buf.getUint8(1) !== 0x04) return null;

    const len = buf.getUint8(3) || buf.getUint16(2, false);
    const count = Math.floor(len / 2);
    const cells: number[] = [];
    for (let i = 0; i < count; i++) {
      const off = DATA + i * 2;
      if (off + 1 >= buf.byteLength - 3) break;
      cells.push(+(buf.getUint16(off, false) / 1000).toFixed(3));
    }
    return cells.length ? cells : null;
  } catch {
    return null;
  }
}

export function isMeaninglessBleChunk(chunk: number[]): boolean {
  if (chunk.length === 0) return true;
  if (chunk.includes(0xdd)) return false;
  return chunk.every(b => b === 0);
}

export function ingestJbdBytes(buffer: number[], chunk: number[]): JbdParsed[] {
  if (isMeaninglessBleChunk(chunk)) return [];
  buffer.push(...chunk);
  const results: JbdParsed[] = [];
  for (const packet of drainJbdPackets(buffer)) {
    const parsed = parseJbdPacket(packet);
    if (parsed) results.push(parsed);
  }
  return results;
}
