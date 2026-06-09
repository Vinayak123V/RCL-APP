import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { BatteryData } from '../../../shared/types';

const router = Router();

// Store latest in memory for fast access
let latestData: BatteryData | null = null;

export function setLatestData(data: BatteryData) {
  latestData = data;
}

router.get('/latest', (_req: Request, res: Response) => {
  if (!latestData) return res.status(404).json({ error: 'No data yet' });
  res.json(latestData);
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const result = await pool.query(
      'SELECT * FROM battery_history ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/record', async (req: Request, res: Response) => {
  const data: BatteryData = req.body;
  try {
    await pool.query(
      `INSERT INTO battery_history (voltage, current, soc, temperatures, cells, status, warnings)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [data.voltage, data.current, data.soc,
       JSON.stringify(data.temperatures), JSON.stringify(data.cells),
       data.status, JSON.stringify(data.warnings)]
    );
    setLatestData(data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/config/voltage', async (req: Request, res: Response) => {
  const { voltage, packet } = req.body;
  if (voltage === undefined) {
    return res.status(400).json({ error: 'Voltage required' });
  }
  
  console.log(`\n[IOT] Value request triggered for voltage: ${voltage}V`);
  if (packet && Array.isArray(packet)) {
    const hexString = packet.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ');
    console.log(`[IOT] Received configure data packet: [${hexString}]`);
  }
  
  // Here we would typically send it to the actual IoT hardware via MQTT or serial
  // For now, we log it and confirm it was received by the IoT side
  res.json({ ok: true, message: `Voltage request ${voltage}V raised in IOT side` });
});

export default router;
