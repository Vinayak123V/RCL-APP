import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'bms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS battery_history (
      id SERIAL PRIMARY KEY,
      voltage NUMERIC(6,2),
      current NUMERIC(6,2),
      soc INTEGER,
      temperatures JSONB,
      cells JSONB,
      status VARCHAR(20),
      warnings JSONB,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
