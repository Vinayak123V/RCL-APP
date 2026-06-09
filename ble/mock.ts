import { BatteryData } from '../shared/types';

/** Generates realistic mock BMS data for development without a real device */
export function generateMockData(tick: number): BatteryData {
  const baseVoltage = 52.4;
  const voltage = parseFloat((baseVoltage + Math.sin(tick / 20) * 0.5).toFixed(2));
  const current = parseFloat((Math.sin(tick / 10) * 8).toFixed(2));
  const soc = Math.max(10, Math.min(100, 85 + Math.floor(Math.sin(tick / 50) * 10)));

  const cells = Array.from({ length: 16 }, (_, i) =>
    parseFloat((3.65 + Math.sin((tick + i * 3) / 15) * 0.02).toFixed(3))
  );

  const temperatures = [
    parseFloat((30 + Math.sin(tick / 30) * 2).toFixed(1)),
    parseFloat((32 + Math.cos(tick / 30) * 2).toFixed(1)),
  ];

  let status: BatteryData['status'] = 'idle';
  if (current > 0.5) status = 'charging';
  else if (current < -0.5) status = 'discharging';

  const warnings = voltage > 54 ? [{ type: 'overvoltage' as const, message: 'Pack overvoltage' }] : [];

  return {
    voltage,
    current,
    soc,
    temperatures,
    cells,
    chargeMos: true,
    dischargeMos: true,
    status,
    warnings,
    timestamp: new Date().toISOString(),
  };
}
